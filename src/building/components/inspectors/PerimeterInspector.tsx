import { ExclamationTriangleIcon } from '@radix-ui/react-icons'
import * as Label from '@radix-ui/react-label'
import { Box, Button, Callout, DataList, Flex, Heading, Select, Text, TextField, Tooltip } from '@radix-ui/themes'
import React, { useCallback, useMemo } from 'react'

import type { PerimeterConstructionMethodId, PerimeterId, RingBeamConstructionMethodId } from '@/building/model/ids'
import type { PerimeterWall } from '@/building/model/model'
import { useModelActions, usePerimeterById } from '@/building/store'
import { PerimeterConstructionPlanModal } from '@/construction/components/PerimeterConstructionPlan'
import { RingBeamConstructionPlanModal } from '@/construction/components/RingBeamConstructionPlan'
import { usePerimeterConstructionMethods, useRingBeamConstructionMethods } from '@/construction/config/store'
import { type Length, calculatePolygonArea, createLength } from '@/shared/geometry'
import { useDebouncedNumericInput } from '@/shared/hooks/useDebouncedInput'
import { formatLength } from '@/shared/utils/formatLength'

interface PerimeterInspectorProps {
  selectedId: PerimeterId
}

interface MixedState<T> {
  isMixed: boolean
  value: T | null
}

function detectMixedConstructionMethod(walls: PerimeterWall[]): MixedState<PerimeterConstructionMethodId> {
  if (walls.length === 0) return { isMixed: false, value: null }

  const firstMethod = walls[0].constructionMethodId
  const allSame = walls.every(wall => wall.constructionMethodId === firstMethod)

  return {
    isMixed: !allSame,
    value: allSame ? firstMethod : null
  }
}

function detectMixedThickness(walls: PerimeterWall[]): MixedState<Length> {
  if (walls.length === 0) return { isMixed: false, value: null }

  const firstThickness = walls[0].thickness
  const allSame = walls.every(wall => wall.thickness === firstThickness)

  return {
    isMixed: !allSame,
    value: allSame ? firstThickness : null
  }
}

interface MixedStateIndicatorProps {
  children: React.ReactNode
}

function MixedStateIndicator({ children }: MixedStateIndicatorProps) {
  return (
    <Flex align="center" gap="2">
      {children}
      <Tooltip content="Different values across walls. Changing this will update all walls.">
        <ExclamationTriangleIcon width={14} height={14} style={{ color: 'var(--amber-9)' }} />
      </Tooltip>
    </Flex>
  )
}

export function PerimeterInspector({ selectedId }: PerimeterInspectorProps): React.JSX.Element {
  // Get perimeter data from model store
  const {
    setPerimeterBaseRingBeam,
    setPerimeterTopRingBeam,
    removePerimeterBaseRingBeam,
    removePerimeterTopRingBeam,
    updateAllPerimeterWallsConstructionMethod,
    updateAllPerimeterWallsThickness
  } = useModelActions()
  const perimeter = usePerimeterById(selectedId)

  // Get construction methods from config store
  const allRingBeamMethods = useRingBeamConstructionMethods()
  const allPerimeterMethods = usePerimeterConstructionMethods()

  // Mixed state detection
  const constructionMethodState = useMemo(
    () => (perimeter ? detectMixedConstructionMethod(perimeter.walls) : { isMixed: false, value: null }),
    [perimeter?.walls]
  )

  const thicknessState = useMemo(
    () => (perimeter ? detectMixedThickness(perimeter.walls) : { isMixed: false, value: null }),
    [perimeter?.walls]
  )

  // Create debounced thickness input for perimeter
  const perimeterThicknessInput = useDebouncedNumericInput(
    thicknessState.isMixed ? 0 : thicknessState.value || 0,
    useCallback(
      (value: number) => {
        updateAllPerimeterWallsThickness(selectedId, createLength(value))
      },
      [updateAllPerimeterWallsThickness, selectedId]
    ),
    {
      debounceMs: 300,
      min: 50,
      max: 1500,
      step: 10
    }
  )

  // If perimeter not found, show error
  if (!perimeter) {
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

  const totalInnerPerimeter = perimeter.walls.reduce((l, s) => l + s.insideLength, 0)
  const totalOuterPerimeter = perimeter.walls.reduce((l, s) => l + s.outsideLength, 0)
  const totalInnerArea = calculatePolygonArea({ points: perimeter.corners.map(c => c.insidePoint) })
  const totalOuterArea = calculatePolygonArea({ points: perimeter.corners.map(c => c.outsidePoint) })

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

        {/* Wall Configuration */}
        <Box pt="1" style={{ borderTop: '1px solid var(--gray-6)' }}>
          <Heading size="2" mb="2">
            Wall Configuration
          </Heading>

          <Flex direction="column" gap="2">
            {/* Construction Method */}
            <Flex align="center" justify="between" gap="3">
              <Label.Root htmlFor="perimeter-construction-method">
                {constructionMethodState.isMixed ? (
                  <MixedStateIndicator>
                    <Text size="1" weight="medium" color="gray">
                      Construction Method
                    </Text>
                  </MixedStateIndicator>
                ) : (
                  <Text size="1" weight="medium" color="gray">
                    Construction Method
                  </Text>
                )}
              </Label.Root>
              <Select.Root
                value={constructionMethodState.isMixed ? '' : constructionMethodState.value || ''}
                onValueChange={(value: PerimeterConstructionMethodId) => {
                  updateAllPerimeterWallsConstructionMethod(selectedId, value)
                }}
                size="1"
              >
                <Select.Trigger
                  id="perimeter-construction-method"
                  placeholder={constructionMethodState.isMixed ? 'Mixed' : 'Select method'}
                  style={{ flex: 1, minWidth: 0 }}
                />
                <Select.Content>
                  {allPerimeterMethods.map(method => (
                    <Select.Item key={method.id} value={method.id}>
                      {method.name}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Flex>

            {/* Thickness Input */}
            <Flex align="center" justify="between" gap="3">
              <Label.Root htmlFor="perimeter-thickness">
                {thicknessState.isMixed ? (
                  <MixedStateIndicator>
                    <Text size="1" weight="medium" color="gray">
                      Wall Thickness
                    </Text>
                  </MixedStateIndicator>
                ) : (
                  <Text size="1" weight="medium" color="gray">
                    Wall Thickness
                  </Text>
                )}
              </Label.Root>
              <TextField.Root
                id="perimeter-thickness"
                type="number"
                value={thicknessState.isMixed ? '' : perimeterThicknessInput.value.toString()}
                placeholder={thicknessState.isMixed ? 'Mixed' : undefined}
                onChange={e => perimeterThicknessInput.handleChange(e.target.value)}
                onBlur={perimeterThicknessInput.handleBlur}
                onKeyDown={perimeterThicknessInput.handleKeyDown}
                min="50"
                max="1500"
                step="10"
                size="1"
                style={{ width: '5rem', textAlign: 'right' }}
              >
                <TextField.Slot side="right" pl="1">
                  mm
                </TextField.Slot>
              </TextField.Root>
            </Flex>
          </Flex>
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
                value={perimeter.baseRingBeamMethodId || 'none'}
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

            {/* Top Ring Beam */}
            <Flex align="center" justify="between" gap="3">
              <Label.Root htmlFor="top-ring-beam">
                <Text size="1" weight="medium" color="gray">
                  Top Plate
                </Text>
              </Label.Root>
              <Select.Root
                value={perimeter.topRingBeamMethodId || 'none'}
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

            {/* Ring Beam View Construction Button */}
            {(perimeter.topRingBeamMethodId || perimeter.baseRingBeamMethodId) && (
              <RingBeamConstructionPlanModal
                perimeterId={selectedId}
                trigger={
                  <Button size="1" style={{ width: '100%' }}>
                    View Ring Beam Construction
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
