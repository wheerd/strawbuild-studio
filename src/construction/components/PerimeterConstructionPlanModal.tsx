import { CheckCircledIcon, Cross2Icon, CrossCircledIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons'
import { Box, Callout, Dialog, Flex, IconButton, Text } from '@radix-ui/themes'
import React, { useMemo } from 'react'

import type { PerimeterId } from '@/building/model/ids'
import { usePerimeterById } from '@/building/store'
import { resolveDefaultMaterial } from '@/construction/materials/material'
import { constructPerimeter } from '@/construction/perimeter'
import { elementSizeRef } from '@/shared/hooks/useElementSize'

import { ConstructionPlan, TOP_VIEW } from './ConstructionPlan'

export interface PerimeterConstructionModalProps {
  perimeterId: PerimeterId
  trigger: React.ReactNode
}

interface IssueDescriptionPanelProps {
  errors: { description: string }[]
  warnings: { description: string }[]
}

const IssueDescriptionPanel = ({ errors, warnings }: IssueDescriptionPanelProps) => (
  <Box maxHeight="200px" className="overflow-y-auto border-t border-gray-6">
    <Flex direction="column" gap="2" p="3">
      {errors.length > 0 && (
        <Callout.Root color="red" size="1">
          <Callout.Icon>
            <CrossCircledIcon />
          </Callout.Icon>
          <Flex direction="column" gap="2">
            <Text weight="medium" size="2">
              Errors ({errors.length})
            </Text>
            <Flex direction="column" gap="1">
              {errors.map((error, index) => (
                <Text key={index} size="1">
                  • {error.description}
                </Text>
              ))}
            </Flex>
          </Flex>
        </Callout.Root>
      )}

      {warnings.length > 0 && (
        <Callout.Root color="amber" size="1">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Flex direction="column" gap="2">
            <Text weight="medium" size="2">
              Warnings ({warnings.length})
            </Text>
            <Flex direction="column" gap="1">
              {warnings.map((warning, index) => (
                <Text key={index} size="1">
                  • {warning.description}
                </Text>
              ))}
            </Flex>
          </Flex>
        </Callout.Root>
      )}

      {errors.length === 0 && warnings.length === 0 && (
        <Callout.Root color="green" size="1">
          <Callout.Icon>
            <CheckCircledIcon />
          </Callout.Icon>
          <Flex direction="column" gap="1">
            <Text weight="medium" size="2">
              No Issues Found
            </Text>
            <Text size="1">Construction plan is valid with no errors or warnings.</Text>
          </Flex>
        </Callout.Root>
      )}
    </Flex>
  </Box>
)

export function PerimeterConstructionPlanModal({
  perimeterId,
  trigger
}: PerimeterConstructionModalProps): React.JSX.Element {
  const [containerSize, containerRef] = elementSizeRef()

  const perimeter = usePerimeterById(perimeterId)

  const constructionModel = useMemo(() => {
    if (!perimeter) return null
    return constructPerimeter(perimeter, resolveDefaultMaterial)
  }, [perimeter])

  if (!perimeter) {
    return <>{trigger}</>
  }

  return (
    <Dialog.Root>
      <Dialog.Trigger>{trigger}</Dialog.Trigger>
      <Dialog.Content size="2" width="95%" maxWidth="95%" maxHeight="90vh" className="flex flex-col overflow-hidden">
        <Flex direction="column" gap="3" height="100%" className="overflow-hidden">
          <Dialog.Title>
            <Flex justify="between" align="center">
              Ring Beam Construction
              <Dialog.Close>
                <IconButton variant="ghost" size="1">
                  <Cross2Icon />
                </IconButton>
              </Dialog.Close>
            </Flex>
          </Dialog.Title>

          <div
            ref={containerRef}
            className="relative grow min-h-[300px] overflow-hidden border border-gray-6 rounded-2"
          >
            {constructionModel ? (
              <ConstructionPlan model={constructionModel} containerSize={containerSize} view={TOP_VIEW} />
            ) : (
              <Flex align="center" justify="center" style={{ height: '100%' }}>
                <Text align="center" color="gray">
                  <Text size="6">⚠</Text>
                  <br />
                  <Text size="2">Failed to generate construction plan</Text>
                </Text>
              </Flex>
            )}
          </div>

          <Flex direction="row" gap="3" flexShrink="0">
            {/* Issues Panel */}
            {constructionModel && (
              <Box flexGrow="1">
                <IssueDescriptionPanel errors={constructionModel.errors} warnings={constructionModel.warnings} />
              </Box>
            )}
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}
