import {
  Algorithm,
  type Constraint,
  type GcsWrapper,
  type SketchLine,
  type SketchPoint,
  type SketchPrimitive,
  SolveStatus
} from '@salusoft89/planegcs'

import type { PerimeterCornerId, PerimeterId, PerimeterWallId } from '@/building/model'
import { getModelActions } from '@/building/store'
import { nodeRefSidePointId, wallRefLineId } from '@/editor/gcs/constraintTranslator'
import { createGcs } from '@/editor/gcs/gcsInstance'
import { getGcsActions, getGcsState } from '@/editor/gcs/store'
import { validateSolution } from '@/editor/gcs/validator'
import { type Vec2, midpoint, newVec2 } from '@/shared/geometry'

const DRAG_TEMP_POINT_ID = 'drag_wall_temp_point'

// --- Helper functions for merging colinear H/V constraints ---

interface CornerAdjacencyInfo {
  prevWall?: string
  nextWall?: string
}

interface ColinearChain {
  walls: string[] // Wall IDs in the chain (in order)
  startCornerId: string // Outermost start corner of chain
  endCornerId: string // Outermost end corner of chain
  constraintType: 'horizontal' | 'vertical' // Type of H/V constraints on all walls
}

function buildCornerAdjacencyMap(lines: SketchLine[]): Map<string, CornerAdjacencyInfo> {
  const map = new Map<string, CornerAdjacencyInfo>()

  for (const line of lines) {
    const start = map.get(line.p1_id) ?? {}
    map.set(line.p1_id, { ...start, nextWall: line.id })
    const end = map.get(line.p2_id) ?? {}
    map.set(line.p2_id, { ...end, prevWall: line.id })
  }

  return map
}

function findColinearChains(
  constraints: Record<string, Constraint>,
  wallMap: Map<string, SketchLine>,
  cornerAdjacencyMap: Map<string, CornerAdjacencyInfo>
): ColinearChain[] {
  const chains = new Map<string, ColinearChain>()
  const wallsWithHV = new Set<string>()
  const wallToConstraintType: Map<string, 'horizontal' | 'vertical'> = new Map<string, 'horizontal' | 'vertical'>()
  const colinearConstraints = new Set<string>()

  for (const [, constraint] of Object.entries(constraints)) {
    if (constraint.type === 'horizontal_l') {
      wallsWithHV.add(constraint.l_id)
      wallToConstraintType.set(constraint.l_id, 'horizontal')
    } else if (constraint.type === 'vertical_l') {
      wallsWithHV.add(constraint.l_id)
      wallToConstraintType.set(constraint.l_id, 'vertical')
    } else if (constraint.type === 'point_on_line_ppp') {
      const pointIds = [constraint.p_id, constraint.lp1_id, constraint.lp2_id].sort()
      colinearConstraints.add(pointIds.join('|'))
    }
  }

  for (const wallId of wallsWithHV) {
    const wallLine = wallMap.get(wallId)
    if (!wallLine) continue

    const prevWall = cornerAdjacencyMap.get(wallLine.p1_id)?.prevWall
    if (
      !prevWall ||
      !wallsWithHV.has(prevWall) ||
      wallToConstraintType.get(wallId) !== wallToConstraintType.get(prevWall)
    )
      continue

    const prevWallLine = wallMap.get(prevWall)
    if (!prevWallLine) continue
    const colinearPointIds = [prevWallLine.p1_id, wallLine.p1_id, wallLine.p2_id].sort()
    if (!colinearConstraints.has(colinearPointIds.join('|'))) continue

    const prevCorner = prevWallLine.p1_id
    const prevPrevWall = cornerAdjacencyMap.get(prevCorner)?.prevWall
    if (!prevPrevWall) continue

    const existingChainAfter = chains.get(wallId)
    const existingChainBefore = chains.get(prevPrevWall)

    let chain: ColinearChain
    if (existingChainBefore) {
      const walls = existingChainAfter
        ? [...existingChainBefore.walls, ...existingChainAfter.walls]
        : [...existingChainBefore.walls, wallId]

      chain = {
        walls,
        startCornerId: existingChainBefore.startCornerId,
        endCornerId: existingChainAfter?.endCornerId ?? wallLine.p2_id,
        constraintType: wallToConstraintType.get(wallId) ?? 'horizontal'
      }
    } else {
      const walls = existingChainAfter ? [prevWall, ...existingChainAfter.walls] : [prevWall, wallId]
      chain = {
        walls,
        startCornerId: prevCorner,
        endCornerId: existingChainAfter?.endCornerId ?? wallLine.p2_id,
        constraintType: wallToConstraintType.get(wallId) ?? 'horizontal'
      }
    }
    chains.set(chain.walls[0], chain)
  }

  return Array.from(chains.values())
}

function transformAdjacentHVConstraints(
  constraints: Record<string, Constraint>,
  lines: SketchLine[]
): Record<string, Constraint> {
  const cornerAdjacencyMap = buildCornerAdjacencyMap(lines)
  const wallMap = new Map(lines.map(l => [l.id, l]))
  const chains = findColinearChains(constraints, wallMap, cornerAdjacencyMap)

  const result = { ...constraints }
  const removedConstraintIds = new Set<string>()

  for (const chain of chains) {
    const mergedConstraintId = `merged_${chain.constraintType}_chain_${chain.walls.join('_')}`

    for (const wallId of chain.walls) {
      const constraint = Object.values(constraints).find(
        c => (c.type === 'horizontal_l' || c.type === 'vertical_l') && c.l_id === wallId
      )
      if (constraint) {
        removedConstraintIds.add(constraint.id)
      }
    }

    const gcsType = chain.constraintType === 'horizontal' ? 'horizontal_pp' : 'vertical_pp'
    result[mergedConstraintId] = {
      id: mergedConstraintId,
      type: gcsType,
      p1_id: chain.startCornerId,
      p2_id: chain.endCornerId,
      driving: true
    }
  }

  for (const id of removedConstraintIds) {
    delete result[id]
  }

  return result
}

interface DragState {
  pointId: string
  constraintXId: string
  constraintYId: string
  paramXPos: number
  paramYPos: number
}

class GcsService {
  private solveTimeout: NodeJS.Timeout | undefined

  constructor() {
    this.triggerSolve()
  }

  triggerSolve() {
    if (this.solveTimeout) {
      clearTimeout(this.solveTimeout)
    }
    this.solveTimeout = setTimeout(() => {
      const { updatePerimeterBoundary } = getModelActions()
      const gcs = this.getGcs()
      if (gcs.solve()) {
        for (const perimeterId of Object.keys(getGcsState().perimeterRegistry) as PerimeterId[]) {
          updatePerimeterBoundary(perimeterId, gcs.getPerimeterBoundary(perimeterId))
        }
      }
      gcs.syncConstraintStatus()
      this.solveTimeout = undefined
    }, 100)
  }

  getGcs(fixedNodeIds?: PerimeterCornerId[]): WrappedGcs {
    const gcsState = getGcsState()
    const modelActions = getModelActions()

    const fixedPointIds = (fixedNodeIds ?? []).map(id => nodeRefSidePointId(id))
    const points = Object.values(gcsState.points)
    const fixedPoints = points.map(p => (fixedPointIds.includes(p.id) ? { ...p, fixed: true } : p))

    const constraints = transformAdjacentHVConstraints(gcsState.constraints, gcsState.lines)
    const primitives: SketchPrimitive[] = [...gcsState.lines, ...Object.values(constraints)]

    const cornerOrderMap = new Map<PerimeterId, PerimeterCornerId[]>()
    for (const perimeterId of Object.keys(gcsState.perimeterRegistry) as PerimeterId[]) {
      const perimeter = modelActions.getPerimeterById(perimeterId)
      cornerOrderMap.set(perimeterId, [...perimeter.cornerIds])
    }

    return new WrappedGcs(createGcs(), fixedPoints, primitives, cornerOrderMap, gcsState.lines, constraints)
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
  private constraints: Record<string, Constraint>

  constructor(
    gcs: GcsWrapper,
    points: SketchPoint[],
    primitives: SketchPrimitive[],
    cornerOrderMap: Map<PerimeterId, PerimeterCornerId[]>,
    lines: SketchLine[],
    constraints: Record<string, Constraint>
  ) {
    this.gcs = gcs
    this.points = points
    this.primitives = primitives
    this.cornerOrderMap = cornerOrderMap
    this.lines = lines
    this.constraints = constraints
    this.resetGcs()
  }

  // --- Domain-aware public API ---

  /**
   * Start dragging a perimeter corner.
   * Resolves the corner to its reference-side GCS point internally.
   * Returns the current position of the drag point.
   */
  startCornerDrag(cornerId: PerimeterCornerId): Vec2 {
    const pointId = nodeRefSidePointId(cornerId)
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
  startWallDrag(wallId: PerimeterWallId): Vec2 {
    const lineId = wallRefLineId(wallId)
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

  public solve() {
    const solveStatus = this.gcs.solve(Algorithm.DogLeg)
    if (solveStatus !== SolveStatus.Success) {
      console.warn(`Solving GCS failed: ${solveStatus}`)
    }
    return solveStatus === SolveStatus.Success && this.applySolution()
  }

  syncConstraintStatus(): void {
    const conflictingIds = this.gcs.get_gcs_conflicting_constraints()
    const redundantIds = this.gcs.get_gcs_redundant_constraints()

    getGcsActions().setConstraintStatus(conflictingIds, redundantIds)
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
  getPerimeterBoundary(perimeterId: PerimeterId): Vec2[] {
    const cornerIds = this.cornerOrderMap.get(perimeterId)
    if (!cornerIds) {
      throw new Error(`Perimeter "${perimeterId}" not found in corner order map`)
    }
    return cornerIds.map(cornerId => {
      const pointId = nodeRefSidePointId(cornerId)
      const pos = this.findPointPosition(pointId)
      return newVec2(pos.x, pos.y)
    })
  }

  /**
   * Get the solved position of a single corner on its reference side.
   */
  getCornerPosition(cornerId: PerimeterCornerId): Vec2 {
    const pointId = nodeRefSidePointId(cornerId)
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
              y: newPoint.y
            }
          : point
      })

    const newPoints = updatePoints(this.points)
    const newTempPoints = updatePoints(this.tempPoints)

    const pointsMap = Object.fromEntries(newPoints.map(p => [p.id, p]))
    const validation = validateSolution(pointsMap, this.cornerOrderMap, this.constraints)

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
