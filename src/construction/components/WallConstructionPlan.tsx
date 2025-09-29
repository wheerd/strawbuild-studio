import { CheckCircledIcon, Cross2Icon, CrossCircledIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons'
import { Box, Callout, Dialog, Flex, IconButton, SegmentedControl, Text } from '@radix-ui/themes'
import React, { useState } from 'react'

import type { ConstructionModel } from '@/construction/model'
import { type ConstructionIssue } from '@/construction/walls'
import { elementSizeRef } from '@/shared/hooks/useElementSize'
import { type ViewType } from '@/shared/utils/constructionCoordinates'

import { BACK_VIEW, ConstructionPlan, FRONT_VIEW } from './ConstructionPlan'

interface IssueDescriptionPanelProps {
  errors: ConstructionIssue[]
  warnings: ConstructionIssue[]
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

interface WallConstructionPlanModalProps {
  model: ConstructionModel
  children: React.ReactNode
}

export function WallConstructionPlanModal({ model, children }: WallConstructionPlanModalProps): React.JSX.Element {
  const [view, setView] = useState<ViewType>('outside')
  const [containerSize, containerRef] = elementSizeRef()

  return (
    <Dialog.Root>
      <Dialog.Trigger>{children}</Dialog.Trigger>
      <Dialog.Content size="2" width="95%" maxWidth="95%" maxHeight="90vh" className="flex flex-col overflow-hidden">
        <Flex direction="column" gap="3" height="100%" className="overflow-hidden">
          <Dialog.Title>
            <Flex justify="between" align="center">
              Wall Construction Plan
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
            <ConstructionPlan
              model={model}
              view={view === 'inside' ? FRONT_VIEW : BACK_VIEW}
              containerSize={containerSize}
            />

            {/* Overlay SegmentedControl in top-left corner */}
            <Box position="absolute" top="3" left="3" p="1" className="z-10 shadow-md bg-panel rounded-2">
              <SegmentedControl.Root value={view} onValueChange={value => setView(value as ViewType)} size="1">
                <SegmentedControl.Item value="outside">Outside</SegmentedControl.Item>
                <SegmentedControl.Item value="inside">Inside</SegmentedControl.Item>
              </SegmentedControl.Root>
            </Box>
          </div>

          <Box flexShrink="0">
            <IssueDescriptionPanel errors={model.errors} warnings={model.warnings} />
          </Box>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}
