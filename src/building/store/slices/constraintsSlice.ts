import type { StateCreator } from 'zustand'

import type { Constraint, ConstraintInput } from '@/building/model'
import type { ConstraintEntityId, ConstraintId } from '@/building/model/ids'
import { createConstraintId } from '@/building/model/ids'
import { buildingConstraintKey, getReferencedCornerIds, getReferencedWallIds } from '@/editor/gcs/constraintTranslator'

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
  getAllBuildingConstraints: () => Record<ConstraintId, Constraint>
}

export type ConstraintsSlice = ConstraintsState & { actions: ConstraintsActions }

/**
 * Extract all ConstraintEntityIds referenced by a constraint input.
 */
function getReferencedEntityIds(input: ConstraintInput): ConstraintEntityId[] {
  return [...getReferencedCornerIds(input), ...getReferencedWallIds(input)]
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
      const key = buildingConstraintKey(input)
      const id = createConstraintId(key)
      const constraint: Constraint = { ...input, id } as Constraint

      set(state => {
        // If a constraint with this ID already exists, remove its old reverse-index entries
        if (id in state.buildingConstraints) {
          const { id: _existingId, ...existingInput } = state.buildingConstraints[id]
          removeFromReverseIndex(
            state._constraintsByEntity,
            id,
            getReferencedEntityIds(existingInput as ConstraintInput)
          )
        }

        // Add the new constraint
        state.buildingConstraints[id] = constraint

        // Update reverse index
        const entityIds = getReferencedEntityIds(input)
        addToReverseIndex(state._constraintsByEntity, id, entityIds)
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
      return get().buildingConstraints
    }
  }
})
