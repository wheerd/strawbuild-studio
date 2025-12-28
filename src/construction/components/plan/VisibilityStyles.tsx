import { useMemo } from 'react'

import type { TagOrCategory } from '@/construction/tags'

import { useTagVisibilityActions, useTagVisibilityForceUpdate } from './TagVisibilityContext'

export interface VisibilityStylesProps {
  hiddenTagsForView: TagOrCategory[]
  hideAreas: boolean
  hideIssues: boolean
  hideMeasurements: boolean
}

const getCssClassForTag = (tagId: string): string => (tagId.includes('_') ? `tag__${tagId}` : `tag-cat__${tagId}`)

/**
 * Component that subscribes to tag visibility changes and renders visibility CSS.
 * Only this component re-renders when tag visibility changes, not the entire ConstructionPlan.
 */
export function VisibilityStyles({
  hiddenTagsForView,
  hideAreas,
  hideIssues,
  hideMeasurements
}: VisibilityStylesProps): React.JSX.Element {
  // Force re-render when tag visibility changes (only this component, not parent)
  useTagVisibilityForceUpdate()

  // Get hidden tag IDs without subscribing (we already subscribe above)
  const { getHiddenTagIds } = useTagVisibilityActions()

  const visibilityStyles = useMemo(() => {
    const hiddenTagIds = getHiddenTagIds()
    return Array.from(hiddenTagIds)
      .concat(hiddenTagsForView)
      .map(tagId => getCssClassForTag(tagId))
      .concat(hideAreas ? ['area-polygon', 'area-cuboid', 'area-cut'] : [])
      .concat(hideIssues ? ['construction-warning', 'construction-error'] : [])
      .concat(hideMeasurements ? ['measurement'] : [])
      .map(cssClass => `.${cssClass} { display: none; }`)
      .join('\n')
  }, [getHiddenTagIds, hiddenTagsForView, hideAreas, hideIssues, hideMeasurements])

  if (!visibilityStyles) {
    return <></>
  }

  return <style>{visibilityStyles}</style>
}
