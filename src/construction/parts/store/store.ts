import { create } from 'zustand'

import type { PerimeterId, RoofId, StoreyId, WallId } from '@/building/model/ids'
import type { ConstructionElementId } from '@/construction/elements'
import type { MaterialId } from '@/construction/materials/material'
import type { PartId } from '@/construction/parts/types'
import { ensureConstructionLoaded, getConstructionModel } from '@/construction/store'
import { useConstructionStore } from '@/construction/store/store'
import type { Vec3 } from '@/shared/geometry'

import type { LocationFilter, PartDefinition, PartOccurrence, PartsStore, PartsStoreState } from './types'

const indexToLabel = (index: number): string => {
  const alphabetLength = 26
  let current = index
  let label = ''

  do {
    const remainder = current % alphabetLength
    label = String.fromCharCode(65 + remainder) + label
    current = Math.floor(current / alphabetLength) - 1
  } while (current >= 0)

  return label
}

const getMaterialGroupId = (materialId: string): string => `material:${materialId}`

interface ElementContext {
  storeyId?: StoreyId
  perimeterId?: PerimeterId
  wallId?: WallId
  roofId?: RoofId
  assemblyId?: string
}

export const usePartsStore = create<PartsStore>()((set, get) => ({
  definitions: {},
  occurrences: [],
  labels: {},
  usedLabelsByGroup: {},
  nextLabelIndexByGroup: {},
  hasParts: false,
  generatedAt: 0,

  actions: {
    rebuildParts(): void {
      set(state => ({ ...state, hasParts: false }))

      ensureConstructionLoaded()
      const model = getConstructionModel()

      const definitions: PartsStoreState['definitions'] = {}
      const occurrences: PartOccurrence[] = []
      const currentState = get()

      const processElement = (element: { children?: unknown[]; [key: string]: unknown }, context: ElementContext) => {
        if ('children' in element && element.children) {
          const newContext = { ...context }
          for (const child of element.children as (typeof element)[]) {
            processElement(child, newContext)
          }
          return
        }

        const partInfo = element.partInfo as { id?: PartId; type?: string; [key: string]: unknown } | undefined
        const partId = partInfo?.id
        if (!partId) return

        const material = element.material as MaterialId
        const elementId = element.id as ConstructionElementId

        if (!(partId in definitions)) {
          definitions[partId] = createPartDefinition(element, partId)
          assignLabelToState(currentState, partId, getMaterialGroupId(material))
        }

        occurrences.push({
          elementId,
          partId,
          storeyId: context.storeyId,
          perimeterId: context.perimeterId,
          wallId: context.wallId,
          roofId: context.roofId,
          assemblyId: context.assemblyId
        })
      }

      for (const element of model.elements) {
        processElement(element as (typeof model.elements)[number] & Record<string, unknown>, {})
      }

      set(state => ({
        ...state,
        definitions,
        occurrences,
        hasParts: true,
        generatedAt: Date.now()
      }))
    },

    resetLabels(groupId?: string): void {
      set(state => {
        const newLabels: Record<PartId, string> = {} as Record<PartId, string>
        const newUsedLabelsByGroup: Record<string, string[]> = {}
        const newNextLabelIndexByGroup: Record<string, number> = {}

        if (groupId) {
          for (const [gId, labels] of Object.entries(state.usedLabelsByGroup)) {
            if (gId !== groupId) {
              newUsedLabelsByGroup[gId] = labels
              newNextLabelIndexByGroup[gId] = state.nextLabelIndexByGroup[gId] ?? 0
            }
          }
          for (const [partId, label] of Object.entries(state.labels)) {
            const typedPartId = partId as PartId
            if (typedPartId in state.definitions) {
              const definition = state.definitions[typedPartId]
              const materialGroupId = getMaterialGroupId(definition.materialId)
              if (materialGroupId !== groupId) {
                newLabels[typedPartId] = label
              }
            }
          }
        }

        for (const [partId, definition] of Object.entries(state.definitions)) {
          const materialGroupId = getMaterialGroupId(definition.materialId)
          if (groupId && materialGroupId !== groupId) continue

          const typedPartId = partId as PartId
          const nextIndex = newNextLabelIndexByGroup[materialGroupId] ?? 0
          const label = indexToLabel(nextIndex)

          newLabels[typedPartId] = label
          newNextLabelIndexByGroup[materialGroupId] = nextIndex + 1

          newUsedLabelsByGroup[materialGroupId] ??= []
          newUsedLabelsByGroup[materialGroupId].push(label)
        }

        return {
          ...state,
          labels: newLabels,
          usedLabelsByGroup: newUsedLabelsByGroup,
          nextLabelIndexByGroup: newNextLabelIndexByGroup
        }
      })
    },

    getFilteredOccurrences(filter: LocationFilter): PartOccurrence[] {
      const { occurrences } = get()
      return occurrences.filter(occ => {
        if (filter.storeyId && occ.storeyId !== filter.storeyId) return false
        if (filter.perimeterId && occ.perimeterId !== filter.perimeterId) return false
        if (filter.wallId && occ.wallId !== filter.wallId) return false
        if (filter.roofId && occ.roofId !== filter.roofId) return false
        return true
      })
    }
  }
}))

function createPartDefinition(element: Record<string, unknown>, partId: PartId): PartDefinition {
  const bounds = element.bounds as { size?: [number, number, number] } | undefined
  const size = (bounds?.size ?? [0, 0, 0]) as unknown as Vec3
  const partInfo = element.partInfo as Record<string, unknown> | undefined

  return {
    partId,
    size,
    volume: size[0] * size[1] * size[2],
    area: undefined,
    crossSection: undefined,
    thickness: undefined,
    sideFaces: partInfo?.sideFaces as PartDefinition['sideFaces'],
    requiresSinglePiece: partInfo?.requiresSinglePiece as boolean | undefined,
    materialId: element.material as MaterialId,
    type: (partInfo?.type as string | undefined) ?? 'unknown',
    subtype: partInfo?.subtype as string | undefined,
    description: partInfo?.description as PartDefinition['description'],
    strawCategory: undefined,
    issue: undefined
  }
}

function assignLabelToState(state: PartsStoreState, partId: PartId, groupId: string): void {
  if (partId in state.labels) return

  const nextIndex = state.nextLabelIndexByGroup[groupId] ?? 0
  const label = indexToLabel(nextIndex)

  state.labels[partId] = label
  state.nextLabelIndexByGroup[groupId] = nextIndex + 1

  state.usedLabelsByGroup[groupId] ??= []
  state.usedLabelsByGroup[groupId].push(label)
}

export function getPartsActions() {
  return usePartsStore.getState().actions
}

let subscribed = false
export function setupPartsSubscriptions() {
  if (subscribed) return
  subscribed = true

  let previousGeneratedAt = useConstructionStore.getState().generatedAt
  useConstructionStore.subscribe(state => {
    if (state.generatedAt !== previousGeneratedAt && state.generatedAt > 0) {
      previousGeneratedAt = state.generatedAt
      usePartsStore.getState().actions.rebuildParts()
    }
  })
}

export function ensurePartsLoaded() {
  const state = usePartsStore.getState()
  if (!state.hasParts) {
    state.actions.rebuildParts()
  }
  setupPartsSubscriptions()
}
