import { CheckCircledIcon, CrossCircledIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons'
import { use } from 'react'
import { useTranslation } from 'react-i18next'

import type { ConstructionModel } from '@/construction/model'

import { usePlanHighlight } from './PlanHighlightContext'

interface IssueDescriptionPanelProps {
  modelPromise: Promise<ConstructionModel | null>
}

export const IssueDescriptionPanel = ({ modelPromise }: IssueDescriptionPanelProps) => {
  const model = use(modelPromise)
  const { hoveredIssueId, setHoveredIssueId } = usePlanHighlight()
  const { t } = useTranslation('construction')

  return (
    <div className="flex flex-col gap-2 p-2" style={{ maxHeight: '120px', overflowY: 'auto' }}>
      {model ? (
        <>
          {model.errors.length > 0 && (
            <Callout className="text-destructive" size="1">
              <CalloutIcon>
                <CrossCircledIcon />
              </CalloutIcon>
              <div className="flex flex-col gap-2">
                <span className="font-medium text-base">
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
            <Callout color="amber" size="1">
              <CalloutIcon>
                <ExclamationTriangleIcon />
              </CalloutIcon>
              <div className="flex flex-col gap-2">
                <span className="font-medium text-base">
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
                        backgroundColor: hoveredIssueId === warning.id ? 'var(--amber-a3)' : 'transparent',
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
            <Callout color="green" size="1">
              <CalloutIcon>
                <CheckCircledIcon />
              </CalloutIcon>
              <div className="flex flex-col gap-1">
                <span className="font-medium text-base">{t($ => $.planModal.issuesPanel.noIssuesTitle)}</span>
                <span className="text-sm">{t($ => $.planModal.issuesPanel.noIssuesMessage)}</span>
              </div>
            </Callout>
          )}
        </>
      ) : (
        <Callout className="text-destructive" size="1">
          <CalloutIcon>
            <CrossCircledIcon />
          </CalloutIcon>
          <CalloutText>{t($ => $.planModal.errors.failedModel)}</CalloutText>
        </Callout>
      )}
    </div>
  )
}
