import * as Label from '@radix-ui/react-label'
import { Box, Button, Callout, DataList, Flex, Heading, Select, Text } from '@radix-ui/themes'
import React from 'react'

import type { PerimeterId, RingBeamConstructionMethodId } from '@/building/model/ids'
import { useModelActions, usePerimeterById } from '@/building/store'
import { PerimeterConstructionPlanModal } from '@/construction/components/PerimeterConstructionPlan'
import { RingBeamConstructionPlanModal } from '@/construction/components/RingBeamConstructionPlan'
import { useRingBeamConstructionMethods } from '@/construction/config/store'
import { type Length, calculatePolygonArea } from '@/shared/geometry'
import { formatLength } from '@/shared/utils/formatLength'

interface PerimeterInspectorProps {
  selectedId: PerimeterId
}

export function PerimeterInspector({ selectedId }: PerimeterInspectorProps): React.JSX.Element {
  // Get perimeter data from model store
  const { setPerimeterBaseRingBeam, setPerimeterTopRingBeam, removePerimeterBaseRingBeam, removePerimeterTopRingBeam } =
    useModelActions()
  const outerWall = usePerimeterById(selectedId)

  // Get ring beam methods from config store
  const allRingBeamMethods = useRingBeamConstructionMethods()

  // If perimeter not found, show error
  if (!outerWall) {
    return (
      <Box p="2">
        <Callout.Root color="red">
          <Callout.Text>
            <Text weight="bold">Perimeter Not Found</Text>
            <br />
            Perimeter with ID {selectedId} could not be found.
          </Callout.Text>
        </Callout.Root>
      </Box>
    )
  }

  const totalInnerPerimeter = outerWall.walls.reduce((l, s) => l + s.insideLength, 0)
  const totalOuterPerimeter = outerWall.walls.reduce((l, s) => l + s.outsideLength, 0)
  const totalInnerArea = calculatePolygonArea({ points: outerWall.corners.map(c => c.insidePoint) })
  const totalOuterArea = calculatePolygonArea({ points: outerWall.corners.map(c => c.outsidePoint) })

  return (
    <Box p="2">
      <Flex direction="column" gap="3">
        {/* Basic Information */}
        <DataList.Root>
          <DataList.Item>
            <DataList.Label minWidth="88px">Total Inner Perimeter</DataList.Label>
            <DataList.Value>{formatLength(totalInnerPerimeter as Length)}</DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label minWidth="88px">Total Inside Area</DataList.Label>
            <DataList.Value>{(totalInnerArea / (1000 * 1000)).toFixed(2)} m²</DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label minWidth="88px">Total Outer Perimeter</DataList.Label>
            <DataList.Value>{formatLength(totalOuterPerimeter as Length)}</DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label minWidth="88px">Total Overbuilt Area</DataList.Label>
            <DataList.Value>{(totalOuterArea / (1000 * 1000)).toFixed(2)} m²</DataList.Value>
          </DataList.Item>
        </DataList.Root>

        <Box pt="1">
          <PerimeterConstructionPlanModal
            perimeterId={selectedId}
            trigger={
              <Button size="2" style={{ width: '100%' }}>
                View Construction
              </Button>
            }
          />
        </Box>

        {/* Ring Beam Configuration */}
        <Box pt="1" style={{ borderTop: '1px solid var(--gray-6)' }}>
          <Heading size="2" mb="2">
            Ring Beams
          </Heading>

          <Flex direction="column" gap="2">
            {/* Base Ring Beam */}
            <Flex align="center" justify="between" gap="3">
              <Label.Root htmlFor="base-ring-beam">
                <Text size="1" weight="medium" color="gray">
                  Base Plate
                </Text>
              </Label.Root>
              <Select.Root
                value={outerWall.baseRingBeamMethodId || 'none'}
                onValueChange={value => {
                  if (value === 'none') {
                    removePerimeterBaseRingBeam(selectedId)
                  } else {
                    setPerimeterBaseRingBeam(selectedId, value as RingBeamConstructionMethodId)
                  }
                }}
                size="1"
              >
                <Select.Trigger id="base-ring-beam" placeholder="None" style={{ flex: 1, minWidth: 0 }} />
                <Select.Content>
                  <Select.Item value="none">None</Select.Item>
                  {allRingBeamMethods.map(method => (
                    <Select.Item key={method.id} value={method.id}>
                      {method.name}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Flex>

            {/* Base Ring Beam View Construction Button */}
            {outerWall.baseRingBeamMethodId && (
              <RingBeamConstructionPlanModal
                perimeterId={selectedId}
                position="base"
                trigger={
                  <Button size="2" style={{ width: '100%' }}>
                    View Construction
                  </Button>
                }
              />
            )}

            {/* Top Ring Beam */}
            <Flex align="center" justify="between" gap="3">
              <Label.Root htmlFor="top-ring-beam">
                <Text size="1" weight="medium" color="gray">
                  Top Plate
                </Text>
              </Label.Root>
              <Select.Root
                value={outerWall.topRingBeamMethodId || 'none'}
                onValueChange={value => {
                  if (value === 'none') {
                    removePerimeterTopRingBeam(selectedId)
                  } else {
                    setPerimeterTopRingBeam(selectedId, value as RingBeamConstructionMethodId)
                  }
                }}
                size="1"
              >
                <Select.Trigger id="top-ring-beam" placeholder="None" style={{ flex: 1, minWidth: 0 }} />
                <Select.Content>
                  <Select.Item value="none">None</Select.Item>
                  {allRingBeamMethods.map(method => (
                    <Select.Item key={method.id} value={method.id}>
                      {method.name}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Flex>

            {/* Top Ring Beam View Construction Button */}
            {outerWall.topRingBeamMethodId && (
              <RingBeamConstructionPlanModal
                perimeterId={selectedId}
                position="top"
                trigger={
                  <Button size="2" style={{ width: '100%' }}>
                    View Construction
                  </Button>
                }
              />
            )}
          </Flex>
        </Box>
      </Flex>
    </Box>
  )
}
