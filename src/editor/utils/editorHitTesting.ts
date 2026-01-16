import type { EntityType, SelectableId } from '@/building/model/ids'

export interface EntityHitResult {
  entityId: SelectableId
  entityType: EntityType
  parentIds: SelectableId[]
}

export function findEditorEntityAt({ clientX, clientY }: { clientX: number; clientY: number }): EntityHitResult | null {
  // Get all elements at this point, ordered from top to bottom (paint order)
  const elements = document.elementsFromPoint(clientX, clientY)

  for (const el of elements) {
    if (!(el instanceof SVGElement)) {
      continue
    }

    let svgElement: SVGElement = el

    if (!svgElement.hasAttribute('data-entity-id')) {
      svgElement = svgElement.closest<SVGElement>('[data-entity-id]') ?? svgElement
    }

    const entityId = svgElement.getAttribute('data-entity-id')
    const entityType = svgElement.getAttribute('data-entity-type')

    if (entityId && entityType) {
      const parentIdsStr = svgElement.getAttribute('data-parent-ids') ?? '[]'
      let parentIds: SelectableId[] = []

      try {
        parentIds = JSON.parse(parentIdsStr) as SelectableId[]
      } catch (error) {
        console.warn('Failed to parse parent IDs:', parentIdsStr, error)
      }

      return {
        entityId: entityId as SelectableId,
        entityType: entityType as EntityType,
        parentIds
      }
    }
  }

  return null
}
