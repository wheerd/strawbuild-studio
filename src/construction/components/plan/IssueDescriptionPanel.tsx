import { CheckCircledIcon, CrossCircledIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons'
import { useTranslation } from 'react-i18next'

import { Callout, CalloutIcon } from '@/components/ui/callout'
import type { ConstructionModel } from '@/construction/model'

import { usePlanHighlight } from './PlanHighlightContext'

interface IssueDescriptionPanelProps {
  model: ConstructionModel
}

export const IssueDescriptionPanel = ({ model }: IssueDescriptionPanelProps) => {
  const { hoveredIssueId, setHoveredIssueId } = usePlanHighlight()
  const { t } = useTranslation('construction')

  return (
    <div className="flex max-h-[120px] w-full flex-col gap-2 overflow-y-auto py-2">
      {model.errors.length > 0 && (
        <Callout className="text-destructive" size="sm">
          <CalloutIcon>
            <CrossCircledIcon />
          </CalloutIcon>
          <div className="flex flex-col gap-2">
            <span className="text-base font-medium">
              {t($ => $.planModal.issuesPanel.errorsTitle, { count: model.errors.length })}
            </span>
            <div className="flex flex-col gap-1">
              {model.errors.map(error => (
                <span
                  key={error.id}
                  onMouseEnter={() => {
                    setHoveredIssueId(error.id)
                  }}
                  onMouseLeave={() => {
                    setHoveredIssueId(null)
                  }}
                  className="text-sm"
                  style={{
                    cursor: 'pointer',
                    padding: 'var(--space-1)',
                    margin: 'calc(-1 * var(--space-1))',
                    borderRadius: 'var(--radius-1)',
                    backgroundColor: hoveredIssueId === error.id ? 'var(--red-a3)' : 'transparent',
                    transition: 'background-color 0.15s ease'
                  }}
                >
                  • {t(error.messageKey, { ...error.params, ns: 'errors' })}
                </span>
              ))}
            </div>
          </div>
        </Callout>
      )}

      {model.warnings.length > 0 && (
        <Callout color="orange" size="sm">
          <CalloutIcon>
            <ExclamationTriangleIcon />
          </CalloutIcon>
          <div className="flex flex-col gap-2">
            <span className="text-base font-medium">
              {t($ => $.planModal.issuesPanel.warningsTitle, { count: model.warnings.length })}
            </span>
            <div className="flex flex-col gap-1">
              {model.warnings.map(warning => (
                <span
                  key={warning.id}
                  className="text-sm"
                  onMouseEnter={() => {
                    setHoveredIssueId(warning.id)
                  }}
                  onMouseLeave={() => {
                    setHoveredIssueId(null)
                  }}
                  style={{
                    cursor: 'pointer',
                    padding: 'var(--space-1)',
                    margin: 'calc(-1 * var(--space-1))',
                    borderRadius: 'var(--radius-1)',
                    backgroundColor: hoveredIssueId === warning.id ? 'var(--orange-a3)' : 'transparent',
                    transition: 'background-color 0.15s ease'
                  }}
                >
                  • {t(warning.messageKey, { ...warning.params, ns: 'errors' })}
                </span>
              ))}
            </div>
          </div>
        </Callout>
      )}

      {model.errors.length === 0 && model.warnings.length === 0 && (
        <Callout color="green" size="sm">
          <CalloutIcon>
            <CheckCircledIcon />
          </CalloutIcon>
          <div className="flex flex-col gap-1">
            <span className="text-base font-medium">{t($ => $.planModal.issuesPanel.noIssuesTitle)}</span>
            <span className="text-sm">{t($ => $.planModal.issuesPanel.noIssuesMessage)}</span>
          </div>
        </Callout>
      )}
    </div>
  )
}
