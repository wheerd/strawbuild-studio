import { CheckCircledIcon, Cross2Icon, CrossCircledIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons'
import { Box, Callout, Dialog, Flex, IconButton, Text } from '@radix-ui/themes'
import React, { useMemo } from 'react'

import type { PerimeterId, PerimeterWallId } from '@/building/model/ids'
import { useModelActions, usePerimeterById } from '@/building/store'
import { getConfigActions } from '@/construction/config'
import type { ConstructionIssue } from '@/construction/results'
import { PERIMETER_WALL_CONSTRUCTION_METHODS, createWallStoreyContext } from '@/construction/walls'
import { elementSizeRef } from '@/shared/hooks/useElementSize'

import { BACK_VIEW, ConstructionPlan, FRONT_VIEW, type ViewOption } from './ConstructionPlan'

interface IssueDescriptionPanelProps {
  errors: ConstructionIssue[]
  warnings: ConstructionIssue[]
}

const IssueDescriptionPanel = ({ errors, warnings }: IssueDescriptionPanelProps) => (
  <Box className="border-t border-gray-6">
    <Flex direction="column" gap="2" p="3" style={{ maxHeight: '120px', overflowY: 'auto' }}>
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
  perimeterId: PerimeterId
  wallId: PerimeterWallId
  children: React.ReactNode
}

export function WallConstructionPlanModal({
  perimeterId,
  wallId,
  children
}: WallConstructionPlanModalProps): React.JSX.Element {
  const [containerSize, containerRef] = elementSizeRef()
  const perimeter = usePerimeterById(perimeterId)
  const { getStoreyById, getStoreysOrderedByLevel } = useModelActions()
  const { getPerimeterConstructionMethodById, getSlabConstructionConfigById } = getConfigActions()

  const constructionModel = useMemo(() => {
    if (!perimeter) return null

    const wall = perimeter.walls.find(w => w.id === wallId)
    if (!wall) return null

    const storey = getStoreyById(perimeter.storeyId)
    if (!storey) return null

    const method = getPerimeterConstructionMethodById(wall.constructionMethodId)
    if (!method?.config?.type) return null

    // Use generic construction method registry
    const constructionMethod = PERIMETER_WALL_CONSTRUCTION_METHODS[method.config.type]
    if (!constructionMethod) return null

    const currentSlabConfig = getSlabConstructionConfigById(storey.slabConstructionConfigId)
    if (!currentSlabConfig) return null

    const allStoreys = getStoreysOrderedByLevel()
    const currentIndex = allStoreys.findIndex(s => s.id === storey.id)
    const nextStorey = currentIndex >= 0 && currentIndex < allStoreys.length - 1 ? allStoreys[currentIndex + 1] : null
    const nextSlabConfig = nextStorey ? getSlabConstructionConfigById(nextStorey.slabConstructionConfigId) : null

    const storeyContext = createWallStoreyContext(storey, currentSlabConfig, nextSlabConfig)

    return constructionMethod(wall, perimeter, storeyContext, method.config, method.layers)
  }, [
    perimeter,
    wallId,
    getStoreyById,
    getStoreysOrderedByLevel,
    getPerimeterConstructionMethodById,
    getSlabConstructionConfigById
  ])

  // Define views for wall construction
  const views: ViewOption[] = [
    { view: FRONT_VIEW, label: 'Outside' },
    { view: BACK_VIEW, label: 'Inside' }
  ]

  if (!perimeter) {
    return <>{children}</>
  }

  return (
    <Dialog.Root>
      <Dialog.Trigger>{children}</Dialog.Trigger>
      <Dialog.Content
        size="2"
        width="95%"
        maxWidth="95%"
        maxHeight="90vh"
        className="flex flex-col overflow-hidden"
        onEscapeKeyDown={e => {
          e.stopPropagation()
        }}
      >
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
            className="relative flex-1 min-h-[300px] max-h-[calc(100vh-400px)] overflow-hidden border border-gray-6 rounded-2"
          >
            {constructionModel ? (
              <ConstructionPlan model={constructionModel} views={views} containerSize={containerSize} />
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

          {constructionModel && (
            <Box flexShrink="0">
              <IssueDescriptionPanel errors={constructionModel.errors} warnings={constructionModel.warnings} />
            </Box>
          )}
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}
