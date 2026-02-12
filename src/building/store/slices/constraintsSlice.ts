import type { StateCreator } from 'zustand'

import type { Constraint, ConstraintInput } from '@/building/model'
import type { ConstraintEntityId, ConstraintId, PerimeterCornerId, PerimeterWallId, WallId } from '@/building/model/ids'
import { createConstraintId } from '@/building/model/ids'
import {
  buildingConstraintKey,
  getReferencedCornerIds,
  getReferencedWallEntityIds,
  getReferencedWallIds
} from '@/editor/gcs/constraintTranslator'
import type { Length } from '@/shared/geometry'

export interface ConstraintsState {
  buildingConstraints: Record<ConstraintId, Constraint>
  /** Reverse index: entity (corner/wall) → constraint IDs referencing it. */
  _constraintsByEntity: Partial<Record<ConstraintEntityId, ConstraintId[]>>
}

export interface ConstraintsActions {
  addBuildingConstraint: (input: ConstraintInput) => ConstraintId
  removeBuildingConstraint: (id: ConstraintId) => void
  removeConstraintsReferencingEntity: (entityId: ConstraintEntityId) => void
  getBuildingConstraintById: (id: ConstraintId) => Constraint | null
  getAllBuildingConstraints: () => Constraint[]
  getConstraintsForEntity: (entityId: ConstraintEntityId) => Constraint[]
}

export type ConstraintsSlice = ConstraintsState & { actions: ConstraintsActions }

/**
 * Extract all ConstraintEntityIds referenced by a constraint input.
 */
function getReferencedEntityIds(input: ConstraintInput): ConstraintEntityId[] {
  return [...getReferencedCornerIds(input), ...getReferencedWallIds(input), ...getReferencedWallEntityIds(input)]
}

/**
 * Add entries to the reverse index for a constraint.
 */
function addToReverseIndex(
  index: Partial<Record<ConstraintEntityId, ConstraintId[]>>,
  constraintId: ConstraintId,
  entityIds: ConstraintEntityId[]
): void {
  for (const entityId of entityIds) {
    const list = index[entityId]
    if (list) {
      if (!list.includes(constraintId)) {
        list.push(constraintId)
      }
    } else {
      index[entityId] = [constraintId]
    }
  }
}

/**
 * Remove entries from the reverse index for a constraint.
 */
function removeFromReverseIndex(
  index: Partial<Record<ConstraintEntityId, ConstraintId[]>>,
  constraintId: ConstraintId,
  entityIds: ConstraintEntityId[]
): void {
  for (const entityId of entityIds) {
    const list = index[entityId]
    if (!list) continue
    const idx = list.indexOf(constraintId)
    if (idx !== -1) {
      list.splice(idx, 1)
    }
    if (list.length === 0) {
      delete index[entityId]
    }
  }
}

/**
 * Remove a single constraint from state and the reverse index.
 * Operates on the immer draft.
 */
function removeConstraintDraft(state: ConstraintsState, constraintId: ConstraintId): void {
  if (!(constraintId in state.buildingConstraints)) return
  const existing = state.buildingConstraints[constraintId]
  // Strip id to get a ConstraintInput for entity ID extraction
  const { id: _id, ...input } = existing
  removeFromReverseIndex(state._constraintsByEntity, constraintId, getReferencedEntityIds(input as ConstraintInput))
  delete state.buildingConstraints[constraintId]
}

/**
 * Remove all constraints referencing a given entity from the draft state.
 * Exported so the perimeter slice can call it during cleanup.
 */
export function removeConstraintsForEntityDraft(state: ConstraintsState, entityId: ConstraintEntityId): void {
  const constraintIds = state._constraintsByEntity[entityId]
  if (!constraintIds || constraintIds.length === 0) return
  // Copy array since removeConstraintDraft mutates the list
  const ids = [...constraintIds]
  for (const constraintId of ids) {
    removeConstraintDraft(state, constraintId)
  }
}

/**
 * Add a building constraint to the draft state (upsert by key).
 * Exported so the perimeter slice can call it during topology changes.
 */
export function addBuildingConstraintDraft(state: ConstraintsState, input: ConstraintInput): ConstraintId {
  const key = buildingConstraintKey(input)
  const id = createConstraintId(key)
  const constraint: Constraint = { ...input, id } as Constraint

  // If a constraint with this ID already exists, remove its old reverse-index entries
  if (id in state.buildingConstraints) {
    const { id: _existingId, ...existingInput } = state.buildingConstraints[id]
    removeFromReverseIndex(state._constraintsByEntity, id, getReferencedEntityIds(existingInput as ConstraintInput))
  }

  // Add the new constraint
  state.buildingConstraints[id] = constraint

  // Update reverse index
  const entityIds = getReferencedEntityIds(input)
  addToReverseIndex(state._constraintsByEntity, id, entityIds)

  return id
}

// ---------------------------------------------------------------------------
// Wall-split constraint transfer
// ---------------------------------------------------------------------------

export interface WallSplitConstraintParams {
  originalWallId: PerimeterWallId
  newWallId: PerimeterWallId
  newCornerId: PerimeterCornerId
  /** Reference-side length of the first wall half (A→C). */
  newWall1Length: Length
  /** Reference-side length of the second wall half (C→B). */
  newWall2Length: Length
}

/**
 * Transfer / duplicate constraints after a wall split.
 *
 * When wall W (A→B) is split at C into W₁(A→C) and W₂(C→B):
 *
 * - **WallLength**(W, side, length): removed and replaced with
 *   wallLength(W₁, side, length₁) and wallLength(W₂, side, length₂).
 * - **HorizontalWall/VerticalWall**(W): removed and replaced with
 *   H/V(W₁) and H/V(W₂).
 * - **Parallel**(W, other, distance?): duplicated to W₂ without the distance
 *   parameter. Original keeps its distance if it had one.
 * - **ColinearCorner**(newCornerId): added to keep C on the original line.
 * - Corner constraints (perpendicularCorner, cornerAngle, colinearCorner)
 *   are not affected by wall splits since they reference corners, not walls.
 *
 * Operates on Immer draft state. Must be called *after* `updatePerimeterGeometry`.
 */
export function handleWallSplitConstraintsDraft(state: ConstraintsState, params: WallSplitConstraintParams): void {
  const { originalWallId, newWallId, newCornerId, newWall1Length, newWall2Length } = params

  // Snapshot the constraint IDs referencing the original wall before we mutate
  const wallConstraintIds = [...(state._constraintsByEntity[originalWallId] ?? [])]

  for (const constraintId of wallConstraintIds) {
    const constraint = state.buildingConstraints[constraintId]

    if (constraint.type === 'wallLength') {
      // Remove old wallLength(W) and add wallLength(W₁) + wallLength(W₂)
      const side = constraint.side
      removeConstraintDraft(state, constraintId)
      addBuildingConstraintDraft(state, {
        type: 'wallLength',
        wall: originalWallId,
        side,
        length: newWall1Length
      })
      addBuildingConstraintDraft(state, {
        type: 'wallLength',
        wall: newWallId,
        side,
        length: newWall2Length
      })
    } else if (constraint.type === 'horizontalWall' || constraint.type === 'verticalWall') {
      // Split H/V into two: one for each half
      const hvType = constraint.type
      removeConstraintDraft(state, constraintId)
      addBuildingConstraintDraft(state, {
        type: hvType,
        wall: originalWallId
      })
      addBuildingConstraintDraft(state, {
        type: hvType,
        wall: newWallId
      })
    } else if (constraint.type === 'parallel') {
      const otherWallId = constraint.wallA === originalWallId ? constraint.wallB : constraint.wallA
      // Duplicate to newWall without distance
      addBuildingConstraintDraft(state, {
        type: 'parallel',
        wallA: newWallId,
        wallB: otherWallId
      })
      // Original keeps its distance parameter if it had one — no change needed.
    }
  }

  // --- Add colinear constraint at the split point ---
  addBuildingConstraintDraft(state, {
    type: 'colinearCorner',
    corner: newCornerId
  })
}

// ---------------------------------------------------------------------------
// Wall-merge constraint capture & apply
// ---------------------------------------------------------------------------

/**
 * Captured constraint data from walls about to be removed during a merge.
 * This is a plain (non-draft) object created *before* `cleanUpOrphaned` runs.
 */
export interface CapturedMergeConstraints {
  /** WallLength constraints from the removed walls. */
  wallLengthEntries: { side: 'left' | 'right'; length: Length }[]
  /** Horizontal/vertical constraint types from the removed walls. */
  hvTypes: ('horizontalWall' | 'verticalWall')[]
  /** Parallel constraints referencing removed walls, remapped to use the merged wall. */
  parallelInputs: { otherWallId: WallId; distance?: Length }[]
}

export interface CaptureConstraintsParams {
  removedWallIds: PerimeterWallId[]
  removedCornerIds: PerimeterCornerId[]
}

/**
 * Capture constraint information from walls and corners that are about to be removed.
 *
 * This is a **readonly** operation — it does not mutate state. Call it *before*
 * `cleanUpOrphaned` deletes the entities and their constraints.
 */
export function captureConstraintsForMerge(
  state: ConstraintsState,
  params: CaptureConstraintsParams
): CapturedMergeConstraints {
  const { removedWallIds, removedCornerIds } = params
  const removedWallSet = new Set<string>(removedWallIds)

  const wallLengthEntries: CapturedMergeConstraints['wallLengthEntries'] = []
  const hvTypes: CapturedMergeConstraints['hvTypes'] = []
  const parallelInputs: CapturedMergeConstraints['parallelInputs'] = []

  // Collect all unique constraint IDs referencing any removed entity
  const seenConstraintIds = new Set<ConstraintId>()
  for (const entityId of [...removedWallIds, ...removedCornerIds]) {
    const ids = state._constraintsByEntity[entityId]
    if (ids) {
      for (const id of ids) seenConstraintIds.add(id)
    }
  }

  for (const constraintId of seenConstraintIds) {
    const constraint = state.buildingConstraints[constraintId]

    if (constraint.type === 'wallLength') {
      // Only capture if the wall is one of the removed walls
      if (removedWallSet.has(constraint.wall)) {
        wallLengthEntries.push({ side: constraint.side, length: constraint.length })
      }
    } else if (constraint.type === 'horizontalWall' || constraint.type === 'verticalWall') {
      if (removedWallSet.has(constraint.wall)) {
        hvTypes.push(constraint.type)
      }
    } else if (constraint.type === 'parallel') {
      const aRemoved = removedWallSet.has(constraint.wallA)
      const bRemoved = removedWallSet.has(constraint.wallB)
      if (aRemoved && bRemoved) continue
      if (!aRemoved && !bRemoved) continue
      const otherWallId = aRemoved ? constraint.wallB : constraint.wallA
      parallelInputs.push({ otherWallId, distance: constraint.distance })
    }
    // Corner-based constraints (colinearCorner, perpendicularCorner, cornerAngle)
    // are simply dropped — they don't transfer across merges.
  }

  return { wallLengthEntries, hvTypes, parallelInputs }
}

export interface ApplyMergedConstraintsParams {
  mergedWallId: PerimeterWallId
  removedWallIds: PerimeterWallId[]
  isColinear: boolean
  preferredConstraintSide: 'left' | 'right'
  mergedInsideLength: Length
  mergedOutsideLength: Length
}

/**
 * Apply captured constraints to the merged wall.
 *
 * Must be called *after* `updatePerimeterGeometry` so that the merged wall's
 * geometry is available for length values.
 *
 * If the merge is not colinear (the removed corner was not 180°), all
 * captured constraints are dropped — matching the behaviour for wall entities.
 */
export function applyMergedConstraintsDraft(
  state: ConstraintsState,
  captured: CapturedMergeConstraints,
  params: ApplyMergedConstraintsParams
): void {
  if (!params.isColinear) return

  const { mergedWallId, preferredConstraintSide, mergedInsideLength, mergedOutsideLength } = params
  const removedWallSet = new Set<string>(params.removedWallIds)

  // --- WallLength ---
  if (captured.wallLengthEntries.length > 0) {
    // Determine side: if all same → use that; mixed → use preferred
    const sides = new Set(captured.wallLengthEntries.map(e => e.side))
    const resolvedSide: 'left' | 'right' = sides.size === 1 ? [...sides][0] : preferredConstraintSide
    const mergedLength = resolvedSide === 'right' ? mergedInsideLength : mergedOutsideLength

    addBuildingConstraintDraft(state, {
      type: 'wallLength',
      wall: mergedWallId,
      side: resolvedSide,
      length: mergedLength
    })
  }

  // --- H/V constraints ---
  if (captured.hvTypes.length > 0) {
    // All must be the same type to transfer
    const types = new Set(captured.hvTypes)
    if (types.size === 1) {
      const hvType = [...types][0]
      addBuildingConstraintDraft(state, {
        type: hvType,
        wall: mergedWallId
      })
    }
    // Mixed horizontalWall/verticalWall → drop
  }

  // --- Parallel constraints ---
  for (const entry of captured.parallelInputs) {
    if (removedWallSet.has(entry.otherWallId)) continue
    if ((entry.otherWallId as string) === (mergedWallId as string)) continue
    addBuildingConstraintDraft(state, {
      type: 'parallel',
      wallA: mergedWallId,
      wallB: entry.otherWallId,
      distance: entry.distance
    })
  }
}

export const createConstraintsSlice: StateCreator<
  ConstraintsSlice,
  [['zustand/immer', never]],
  [],
  ConstraintsSlice
> = (set, get) => ({
  buildingConstraints: {},
  _constraintsByEntity: {},

  actions: {
    addBuildingConstraint: (input: ConstraintInput) => {
      let id!: ConstraintId
      set(state => {
        id = addBuildingConstraintDraft(state, input)
      })
      return id
    },

    removeBuildingConstraint: (id: ConstraintId) => {
      set(state => {
        removeConstraintDraft(state, id)
      })
    },

    removeConstraintsReferencingEntity: (entityId: ConstraintEntityId) => {
      set(state => {
        removeConstraintsForEntityDraft(state, entityId)
      })
    },

    getBuildingConstraintById: (id: ConstraintId) => {
      return get().buildingConstraints[id] ?? null
    },

    getAllBuildingConstraints: () => {
      return Object.values(get().buildingConstraints)
    },

    getConstraintsForEntity: (entityId: ConstraintEntityId) => {
      const state = get()
      const ids = state._constraintsByEntity[entityId]
      if (!ids || ids.length === 0) return []
      return ids.map(id => state.buildingConstraints[id])
    }
  }
})
