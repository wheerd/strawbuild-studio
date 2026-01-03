import { useTranslation } from 'react-i18next'

import { useStoreyName } from '@/building/hooks/useStoreyName'
import {
  type FloorAssemblyId,
  type OpeningAssemblyId,
  type RingBeamAssemblyId,
  type RoofAssemblyId,
  type StoreyId,
  type WallAssemblyId,
  isFloorAssemblyId,
  isOpeningAssemblyId,
  isRingBeamAssemblyId,
  isRoofAssemblyId,
  isStoreyId,
  isWallAssemblyId
} from '@/building/model/ids'
import { useStoreyById } from '@/building/store'
import {
  useFloorAssemblyById,
  useOpeningAssemblyById,
  useRingBeamAssemblyById,
  useRoofAssemblyById,
  useWallAssemblyById
} from '@/construction/config'
import { type MaterialId, isMaterialId } from '@/construction/materials/material'
import { useMaterialById } from '@/construction/materials/store'

export type EntityId =
  | StoreyId
  | RingBeamAssemblyId
  | WallAssemblyId
  | FloorAssemblyId
  | RoofAssemblyId
  | OpeningAssemblyId
  | MaterialId

/**
 * Hook that returns a function to get display labels for any entity ID.
 * Handles storeys, assemblies, and materials.
 * Returns the entity name, or translated "Unknown" if not found.
 */
export function useEntityLabel(id: EntityId | undefined): string {
  const { t } = useTranslation('config')

  if (!id) return t($ => $.usage.unknown)

  if (isStoreyId(id)) {
    const storey = useStoreyById(id)
    const storeyName = useStoreyName(storey)
    return t($ => $.usage.usedInStorey, { label: storeyName })
  }

  if (isRingBeamAssemblyId(id)) {
    const assembly = useRingBeamAssemblyById(id)
    const assemblyName = assembly?.nameKey ? t(assembly.nameKey) : assembly?.name
    return t($ => $.usage.usedInRingBeam, { label: assemblyName })
  }

  if (isWallAssemblyId(id)) {
    const assembly = useWallAssemblyById(id)
    const assemblyName = assembly?.nameKey ? t(assembly.nameKey) : assembly?.name
    return t($ => $.usage.usedInWall, { label: assemblyName })
  }

  if (isFloorAssemblyId(id)) {
    const assembly = useFloorAssemblyById(id)
    const assemblyName = assembly?.nameKey ? t(assembly.nameKey) : assembly?.name
    return t($ => $.usage.usedInFloor, { label: assemblyName })
  }

  if (isRoofAssemblyId(id)) {
    const assembly = useRoofAssemblyById(id)
    const assemblyName = assembly?.nameKey ? t(assembly.nameKey) : assembly?.name
    return t($ => $.usage.usedInRoof, { label: assemblyName })
  }

  if (isOpeningAssemblyId(id)) {
    const assembly = useOpeningAssemblyById(id)
    const assemblyName = assembly?.nameKey ? t(assembly.nameKey) : assembly?.name
    return t($ => $.usage.usedInOpening, { label: assemblyName })
  }

  if (isMaterialId(id)) {
    const material = useMaterialById(id)
    const nameKey = material?.nameKey
    const materialName = nameKey ? t($ => $.materials.defaults[nameKey]) : material?.name
    return t($ => $.usage.usedInRoof, { label: materialName })
  }

  return t($ => $.usage.unknown)
}
