import { generateIntermediateWallConstraints } from '@/building/gcs/constraintGenerator'
import {
  type IntermediateWallId,
  type IntermediateWallWithGeometry,
  type InteriorWallAssemblyId,
  type PerimeterId,
  type WallId,
  type WallNodeId,
  isIntermediateWallId,
  isPerimeterWallId,
  isWallNodeId
} from '@/building/model'
import { getModelActions } from '@/building/store'
import { getConfigActions } from '@/config/store'
import { type SnapResult, SnappingService } from '@/editor/canvas/services/SnappingService'
import {
  type LengthInputPosition,
  activateLengthInput,
  deactivateLengthInput
} from '@/editor/canvas/services/length-input'
import { getViewModeActions } from '@/editor/canvas/state/viewModeStore'
import { viewportActions } from '@/editor/canvas/state/viewportStore'
import { isWallGeometryValid } from '@/editor/tools/intermediate-wall/wallValidation'
import { BaseTool } from '@/editor/tools/system/BaseTool'
import type { ToolSystem } from '@/editor/tools/system/ToolSystem'
import type { CursorStyle, EditorEvent, ToolImplementation } from '@/editor/tools/system/types'
import {
  type Length,
  type LineSegment2D,
  type Vec2,
  ZERO_VEC2,
  direction,
  eqVec2,
  lineFromSegment,
  perpendicular,
  projectVec2,
  scaleAddVec2
} from '@/shared/geometry'
import { type Polygon2D, isPointInPolygon, segmentsIntersect } from '@/shared/geometry/polygon'
import { assertUnreachable } from '@/shared/utils'

import { IntermediateWallToolInspector } from './IntermediateWallToolInspector'
import { IntermediateWallToolOverlay } from './IntermediateWallToolOverlay'

type SnapEntityId = WallId | WallNodeId

export type IntermediateWallAlignment = 'left' | 'right'

interface IntermediateWallToolState {
  points: Vec2[]
  pointer: Vec2
  snapResult?: SnapResult<SnapEntityId>
  startEntity?: SnapEntityId
  perimeterId?: PerimeterId
  isValid: boolean
  lengthOverride: Length | null
  segmentLengthOverrides: (Length | null)[]
  thickness: Length
  wallAssemblyId: InteriorWallAssemblyId
  alignment: IntermediateWallAlignment
}

const SNAP_NODE_TOLERANCE = 200

export class IntermediateWallTool extends BaseTool implements ToolImplementation {
  readonly id = 'intermediate-wall.add'
  readonly overlayComponent = IntermediateWallToolOverlay
  readonly inspectorComponent = IntermediateWallToolInspector

  public state: IntermediateWallToolState

  private snappingService = new SnappingService<SnapEntityId>({ candidates: [] })
  private validationLines: Record<SnapEntityId, LineSegment2D[]> = {}
  private validationPolygons: Record<PerimeterId, Polygon2D> = {}

  constructor(toolSystem: ToolSystem) {
    super(toolSystem)
    this.state = {
      points: [] as Vec2[],
      pointer: ZERO_VEC2,
      snapResult: undefined,
      startEntity: undefined,
      perimeterId: undefined,
      isValid: true,
      lengthOverride: null,
      segmentLengthOverrides: [] as (Length | null)[],
      thickness: 120,
      wallAssemblyId: '' as InteriorWallAssemblyId,
      alignment: 'left'
    }
  }

  public setThickness(thickness: Length): void {
    this.state.thickness = thickness
    this.triggerRender()
  }

  public setAssembly(assemblyId: InteriorWallAssemblyId): void {
    this.state.wallAssemblyId = assemblyId
    this.triggerRender()
  }

  public setAlignment(alignment: IntermediateWallAlignment): void {
    this.state.alignment = alignment
    this.triggerRender()
  }

  handlePointerDown(event: EditorEvent): boolean {
    this.state.pointer = event.worldCoordinates
    this.state.snapResult = this.findSnap(event.worldCoordinates)
    const snapCoords = this.state.snapResult?.position ?? event.worldCoordinates
    const snapEntity = this.state.snapResult?.meta !== 'origin' ? this.state.snapResult?.meta : undefined

    if (!this.state.isValid) return true

    if (this.state.points.length === 0 && snapEntity) {
      this.state.startEntity = snapEntity
    }

    let pointToAdd = snapCoords
    if (this.state.lengthOverride && this.state.points.length > 0) {
      const lastPoint = this.state.points[this.state.points.length - 1]
      const dir = direction(lastPoint, snapCoords)
      pointToAdd = scaleAddVec2(lastPoint, dir, this.state.lengthOverride)
    }

    if (this.state.points.length > 0) {
      this.state.segmentLengthOverrides.push(this.state.lengthOverride)
    }

    this.addPoint(pointToAdd)

    if (this.state.points.length === 1) {
      const perimeterId = this.findPerimeterContainingPoint(pointToAdd)
      if (perimeterId) {
        this.validationPolygons = { [perimeterId]: this.validationPolygons[perimeterId] }
        this.state.perimeterId = perimeterId
      } else {
        // Unreachable since validation prevents user from placing first point outside of perimeter
        throw new Error('Failed to find perimeter for intermediate wall start point')
      }
    }

    this.clearLengthOverride()
    this.state.isValid = this.checkValidation()

    if (this.state.points.length >= 1) {
      this.activateLengthInputForNextSegment()
    }

    if (snapEntity && this.state.points.length >= 2) {
      this.complete(snapEntity)
    }

    return true
  }

  private addPoint(pointToAdd: Vec2) {
    this.state.points.push(pointToAdd)

    this.snappingService.referencePoint = pointToAdd
    this.snappingService.addSnapCandidate({
      type: 'point',
      position: pointToAdd,
      mode: 'align'
    })

    if (this.state.points.length === 1) {
      this.snappingService.addSnapCandidate({
        type: 'point',
        position: pointToAdd,
        mode: 'snap',
        priority: 1
      })
    }

    if (this.state.points.length > 1) {
      const lastPoint = this.state.points[this.state.points.length - 2]
      const dir = direction(lastPoint, pointToAdd)
      this.snappingService.addSnapCandidate({
        type: 'line',
        line: { point: lastPoint, direction: dir }
      })
      this.snappingService.addSnapCandidate({
        type: 'line',
        line: { point: pointToAdd, direction: perpendicular(dir) }
      })
    }
  }

  handlePointerMove(event: EditorEvent): boolean {
    this.state.pointer = event.worldCoordinates
    this.state.snapResult = this.findSnap(event.worldCoordinates)
    this.state.isValid = this.checkValidation()
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

    if (event.key === 'Enter' && this.state.points.length >= 2) {
      this.complete()
      return true
    }

    return false
  }

  onActivate(): void {
    getViewModeActions().ensureMode('walls')
    this.state.wallAssemblyId = getConfigActions().getDefaultInteriorWallAssemblyId()
    this.setupContext()
  }

  onDeactivate(): void {
    this.resetDrawingState()
    this.resetContext()
  }

  protected resetContext(): void {
    this.snappingService = new SnappingService<SnapEntityId>({ candidates: [] })
    this.validationLines = {}
    this.validationPolygons = {}
  }

  protected setupContext(): void {
    const modelActions = getModelActions()
    const storeyId = modelActions.getActiveStoreyId()
    const perimeters = modelActions.getPerimetersByStorey(storeyId)

    for (const perimeter of perimeters) {
      this.validationPolygons[perimeter.id] = perimeter.outerPolygon

      const perimeterWalls = modelActions.getPerimeterWallsById(perimeter.id)
      for (const wall of perimeterWalls) {
        const halfThickness = wall.thickness / 2
        this.snappingService.addSnapCandidate({
          type: 'segment',
          segment: wall.insideLine,
          minDistance: halfThickness,
          meta: wall.id,
          priority: 1
        })
        this.validationLines[wall.id] = [wall.insideLine]
      }

      const intermediateWalls = modelActions.getIntermediateWallsByPerimeter(perimeter.id)
      for (const wall of intermediateWalls) {
        const halfThickness = wall.thickness / 2
        this.snappingService.addSnapCandidate({
          type: 'segment',
          segment: wall.leftLine,
          minDistance: halfThickness,
          meta: wall.id,
          priority: 1
        })
        this.snappingService.addSnapCandidate({
          type: 'segment',
          segment: wall.rightLine,
          minDistance: halfThickness,
          meta: wall.id,
          priority: 1
        })
        this.snappingService.addSnapCandidate({
          type: 'line',
          line: lineFromSegment(wall.leftLine),
          minDistance: halfThickness,
          priority: -1
        })
        this.snappingService.addSnapCandidate({
          type: 'line',
          line: lineFromSegment(wall.rightLine),
          minDistance: halfThickness,
          priority: -1
        })
        this.validationLines[wall.id] = [wall.leftLine, wall.rightLine]
      }

      const wallNodes = modelActions.getWallNodesByPerimeter(perimeter.id)
      for (const node of wallNodes) {
        this.snappingService.addSnapCandidate({
          type: 'point',
          position: node.center,
          mode: 'snap',
          meta: node.id,
          priority: 2,
          minDistance: SNAP_NODE_TOLERANCE
        })
      }
    }
  }

  protected onPolylineCompleted(points: Vec2[], snapEntity?: SnapEntityId): void {
    if (points.length < 2) return

    const modelActions = getModelActions()

    const perimeterId = this.state.perimeterId
    if (!perimeterId) {
      // Unreachable since this is set on first point
      throw new Error('No perimeter found for intermediate wall')
    }

    const sameIntermediateWallId =
      this.state.startEntity &&
      snapEntity &&
      this.state.startEntity === snapEntity &&
      isIntermediateWallId(this.state.startEntity)
        ? this.state.startEntity
        : undefined

    let nodes: { id: WallNodeId }[]
    if (sameIntermediateWallId) {
      const startNode = this.getOrCreateEntityNode(points[0], sameIntermediateWallId)
      const endNode = eqVec2(points[0], points[points.length - 1])
        ? startNode
        : this.getOrCreateNodeOnReplacementWall(points[points.length - 1], startNode.id)

      nodes = points.map((point, index) => {
        if (index === 0) return startNode
        if (index === points.length - 1) return endNode
        return modelActions.addInnerWallNode(perimeterId, point)
      })
    } else {
      nodes = points.map((point, index) => {
        if (index === 0 && this.state.startEntity) {
          return this.getOrCreateEntityNode(point, this.state.startEntity)
        }

        if (index === points.length - 1 && snapEntity) {
          return this.getOrCreateEntityNode(point, snapEntity)
        }

        return modelActions.addInnerWallNode(perimeterId, point)
      })
    }

    const createdWalls: IntermediateWallWithGeometry[] = []
    const lengthOverrides = new Map<IntermediateWallId, Length | null>()
    for (let index = 0; index < points.length - 1; index++) {
      const startNode = nodes[index]
      const endNode = nodes[index + 1]

      const wall = modelActions.addIntermediateWall(
        perimeterId,
        { nodeId: startNode.id, axis: this.state.alignment },
        { nodeId: endNode.id, axis: this.state.alignment },
        this.state.thickness,
        this.state.wallAssemblyId
      )
      createdWalls.push(wall)
      lengthOverrides.set(wall.id, this.state.segmentLengthOverrides[index] ?? null)
    }

    const allIntermediateWalls = modelActions.getIntermediateWallsByPerimeter(perimeterId)
    const finalCreatedWalls = createdWalls.map(
      createdWall => allIntermediateWalls.find(wall => wall.id === createdWall.id) ?? createdWall
    )
    const constraints = generateIntermediateWallConstraints(
      finalCreatedWalls,
      allIntermediateWalls,
      modelActions.getPerimeterWallsById(perimeterId),
      modelActions.getWallNodesByPerimeter(perimeterId),
      this.state.alignment,
      lengthOverrides,
      modelActions.getAllBuildingConstraints()
    )
    for (const constraint of constraints) {
      try {
        modelActions.addBuildingConstraint(constraint)
      } catch (error) {
        console.warn('Failed to add intermediate wall constraint', constraint, error)
      }
    }
  }

  private findPerimeterContainingPoint(point: Vec2): PerimeterId | null {
    const perimeterPolygons = Object.entries(this.validationPolygons) as [PerimeterId, Polygon2D][]
    return perimeterPolygons.find(([_, polygon]) => isPointInPolygon(point, polygon))?.[0] ?? null
  }

  private getOrCreateEntityNode(point: Vec2, entityId: SnapEntityId): { id: WallNodeId } {
    if (isWallNodeId(entityId)) {
      return { id: entityId }
    }

    const modelActions = getModelActions()

    if (isPerimeterWallId(entityId)) {
      const wall = modelActions.getPerimeterWallById(entityId)
      const offset = projectVec2(wall.insideLine.start, point, direction(wall.insideLine.start, wall.insideLine.end))
      return modelActions.addPerimeterWallNode(wall.perimeterId, wall.id, offset)
    }

    if (isIntermediateWallId(entityId)) {
      return { id: modelActions.splitIntermediateWallAtPoint(entityId, point) }
    }

    assertUnreachable(entityId, 'invalid entity id for node creation')
  }

  private getOrCreateNodeOnReplacementWall(point: Vec2, splitNodeId: WallNodeId): { id: WallNodeId } {
    const modelActions = getModelActions()
    const splitNode = modelActions.getWallNodeById(splitNodeId)
    const replacementWall = splitNode.connectedWallIds
      .map(wallId => modelActions.getIntermediateWallById(wallId))
      .find(wall => {
        const position = projectVec2(wall.entityReferenceLine.start, point, wall.direction)
        return position > 0 && position < wall.wallLength
      })

    if (!replacementWall) {
      throw new Error('Could not find replacement wall for intermediate wall endpoint')
    }

    return { id: modelActions.splitIntermediateWallAtPoint(replacementWall.id, point) }
  }

  getCursor(): CursorStyle {
    return 'crosshair'
  }

  public cancel(): void {
    this.resetDrawingState()
    this.resetContext()
    this.setupContext()
    deactivateLengthInput()
    this.triggerRender()
  }

  public complete(snapEntity?: SnapEntityId): void {
    const points = [...this.state.points]

    try {
      this.onPolylineCompleted(points, snapEntity)
    } catch (error) {
      console.error('Failed to create polyline:', error)
    }

    this.resetDrawingState()
    deactivateLengthInput()
    this.triggerRender()
  }

  public getPreviewPosition(): Vec2 {
    const currentPos = this.state.snapResult?.position ?? this.state.pointer

    if (!this.state.lengthOverride || this.state.points.length === 0) {
      return currentPos
    }

    const lastPoint = this.state.points[this.state.points.length - 1]
    const dir = direction(lastPoint, currentPos)
    return scaleAddVec2(lastPoint, dir, this.state.lengthOverride)
  }

  private findSnap(target: Vec2): SnapResult<SnapEntityId> | undefined {
    return this.snappingService.findSnapResult(target) ?? undefined
  }

  private resolveEntityToWallIds(entityId: SnapEntityId | undefined): Set<WallId> {
    if (!entityId) return new Set()
    if (isWallNodeId(entityId)) {
      const node = getModelActions().getWallNodeById(entityId)
      const wallIds = new Set<WallId>(node.connectedWallIds)
      if (node.type === 'perimeter') {
        wallIds.add(node.wallId)
      }
      return wallIds
    }
    return new Set<WallId>([entityId])
  }

  private checkValidation(): boolean {
    const isInsideValidationPolygons = Object.values(this.validationPolygons).some(polygon =>
      isPointInPolygon(this.state.pointer, polygon)
    )
    if (!isInsideValidationPolygons) {
      return false
    }

    if (this.state.points.length > 0) {
      const lastPoint = this.state.points[this.state.points.length - 1]
      const currentPos = this.state.snapResult?.position ?? this.state.pointer
      const snapMeta = this.state.snapResult?.meta
      const snapEntityId = snapMeta !== 'origin' ? snapMeta : undefined
      const snapWallIds = this.resolveEntityToWallIds(snapEntityId)
      const startWallIds = this.resolveEntityToWallIds(this.state.startEntity)
      const segmentToValidate = { start: lastPoint, end: currentPos }
      const excludedWallIds = new Set<string>(snapWallIds)
      if (this.state.points.length === 1) {
        for (const wallId of startWallIds) excludedWallIds.add(wallId)
      }

      const perimeterId = this.findPerimeterContainingPoint(this.state.pointer)
      if (!perimeterId) return false

      const existingLines = Object.entries(this.validationLines).flatMap(([wallId, lines]) =>
        lines.map(line => ({ wallId, line }))
      )
      const validationInput = {
        points: [segmentToValidate.start, segmentToValidate.end],
        segments: [segmentToValidate],
        excludedWallIds: [...excludedWallIds]
      }
      const validationContext = {
        polygon: this.validationPolygons[perimeterId],
        lines: existingLines
      }
      if (!isWallGeometryValid(validationInput, validationContext)) {
        return false
      }

      const previousSegments = this.state.points.slice(0, -1)
      for (let i = 0; i < previousSegments.length - 1; i++) {
        const segStart = previousSegments[i]
        const segEnd = previousSegments[i + 1]
        if (segmentsIntersect(segmentToValidate.start, segmentToValidate.end, segStart, segEnd)) {
          return false
        }
      }
    }

    return true
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
      onCommit: (length: Length) => {
        this.setLengthOverride(length)
      },
      onCancel: () => {
        this.clearLengthOverride()
      }
    })
  }

  private getLengthInputPosition(): LengthInputPosition {
    const { worldToStage } = viewportActions()

    if (this.state.points.length === 0) {
      return { x: 400, y: 300 }
    }

    const lastPoint = this.state.points[this.state.points.length - 1]
    const stageCoords = worldToStage(lastPoint)

    return {
      x: stageCoords[0] + 20,
      y: stageCoords[1] - 30
    }
  }

  private resetDrawingState(): void {
    this.state.points = []
    this.state.snapResult = undefined
    this.state.startEntity = undefined
    this.state.perimeterId = undefined
    this.state.isValid = true
    this.state.lengthOverride = null
    this.state.segmentLengthOverrides = []
    this.resetContext()
    this.setupContext()
  }
}
