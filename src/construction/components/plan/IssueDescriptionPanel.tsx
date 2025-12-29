import { CheckCircledIcon, CrossCircledIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons'
import { Callout, Flex, Text } from '@radix-ui/themes'
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
  const { t: tGlobal } = useTranslation()

  return (
    <Flex direction="column" gap="2" p="2" style={{ maxHeight: '120px', overflowY: 'auto' }}>
      {model ? (
        <>
          {model.errors.length > 0 && (
            <Callout.Root color="red" size="1">
              <Callout.Icon>
                <CrossCircledIcon />
              </Callout.Icon>
              <Flex direction="column" gap="2">
                <Text weight="medium" size="2">
                  {t($ => $.planModal.issuesPanel.errorsTitle, { count: model.errors.length })}
                </Text>
                <Flex direction="column" gap="1">
                  {model.errors.map(error => (
                    <Text
                      key={error.id}
                      size="1"
                      onMouseEnter={() => setHoveredIssueId(error.id)}
                      onMouseLeave={() => setHoveredIssueId(null)}
                      style={{
                        cursor: 'pointer',
                        padding: 'var(--space-1)',
                        margin: 'calc(-1 * var(--space-1))',
                        borderRadius: 'var(--radius-1)',
                        backgroundColor: hoveredIssueId === error.id ? 'var(--red-a3)' : 'transparent',
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      • {tGlobal(error.messageKey, error.params)}
                    </Text>
                  ))}
                </Flex>
              </Flex>
            </Callout.Root>
          )}

          {model.warnings.length > 0 && (
            <Callout.Root color="amber" size="1">
              <Callout.Icon>
                <ExclamationTriangleIcon />
              </Callout.Icon>
              <Flex direction="column" gap="2">
                <Text weight="medium" size="2">
                  {t($ => $.planModal.issuesPanel.warningsTitle, { count: model.warnings.length })}
                </Text>
                <Flex direction="column" gap="1">
                  {model.warnings.map(warning => (
                    <Text
                      key={warning.id}
                      size="1"
                      onMouseEnter={() => setHoveredIssueId(warning.id)}
                      onMouseLeave={() => setHoveredIssueId(null)}
                      style={{
                        cursor: 'pointer',
                        padding: 'var(--space-1)',
                        margin: 'calc(-1 * var(--space-1))',
                        borderRadius: 'var(--radius-1)',
                        backgroundColor: hoveredIssueId === warning.id ? 'var(--amber-a3)' : 'transparent',
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      • {tGlobal(warning.messageKey, warning.params)}
                    </Text>
                  ))}
                </Flex>
              </Flex>
            </Callout.Root>
          )}

          {model.errors.length === 0 && model.warnings.length === 0 && (
            <Callout.Root color="green" size="1">
              <Callout.Icon>
                <CheckCircledIcon />
              </Callout.Icon>
              <Flex direction="column" gap="1">
                <Text weight="medium" size="2">
                  {t($ => $.planModal.issuesPanel.noIssuesTitle)}
                </Text>
                <Text size="1">{t($ => $.planModal.issuesPanel.noIssuesMessage)}</Text>
              </Flex>
            </Callout.Root>
          )}
        </>
      ) : (
        <Callout.Root color="red" size="1">
          <Callout.Icon>
            <CrossCircledIcon />
          </Callout.Icon>
          <Callout.Text>{t($ => $.planModal.errors.failedModel)}</Callout.Text>
        </Callout.Root>
      )}
    </Flex>
  )
}
