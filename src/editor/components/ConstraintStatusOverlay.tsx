import { TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useAllConstraintStatus } from '@/editor/gcs/store'

export function ConstraintStatusOverlay(): React.JSX.Element | null {
  const { t } = useTranslation('inspector')
  const { conflictingCount, redundantCount } = useAllConstraintStatus()

  const hasConflicts = conflictingCount > 0
  const hasRedundant = redundantCount > 0
  const hasIssues = hasConflicts || hasRedundant

  if (!hasIssues) {
    return null
  }

  const count = hasConflicts ? conflictingCount : redundantCount
  const colorClass = hasConflicts
    ? 'text-destructive-foreground bg-destructive hover:bg-destructive/90'
    : 'text-destructive-foreground bg-amber-500 hover:bg-amber-500/90'

  const tooltipText = hasConflicts
    ? t($ => $.constraint.conflictStatus, { count })
    : t($ => $.constraint.redundantStatus, { count })

  return (
    <div className={`absolute top-2 right-2 rounded-lg p-2 ${colorClass} cursor-help select-none`} title={tooltipText}>
      <TriangleAlert className="h-6 w-6" />
    </div>
  )
}
