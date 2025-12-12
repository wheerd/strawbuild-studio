import type React from 'react'

import type { ConstructionModel } from '@/construction/model'
import { TAG_BASE_PLATE, TAG_ROOF, TAG_SUBFLOOR, TAG_TOP_PLATE, TAG_WALLS } from '@/construction/tags'

import { TOP_VIEW } from './ConstructionPlan'
import { ConstructionPlanModal } from './ConstructionPlanModal'

export default ({
  title,
  factory,
  refreshKey,
  trigger
}: {
  title: string
  factory: () => Promise<ConstructionModel | null>
  refreshKey: unknown
  trigger: React.ReactNode
}) => (
  <ConstructionPlanModal
    title={title}
    constructionModelFactory={factory}
    views={[
      {
        view: TOP_VIEW,
        label: 'Walls',
        alwaysHiddenTags: [TAG_ROOF.id]
      },
      {
        view: TOP_VIEW,
        label: 'Roof'
      },
      {
        view: TOP_VIEW,
        label: 'Floor',
        alwaysHiddenTags: [TAG_WALLS.id, TAG_BASE_PLATE.id, TAG_TOP_PLATE.id, TAG_ROOF.id],
        toggleHideTags: [TAG_SUBFLOOR.id]
      }
    ]}
    midCutActiveDefault
    defaultHiddenTags={['floor-layer', 'wall-layer', 'roof-layer']}
    refreshKey={refreshKey}
    trigger={trigger}
  />
)
