import { isPerimeterId, isPerimeterWallId, isRoofId, isStoreyId } from '@/building/model'
import type { ConstructionElement, ConstructionGroup, GroupOrElement } from '@/construction/elements'
import { getMaterialById } from '@/construction/materials/store'
import type { ConstructionModel } from '@/construction/model'
import { getPartInfoFromManifold } from '@/construction/parts/pipeline'
import {
  type MaterialMetrics,
  computeMaterialMetrics,
  computePartDescription,
  computePartIdWithInfo,
  computePartIdWithoutInfo,
  findMappedTag,
  getStrawCategoryFromTags
} from '@/construction/parts/shared'
import type { FullPartInfo, PartId, SideFace } from '@/construction/parts/types'
import { type Tag, isCustomTag } from '@/construction/tags'
import { type Vec3, arrayToVec3, calculatePolygonWithHolesArea, copyVec3 } from '@/shared/geometry'

import type { LocationFilter, PartDefinition, PartOccurrence } from './types'

export interface PartsGenerationResult {
  definitions: Record<PartId, PartDefinition>
  occurrences: PartOccurrence[]
}

function updateContextFromSourceId(context: LocationFilter, sourceId: string | undefined): LocationFilter {
  if (!sourceId) return context
  if (isStoreyId(sourceId)) return { ...context, storeyId: sourceId }
  if (isRoofId(sourceId)) return { ...context, roofId: sourceId }
  if (isPerimeterId(sourceId)) return { ...context, perimeterId: sourceId }
  if (isPerimeterWallId(sourceId)) return { ...context, wallId: sourceId }
  return context
}

function getFullPartInfoForElement(
  element: ConstructionElement,
  geometryInfo: { boxSize: Vec3; sideFaces?: SideFace[]; id: string }
): FullPartInfo | null {
  if (!element.partInfo) return null
  if ('id' in element.partInfo) return element.partInfo

  const typePrefix = `${element.partInfo.type}${element.partInfo.subtype ? `-${element.partInfo.subtype}` : ''}`
  const id = `${typePrefix}-${element.material}-${geometryInfo.id}` as PartId
  const fullInfo = element.partInfo as FullPartInfo
  fullInfo.id = id
  fullInfo.boxSize = geometryInfo.boxSize
  fullInfo.sideFaces = geometryInfo.sideFaces
  fullInfo.subtype = element.partInfo.subtype
  return fullInfo
}

function getFullPartInfoForGroup(element: ConstructionGroup): FullPartInfo | null {
  if (!element.partInfo) return null
  if ('id' in element.partInfo) return element.partInfo

  const typePrefix = `${element.partInfo.type}${element.partInfo.subtype ? `-${element.partInfo.subtype}` : ''}`
  const dims = [...element.bounds.size].sort((a, b) => a - b)
  const id = `${typePrefix}-group:${dims.join('x')}` as PartId
  const fullInfo = element.partInfo as FullPartInfo
  fullInfo.boxSize = arrayToVec3(dims)
  fullInfo.id = id
  fullInfo.subtype = element.partInfo.subtype
  return fullInfo
}

function createPartDefinitionForElement(
  element: ConstructionElement,
  partId: PartId,
  metrics: MaterialMetrics,
  fullPartInfo: FullPartInfo | null,
  tags: Tag[]
): PartDefinition {
  const materialId = element.material
  const materialDefinition = getMaterialById(materialId)
  const materialType = materialDefinition?.type

  const strawCategory = materialType === 'strawbale' ? getStrawCategoryFromTags(tags) : undefined
  const type = strawCategory ? `strawbale-${strawCategory}` : (fullPartInfo?.type ?? findMappedTag(tags)?.type ?? '-')
  const description = computePartDescription(fullPartInfo, tags, strawCategory)

  return {
    partId,
    materialId,
    materialType,
    source: 'element',
    type,
    subtype: fullPartInfo?.subtype,
    description,
    strawCategory,
    size: fullPartInfo?.sideFaces ? copyVec3(fullPartInfo.boxSize) : copyVec3(element.bounds.size),
    ...metrics,
    requiresSinglePiece: fullPartInfo?.requiresSinglePiece
  }
}

export function generatePartsData(model: ConstructionModel): PartsGenerationResult {
  const result: PartsGenerationResult = {
    definitions: {},
    occurrences: []
  }

  function processElement(element: GroupOrElement, accumulatedTags: Tag[], context: LocationFilter): void {
    const tags = [...accumulatedTags, ...(element.tags ?? [])]
    const newContext = updateContextFromSourceId(context, element.sourceId)

    if ('children' in element) {
      for (const child of element.children) {
        processElement(child, tags, newContext)
      }

      if (element.partInfo) {
        const partInfo = getFullPartInfoForGroup(element)
        if (partInfo) {
          processGroupAsVirtualPart(element, partInfo, newContext, result)
        }
      }
      return
    }

    const materialDefinition = getMaterialById(element.material)
    const isVirtual = materialDefinition?.type === 'prefab'

    const geometryInfo = getPartInfoFromManifold(element.shape.manifold)
    const hasPartInfo = !!element.partInfo

    let fullPartInfo: FullPartInfo | null = null
    if (hasPartInfo) {
      fullPartInfo = getFullPartInfoForElement(element, geometryInfo)
    }

    let partId: PartId
    if (hasPartInfo && fullPartInfo) {
      partId = computePartIdWithInfo(fullPartInfo, tags, element.material)
    } else {
      partId = computePartIdWithoutInfo(tags, geometryInfo, materialDefinition)
    }

    if (!(partId in result.definitions)) {
      const metrics = computeMaterialMetrics(geometryInfo, materialDefinition, hasPartInfo)
      result.definitions[partId] = createPartDefinitionForElement(element, partId, metrics, fullPartInfo, tags)
    }

    result.occurrences.push({
      elementId: element.id,
      partId,
      virtual: isVirtual,
      storeyId: newContext.storeyId,
      perimeterId: newContext.perimeterId,
      wallId: newContext.wallId,
      roofId: newContext.roofId
    })
  }

  function processGroupAsVirtualPart(
    element: ConstructionGroup,
    partInfo: FullPartInfo,
    context: LocationFilter,
    result: PartsGenerationResult
  ): void {
    const partId = partInfo.id
    if (!(partId in result.definitions)) {
      const typeTag = element.tags?.find(t => t.category === 'module-type')
      const description = typeTag && isCustomTag(typeTag) ? typeTag.label : undefined

      const area = partInfo.sideFaces?.[0]
        ? calculatePolygonWithHolesArea(partInfo.sideFaces[0].polygon)
        : element.bounds.size[0] * element.bounds.size[2]
      const volume = partInfo.boxSize[0] * partInfo.boxSize[1] * partInfo.boxSize[2]

      result.definitions[partId] = {
        partId,
        source: 'group',
        type: partInfo.type,
        subtype: partInfo.subtype,
        description,
        size: copyVec3(partInfo.boxSize),
        volume,
        area,
        sideFaces: partInfo.sideFaces,
        requiresSinglePiece: partInfo.requiresSinglePiece
      }
    }

    result.occurrences.push({
      elementId: element.id,
      partId,
      virtual: true,
      storeyId: context.storeyId,
      perimeterId: context.perimeterId,
      wallId: context.wallId,
      roofId: context.roofId
    })
  }

  for (const element of model.elements) {
    processElement(element, [], {})
  }

  return result
}
