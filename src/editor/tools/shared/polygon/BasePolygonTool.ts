import { vec2 } from 'gl-matrix'

import { viewportActions } from '@/editor/hooks/useViewportStore'
import { activateLengthInput, deactivateLengthInput } from '@/editor/services/length-input'
import type { LengthInputPosition } from '@/editor/services/length-input'
import { SnappingService } from '@/editor/services/snapping'
import type { SnapResult, SnappingContext } from '@/editor/services/snapping/types'
import { BaseTool } from '@/editor/tools/system/BaseTool'
import type { CanvasEvent, CursorStyle } from '@/editor/tools/system/types'
import type { Length, LineSegment2D, Polygon2D } from '@/shared/geometry'
import { direction, wouldClosingPolygonSelfIntersect, wouldPolygonSelfIntersect } from '@/shared/geometry'

export interface PolygonToolStateBase {
  points: vec2[]
  pointer: vec2
  snapResult?: SnapResult
  snapContext: SnappingContext
  isCurrentSegmentValid: boolean
  isClosingSegmentValid: boolean
  lengthOverride: Length | null
}

/**
 * Base class for polygon-creation tools. Handles pointer interaction, snapping,
 * validation, and length overrides. Concrete tools provide completion logic and
 * can augment the snapping context with domain-specific geometry.
 */
export abstract class BasePolygonTool<TState extends PolygonToolStateBase> extends BaseTool {
  public state: TState

  private readonly snappingService: SnappingService

  protected constructor(initialState: Omit<TState, keyof PolygonToolStateBase>) {
    super()
    this.state = {
      points: [] as vec2[],
      pointer: vec2.fromValues(0, 0),
      snapResult: undefined,
      isCurrentSegmentValid: true,
      isClosingSegmentValid: true,
      lengthOverride: null,
      snapContext: this.extendSnapContext(this.createBaseSnapContext([])),
      ...initialState
    } as TState
    this.snappingService = new SnappingService()
  }

  handlePointerDown(event: CanvasEvent): boolean {
    const stageCoords = event.stageCoordinates
    this.state.pointer = stageCoords
    this.state.snapResult = this.findSnap(stageCoords)
    const snapCoords = this.state.snapResult?.position ?? stageCoords

    if (this.state.points.length >= this.getMinimumPointCount()) {
      if (this.isSnappingToFirstPoint()) {
        if (this.state.isClosingSegmentValid) {
          this.complete()
        }
        return true
      }
    }

    if (this.state.isCurrentSegmentValid) {
      let pointToAdd = snapCoords
      if (this.state.lengthOverride && this.state.points.length > 0) {
        const lastPoint = this.state.points[this.state.points.length - 1]
        const dir = direction(lastPoint, snapCoords)
        pointToAdd = vec2.scaleAndAdd(vec2.create(), lastPoint, dir, this.state.lengthOverride)
      }

      this.state.points.push(pointToAdd)
      this.updateSnapContext()
      this.clearLengthOverride()
      this.updateValidation()

      if (this.state.points.length >= 1) {
        this.activateLengthInputForNextSegment()
      }
    }

    return true
  }

  handlePointerMove(event: CanvasEvent): boolean {
    const stageCoords = event.stageCoordinates
    this.state.pointer = stageCoords
    this.state.snapResult = this.findSnap(stageCoords)

    this.updateValidation()
    this.triggerRender()
    return true
  }

  handleKeyDown(event: KeyboardEvent): boolean {
    if (event.key === 'Escape') {
      if (this.state.lengthOverride) {
        this.clearLengthOverride()
        return true
      }
      if (this.state.points.length > 0) {
        this.cancel()
        return true
      }
      return false
    }

    if (event.key === 'Enter' && this.state.points.length >= this.getMinimumPointCount()) {
      this.complete()
      return true
    }

    return false
  }

  onActivate(): void {
    this.resetDrawingState()
    this.onToolActivated()
    this.updateSnapContext()
  }

  onDeactivate(): void {
    this.resetDrawingState()
    this.onToolDeactivated()
    deactivateLengthInput()
  }

  getCursor(): CursorStyle {
    return 'crosshair'
  }

  public cancel(): void {
    this.resetDrawingState()
    this.onPolygonCancelled()
    deactivateLengthInput()
  }

  public complete(): void {
    if (this.state.points.length < this.getMinimumPointCount()) return
    if (!this.state.isClosingSegmentValid) return

    const polygon = this.buildPolygon([...this.state.points])

    try {
      this.onPolygonCompleted(polygon)
    } catch (error) {
      this.onPolygonCompletionFailed(error)
    }

    this.resetDrawingState()
    deactivateLengthInput()
  }

  /**
   * Position used for overlay preview and ghost point rendering.
   */
  public getPreviewPosition(): vec2 {
    const currentPos = this.state.snapResult?.position ?? this.state.pointer

    if (!this.state.lengthOverride || this.state.points.length === 0) {
      return currentPos
    }

    const lastPoint = this.state.points[this.state.points.length - 1]
    const dir = direction(lastPoint, currentPos)
    return vec2.scaleAndAdd(vec2.create(), lastPoint, dir, this.state.lengthOverride)
  }

  /**
   * Allows subclasses to trigger a re-computation of the snapping context when
   * external geometry changes.
   */
  protected updateSnapContext(): void {
    const context = this.createBaseSnapContext(this.state.points)
    this.state.snapContext = this.extendSnapContext(context)
    this.triggerRender()
  }

  protected createBaseSnapContext(points: readonly vec2[]): SnappingContext {
    const referenceLineSegments: LineSegment2D[] = []
    for (let i = 1; i < points.length; i += 1) {
      referenceLineSegments.push({ start: points[i - 1], end: points[i] })
    }

    const snapPoints = points.length > 0 ? [points[0]] : []
    const referencePoint = points.length > 0 ? points[points.length - 1] : undefined

    return {
      snapPoints,
      alignPoints: [...points],
      referencePoint,
      referenceLineSegments
    }
  }

  protected extendSnapContext(context: SnappingContext): SnappingContext {
    return context
  }

  public getMinimumPointCount(): number {
    return 3
  }

  protected getSnapToFirstPointDistanceSquared(): number {
    const distance = 5 // millimetres
    return distance * distance
  }

  protected buildPolygon(points: vec2[]): Polygon2D {
    return { points }
  }

  protected onPolygonCancelled(): void {
    // Optional hook for subclasses
  }

  protected onPolygonCompletionFailed(error: unknown): void {
    console.error('Failed to create polygon:', error)
  }

  protected onToolActivated(): void {
    // Optional hook for subclasses
  }

  protected onToolDeactivated(): void {
    // Optional hook for subclasses
  }

  protected abstract onPolygonCompleted(polygon: Polygon2D): void

  private findSnap(target: vec2): SnapResult | undefined {
    const result = this.snappingService.findSnapResult(target, this.state.snapContext)
    return result ?? undefined
  }

  public isSnappingToFirstPoint(): boolean {
    if (this.state.points.length === 0 || !this.state.snapResult?.position) {
      return false
    }
    const firstPoint = this.state.points[0]
    const snapPos = this.state.snapResult.position
    return vec2.squaredDistance(firstPoint, snapPos) < this.getSnapToFirstPointDistanceSquared()
  }

  private updateValidation(): void {
    if (this.state.points.length === 0) {
      this.state.isCurrentSegmentValid = true
      this.state.isClosingSegmentValid = true
      return
    }

    const currentPos = this.state.snapResult?.position ?? this.state.pointer
    const isSnapToFirstPoint = this.isSnappingToFirstPoint()

    if (isSnapToFirstPoint) {
      this.state.isCurrentSegmentValid =
        this.state.points.length >= this.getMinimumPointCount()
          ? !wouldClosingPolygonSelfIntersect({ points: this.state.points })
          : true
    } else {
      this.state.isCurrentSegmentValid = !wouldPolygonSelfIntersect(this.state.points, currentPos)
    }

    if (this.state.points.length >= this.getMinimumPointCount()) {
      this.state.isClosingSegmentValid = !wouldClosingPolygonSelfIntersect({ points: this.state.points })
    } else {
      this.state.isClosingSegmentValid = true
    }
  }

  public setLengthOverride(length: Length | null): void {
    this.state.lengthOverride = length
    this.triggerRender()
  }

  public clearLengthOverride(): void {
    this.state.lengthOverride = null
    this.triggerRender()
  }

  private activateLengthInputForNextSegment(): void {
    if (this.state.points.length === 0) return

    activateLengthInput({
      position: this.getLengthInputPosition(),
      placeholder: this.getLengthInputPlaceholder(),
      onCommit: length => {
        this.setLengthOverride(length)
      },
      onCancel: () => {
        this.clearLengthOverride()
      }
    })
  }

  private getLengthInputPlaceholder(): string {
    return 'Enter length...'
  }

  private getLengthInputPosition(): LengthInputPosition {
    const { worldToStage } = viewportActions()

    if (this.state.points.length === 0) {
      return { x: 400, y: 300 }
    }

    const lastPoint = this.state.points[this.state.points.length - 1]
    const stageCoords = worldToStage(lastPoint)

    return {
      x: stageCoords.x + 20,
      y: stageCoords.y - 30
    }
  }

  private resetDrawingState(): void {
    this.state.points = []
    this.state.pointer = vec2.fromValues(0, 0)
    this.state.snapResult = undefined
    this.state.isCurrentSegmentValid = true
    this.state.isClosingSegmentValid = true
    this.state.lengthOverride = null
    this.updateSnapContext()
  }
}
