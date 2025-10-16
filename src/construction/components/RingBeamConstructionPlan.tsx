import { CheckCircledIcon, Cross2Icon, CrossCircledIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons'
import { Box, Callout, Card, Dialog, Flex, Heading, IconButton, SegmentedControl, Text } from '@radix-ui/themes'
import React, { useMemo, useState } from 'react'

import type { PerimeterId } from '@/building/model/ids'
import { usePerimeterById } from '@/building/store'
import { useConfigActions } from '@/construction/config'
import { RING_BEAM_ASSEMBLIES } from '@/construction/ringBeams'
import { elementSizeRef } from '@/shared/hooks/useElementSize'

import { ConstructionPlan, TOP_VIEW } from './ConstructionPlan'

export interface RingBeamConstructionModalProps {
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

export function RingBeamConstructionPlanModal({
  perimeterId,
  trigger
}: RingBeamConstructionModalProps): React.JSX.Element {
  const [containerSize, containerRef] = elementSizeRef()

  const perimeter = usePerimeterById(perimeterId)
  const [currentPosition, setCurrentPosition] = useState<'base' | 'top'>(
    perimeter?.baseRingBeamAssemblyId ? 'base' : 'top'
  )
  const { getRingBeamAssemblyById } = useConfigActions()

  const constructionModel = useMemo(() => {
    if (!perimeter) return null

    const assemblyId = currentPosition === 'base' ? perimeter.baseRingBeamAssemblyId : perimeter.topRingBeamAssemblyId

    if (!assemblyId) return null

    const assembly = getRingBeamAssemblyById(assemblyId)
    if (!assembly) return null

    try {
      return RING_BEAM_ASSEMBLIES[assembly.type].construct(perimeter, assembly)
    } catch (error) {
      console.error('Failed to generate ring beam construction plan:', error)
      return null
    }
  }, [perimeter, currentPosition, getRingBeamAssemblyById])

  const currentAssembly = useMemo(() => {
    if (!perimeter) return null

    const assemblyId = currentPosition === 'base' ? perimeter.baseRingBeamAssemblyId : perimeter.topRingBeamAssemblyId

    return assemblyId ? getRingBeamAssemblyById(assemblyId) : null
  }, [perimeter, currentPosition, getRingBeamAssemblyById])

  if (!perimeter) {
    return <>{trigger}</>
  }

  return (
    <Dialog.Root>
      <Dialog.Trigger>{trigger}</Dialog.Trigger>
      <Dialog.Content
        aria-describedby={undefined}
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
            {currentAssembly ? (
              constructionModel ? (
                <ConstructionPlan
                  model={constructionModel}
                  views={[{ view: TOP_VIEW, label: 'Top' }]}
                  containerSize={containerSize}
                />
              ) : (
                <Flex align="center" justify="center" style={{ height: '100%' }}>
                  <Text align="center" color="gray">
                    <Text size="6">⚠</Text>
                    <br />
                    <Text size="2">Failed to generate construction plan</Text>
                  </Text>
                </Flex>
              )
            ) : (
              <Flex align="center" justify="center" style={{ height: '100%' }}>
                <Text align="center" color="gray">
                  <Text size="6">📋</Text>
                  <br />
                  <Text size="2">No {currentPosition} ring beam assembly selected</Text>
                </Text>
              </Flex>
            )}

            {/* Overlay SegmentedControl in top-left corner */}
            <Box position="absolute" top="3" left="3" p="0S" className="z-10 shadow-md bg-panel rounded-2">
              <SegmentedControl.Root
                value={currentPosition}
                onValueChange={value => setCurrentPosition(value as 'base' | 'top')}
                size="1"
              >
                <SegmentedControl.Item value="base">Base Plate</SegmentedControl.Item>
                <SegmentedControl.Item value="top">Top Plate</SegmentedControl.Item>
              </SegmentedControl.Root>
            </Box>
          </div>

          <Flex direction="row" gap="3" flexShrink="0">
            {/* Assembly Info Panel */}
            <Box flexGrow="1">
              {currentAssembly && (
                <Card variant="surface" size="1">
                  <Heading size="2" mb="1">
                    {currentAssembly.name}
                  </Heading>
                  <Flex direction="column" gap="1">
                    <Text size="1">Type: {currentAssembly.type}</Text>
                    <Text size="1">Height: {currentAssembly.height}mm</Text>
                    {currentAssembly.type === 'full' && <Text size="1">Width: {currentAssembly.width}mm</Text>}
                    {currentAssembly.type === 'double' && (
                      <Text size="1">Thickness: {currentAssembly.thickness}mm</Text>
                    )}
                  </Flex>
                </Card>
              )}
            </Box>

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
