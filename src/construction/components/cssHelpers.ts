import type { ConstructionElement, ConstructionGroup } from '@/construction/elements'
import type { CutFunction } from '@/construction/geometry'

/**
 * Helper function for generating CSS classes for construction plan elements and groups
 *
 * @param element - The construction element or group
 * @param aboveCut - Optional cut function to determine if element should be hidden
 * @param additionalClassName - Optional additional CSS class to include
 * @returns Combined CSS class string
 */
export function getConstructionElementClasses(
  element: ConstructionElement | ConstructionGroup,
  aboveCut?: CutFunction,
  additionalClassName?: string
): string {
  const baseClass = 'children' in element ? 'construction-group' : 'construction-element'
  const cutClassName = aboveCut?.(element) ? 'above-cut' : ''

  // Both elements and groups can have tags
  const tagClasses = element.tags?.flatMap(t => [`tag__${t.id}`, `tag-cat__${t.category}`]) ?? []
  // Only elements have materials (groups don't)
  const materialClass = 'material' in element && element.material ? element.material : ''
  return [additionalClassName, ...tagClasses, materialClass, baseClass, cutClassName].filter(Boolean).join(' ')
}
