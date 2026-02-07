import {
  Algorithm,
  type GcsWrapper,
  type SketchLine,
  type SketchPoint,
  type SketchPrimitive,
  SolveStatus
} from '@salusoft89/planegcs'

import type { PerimeterCornerId, PerimeterId, PerimeterReferenceSide, PerimeterWallId } from '@/building/model'
import { getModelActions } from '@/building/store'
import { createGcs } from '@/editor/gcs/gcsInstance'
import { getGcsState } from '@/editor/gcs/store'
import { validateSolution } from '@/editor/gcs/validator'
import { type Vec2, midpoint, newVec2 } from '@/shared/geometry'

const DRAG_TEMP_POINT_ID = 'drag_wall_temp_point'

interface DragState {
  pointId: string
  constraintXId: string
  constraintYId: string
  paramXPos: number
  paramYPos: number
}

class GcsService {
  getGcs(): WrappedGcs {
    const gcsState = getGcsState()
    const modelActions = getModelActions()

    const points = Object.values(gcsState.points)
    const primitives: SketchPrimitive[] = [...gcsState.lines, ...Object.values(gcsState.constraints)]

    const cornerOrderMap = new Map<PerimeterId, PerimeterCornerId[]>()
    for (const perimeterId of Object.keys(gcsState.perimeterRegistry) as PerimeterId[]) {
      const perimeter = modelActions.getPerimeterById(perimeterId)
      cornerOrderMap.set(perimeterId, [...perimeter.cornerIds])
    }

    return new WrappedGcs(createGcs(), points, primitives, cornerOrderMap, gcsState.lines)
  }
}

/** Module-level singleton instance */
export const gcsService = new GcsService()

export class WrappedGcs {
  private gcs: GcsWrapper
  private primitives: SketchPrimitive[]
  private dragState: DragState | null = null
  private points: SketchPoint[]
  private tempPoints: SketchPoint[] = []
  private tempPrimitives: SketchPrimitive[] = []
  private cornerOrderMap: Map<PerimeterId, PerimeterCornerId[]>
  private lines: SketchLine[]

  constructor(
    gcs: GcsWrapper,
    points: SketchPoint[],
    primitives: SketchPrimitive[],
    cornerOrderMap: Map<PerimeterId, PerimeterCornerId[]>,
    lines: SketchLine[]
  ) {
    this.gcs = gcs
    this.points = points
    this.primitives = primitives
    this.cornerOrderMap = cornerOrderMap
    this.lines = lines
    this.resetGcs()
  }

  // --- Domain-aware public API ---

  /**
   * Start dragging a perimeter corner.
   * Resolves the corner to its reference-side GCS point internally.
   * Returns the current position of the drag point.
   */
  startCornerDrag(cornerId: PerimeterCornerId, referenceSide: PerimeterReferenceSide): Vec2 {
    const pointId = cornerPointId(cornerId, referenceSide)
    const pos = this.findPointPosition(pointId)
    this.startDrag(pointId, pos.x, pos.y)
    return newVec2(pos.x, pos.y)
  }

  /**
   * Start dragging a perimeter wall.
   * Creates a temporary point at the wall midpoint constrained to the wall's inside line,
   * then starts dragging it.
   * Returns the current position of the drag point (the wall midpoint).
   */
  startWallDrag(wallId: PerimeterWallId, referenceSide: PerimeterReferenceSide): Vec2 {
    const lineId = wallLineId(wallId, referenceSide)
    const line = this.lines.find(l => l.id === lineId)
    if (!line) {
      throw new Error(`GCS line "${lineId}" not found for wall "${wallId}"`)
    }

    const p1 = this.findPointPosition(line.p1_id)
    const p2 = this.findPointPosition(line.p2_id)
    const wallMid = midpoint(newVec2(p1.x, p1.y), newVec2(p2.x, p2.y))

    this.addTemporaryPrimitives(
      [{ id: DRAG_TEMP_POINT_ID, type: 'point', x: wallMid[0], y: wallMid[1], fixed: false }],
      [
        {
          id: `${DRAG_TEMP_POINT_ID}_on_line`,
          type: 'point_on_line_pl',
          p_id: DRAG_TEMP_POINT_ID,
          l_id: lineId
        }
      ]
    )

    this.startDrag(DRAG_TEMP_POINT_ID, wallMid[0], wallMid[1])
    return wallMid
  }

  /**
   * Update the current drag to a new mouse position.
   */
  updateDrag(mouseX: number, mouseY: number): void {
    if (!this.dragState) return

    const { paramXPos, paramYPos } = this.dragState
    const gcs = this.gcs

    gcs.gcs.set_p_param(paramXPos, mouseX, true)
    gcs.gcs.set_p_param(paramYPos, mouseY, true)

    if (gcs.solve(Algorithm.DogLeg) === SolveStatus.Success) {
      if (!this.applySolution()) {
        this.installDragConstraints(this.dragState.pointId, mouseX, mouseY)
      }
    }
  }

  /**
   * End the current drag operation.
   */
  endDrag(): void {
    this.dragState = null
    this.tempPoints = []
    this.tempPrimitives = []
    this.resetGcs()
  }

  /**
   * Get the solved perimeter boundary (reference-side corner positions in order).
   */
  getPerimeterBoundary(perimeterId: PerimeterId, referenceSide: PerimeterReferenceSide): Vec2[] {
    const cornerIds = this.cornerOrderMap.get(perimeterId)
    if (!cornerIds) {
      throw new Error(`Perimeter "${perimeterId}" not found in corner order map`)
    }
    return cornerIds.map(cornerId => {
      const pointId = cornerPointId(cornerId, referenceSide)
      const pos = this.findPointPosition(pointId)
      return newVec2(pos.x, pos.y)
    })
  }

  /**
   * Get the solved position of a single corner on its reference side.
   */
  getCornerPosition(cornerId: PerimeterCornerId, referenceSide: PerimeterReferenceSide): Vec2 {
    const pointId = cornerPointId(cornerId, referenceSide)
    const pos = this.findPointPosition(pointId)
    return newVec2(pos.x, pos.y)
  }

  /**
   * Get the current solved position of the drag point.
   * For corner drags this is the corner itself; for wall drags this is the temp midpoint.
   */
  getDragPointPosition(): Vec2 {
    if (!this.dragState) {
      throw new Error('No active drag')
    }
    const pos = this.findPointPosition(this.dragState.pointId)
    return newVec2(pos.x, pos.y)
  }

  // --- Private implementation ---

  private findPointPosition(pointId: string): { x: number; y: number } {
    const point = this.points.find(p => p.id === pointId) ?? this.tempPoints.find(p => p.id === pointId)
    if (!point) {
      throw new Error(`GCS point "${pointId}" not found`)
    }
    return { x: point.x, y: point.y }
  }

  private resetGcs(): void {
    this.gcs.clear_data()
    this.gcs.push_primitives_and_params([...this.points, ...this.tempPoints])
    this.gcs.push_primitives_and_params([...this.primitives, ...this.tempPrimitives])
  }

  private addTemporaryPrimitives(points: SketchPoint[], primitives: SketchPrimitive[]): void {
    this.tempPoints = points
    this.tempPrimitives = primitives
    this.resetGcs()
  }

  private installDragConstraints(pointId: string, mouseX: number, mouseY: number): void {
    const constraintXId = `drag_${pointId}_x_${Date.now()}`
    const constraintYId = `drag_${pointId}_y_${Date.now()}`

    this.gcs.push_primitive({
      type: 'equal',
      id: constraintXId,
      param1: { o_id: pointId, prop: 'x' },
      param2: mouseX,
      temporary: true,
      driving: true
    })

    this.gcs.push_primitive({
      type: 'equal',
      id: constraintYId,
      param1: { o_id: pointId, prop: 'y' },
      param2: mouseY,
      temporary: true,
      driving: true
    })

    const paramXPos = this.gcs.p_param_index.get(constraintXId) ?? -1
    const paramYPos = this.gcs.p_param_index.get(constraintYId) ?? -1

    this.dragState = { pointId, constraintXId, constraintYId, paramXPos, paramYPos }
  }

  private startDrag(pointId: string, mouseX: number, mouseY: number): void {
    this.resetGcs()
    this.installDragConstraints(pointId, mouseX, mouseY)
  }

  private applySolution(): boolean {
    this.gcs.apply_solution()

    const primitives = this.gcs.sketch_index.get_primitives()

    const updatePoints = (points: SketchPoint[]) =>
      points.map(point => {
        const newPoint = primitives.find(p => p.id === point.id) as SketchPoint | undefined
        return newPoint != null
          ? {
              ...point,
              x: newPoint.x,
              y: newPoint.y,
              fixed: newPoint.fixed
            }
          : point
      })

    const newPoints = updatePoints(this.points)
    const newTempPoints = updatePoints(this.tempPoints)

    const pointsMap = Object.fromEntries([...newPoints, ...newTempPoints].map(p => [p.id, p]))
    const validation = validateSolution(pointsMap, this.cornerOrderMap)

    if (validation.valid) {
      this.points = newPoints
      this.tempPoints = newTempPoints
      return true
    }

    console.warn(validation)

    this.resetGcs()
    return false
  }
}

// --- Internal ID helpers ---

function cornerPointId(cornerId: PerimeterCornerId, referenceSide: PerimeterReferenceSide): string {
  const suffix = referenceSide === 'inside' ? 'in' : 'out'
  return `corner_${cornerId}_${suffix}`
}

function wallLineId(wallId: PerimeterWallId, referenceSide: PerimeterReferenceSide): string {
  const suffix = referenceSide === 'inside' ? 'in' : 'out'
  return `wall_${wallId}_${suffix}`
}
