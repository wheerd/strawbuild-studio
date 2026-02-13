import type React from 'react'
import { useTranslation } from 'react-i18next'

import type { ConstructionModelId } from '@/construction/store'
import { TAG_BASE_PLATE, TAG_DECKING, TAG_ROOF, TAG_SUBFLOOR, TAG_TOP_PLATE, TAG_WALLS } from '@/construction/tags'

import { ConstructionPlanModal } from './ConstructionPlanModal'
import { TOP_VIEW } from './plan/ConstructionPlan'

export default function TopDownPlanModal({
  title,
  modelId,
  trigger
}: {
  title: string
  modelId: ConstructionModelId
  trigger: React.ReactNode
}): React.JSX.Element {
  const { t } = useTranslation('construction')

  return (
    <ConstructionPlanModal
      title={title}
      modelId={modelId}
      views={[
        {
          view: TOP_VIEW,
          label: t($ => $.planModal.views.walls),
          alwaysHiddenTags: [TAG_ROOF.id, 'roof-measurement', 'floor-measurement']
        },
        {
          view: TOP_VIEW,
          label: t($ => $.planModal.views.roof),
          alwaysHiddenTags: ['wall-measurement', 'opening-measurement', 'floor-measurement'],
          toggleHideTags: [TAG_DECKING.id]
        },
        {
          view: TOP_VIEW,
          label: t($ => $.planModal.views.floor),
          alwaysHiddenTags: [
            TAG_WALLS.id,
            TAG_BASE_PLATE.id,
            TAG_TOP_PLATE.id,
            TAG_ROOF.id,
            'wall-measurement',
            'roof-measurement',
            'opening-measurement'
          ],
          toggleHideTags: [TAG_SUBFLOOR.id]
        }
      ]}
      midCutActiveDefault
      defaultHiddenTags={['floor-layer', 'wall-layer', 'roof-layer', 'finished-measurement']}
      trigger={trigger}
    />
  )
}
