import type { EntityType, SelectableId } from '@/building/model/ids'

export interface SvgEntityHitResult {
  entityId: SelectableId
  entityType: EntityType
  parentIds: SelectableId[]
  svgElement: SVGElement
  clientPoint: { x: number; y: number }
}

/**
 * Find an entity at the given screen coordinates using DOM-based hit testing.
 * Uses document.elementsFromPoint() to find all elements at the given position
 * and returns the first one with entity data attributes.
 *
 * @param clientX - Screen X coordinate (relative to viewport)
 * @param clientY - Screen Y coordinate (relative to viewport)
 * @returns Hit result with entity information, or null if no entity found
 */
export function findSvgEntityAt(clientX: number, clientY: number): SvgEntityHitResult | null {
  // Get all elements at this point, ordered from top to bottom (paint order)
  const elements = document.elementsFromPoint(clientX, clientY)

  // Find the first SVG element with entity data attributes
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
        parentIds,
        svgElement,
        clientPoint: { x: clientX, y: clientY }
      }
    }
  }

  // No entity found at this position
  return null
}

/**
 * Find all entities within a rectangular region.
 * This is a basic implementation that samples points within the rectangle.
 * For more accuracy, you could implement polygon intersection testing.
 *
 * @param bounds - Rectangle bounds in screen coordinates
 * @returns Array of hit results for entities within the bounds
 */
export function findSvgEntitiesInRect(bounds: {
  x: number
  y: number
  width: number
  height: number
}): SvgEntityHitResult[] {
  const entities = new Set<SVGElement>()
  const results: SvgEntityHitResult[] = []

  // Sample points within the rectangle (grid sampling)
  const samplesX = Math.max(2, Math.ceil(bounds.width / 20))
  const samplesY = Math.max(2, Math.ceil(bounds.height / 20))

  for (let i = 0; i < samplesX; i++) {
    for (let j = 0; j < samplesY; j++) {
      const x = bounds.x + (bounds.width * i) / (samplesX - 1)
      const y = bounds.y + (bounds.height * j) / (samplesY - 1)

      const hit = findSvgEntityAt(x, y)
      if (hit && !entities.has(hit.svgElement)) {
        entities.add(hit.svgElement)
        results.push(hit)
      }
    }
  }

  return results
}
