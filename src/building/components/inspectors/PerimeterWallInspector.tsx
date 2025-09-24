import { useCallback, useMemo } from 'react'
import {
  Flex,
  Text,
  Select,
  TextField,
  Heading,
  Button,
  Grid,
  Card,
  Callout,
  DataList,
  Separator
} from '@radix-ui/themes'
import * as Label from '@radix-ui/react-label'
import { useModelActions, usePerimeterById } from '@/building/store'
import { createLength, type Length } from '@/shared/geometry'
import { useDebouncedNumericInput } from '@/shared/hooks/useDebouncedInput'
import { formatLength } from '@/shared/utils/formatLength'
import type { PerimeterWallId, PerimeterId, PerimeterConstructionMethodId } from '@/shared/types/ids'
import { usePerimeterConstructionMethods, usePerimeterConstructionMethodById } from '@/construction/config/store'
import { WallConstructionPlanModal } from '@/construction/components/WallConstructionPlan'
import { constructInfillWall, type InfillConstructionConfig } from '@/construction/walls'

interface PerimeterWallInspectorProps {
  perimeterId: PerimeterId
  wallId: PerimeterWallId
}

export function PerimeterWallInspector({ perimeterId, wallId }: PerimeterWallInspectorProps): React.JSX.Element {
  const allPerimeterMethods = usePerimeterConstructionMethods()
  const {
    getStoreyById,
    updatePerimeterWallThickness: updateOuterWallThickness,
    updatePerimeterWallConstructionMethod: updateOuterWallConstructionMethod
  } = useModelActions()

  const outerWall = usePerimeterById(perimeterId)

  // Use useMemo to find wall within the wall object
  const wall = useMemo(() => {
    return outerWall?.walls.find(s => s.id === wallId)
  }, [outerWall, wallId])

  // Debounced thickness input handler
  const thicknessInput = useDebouncedNumericInput(
    wall?.thickness || 0,
    useCallback(
      (value: number) => {
        updateOuterWallThickness(perimeterId, wallId, createLength(value))
      },
      [updateOuterWallThickness, perimeterId, wallId]
    ),
    {
      debounceMs: 300,
      min: 50,
      max: 1500,
      step: 10
    }
  )

  // If wall not found, show error
  if (!wall || !outerWall) {
    return (
      <Callout.Root color="red">
        <Callout.Text>
          <Text weight="bold">Wall Not Found</Text>
          <br />
          Wall with ID {wallId} could not be found.
        </Callout.Text>
      </Callout.Root>
    )
  }

  const storey = getStoreyById(outerWall.storeyId)

  // Get construction method for this wall
  const constructionMethod = wall?.constructionMethodId
    ? usePerimeterConstructionMethodById(wall.constructionMethodId)
    : null

  const constructionPlan = useMemo(() => {
    if (!outerWall || !wall || !storey || !constructionMethod) return null

    // For now, only support infill construction until other types are implemented
    if (constructionMethod.config.type === 'infill') {
      return constructInfillWall(
        wall,
        outerWall,
        storey.height,
        constructionMethod.config as InfillConstructionConfig,
        constructionMethod.layers
      )
    }

    // TODO: Add support for other construction types
    return null
  }, [wall, outerWall, storey, constructionMethod])

  return (
    <Flex direction="column" gap="4">
      {/* Basic Properties */}
      <Flex direction="column" gap="3">
        {/* Construction Method */}
        <Flex align="center" justify="between" gap="3">
          <Label.Root htmlFor="contruction-method">
            <Text size="1" weight="medium" color="gray">
              Construction Method
            </Text>
          </Label.Root>
          <Select.Root
            value={wall.constructionMethodId || ''}
            onValueChange={(value: PerimeterConstructionMethodId) => {
              updateOuterWallConstructionMethod(perimeterId, wallId, value)
            }}
            size="1"
          >
            <Select.Trigger id="contruction-method" placeholder="Select method" style={{ flex: 1, minWidth: 0 }} />
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
          <Label.Root htmlFor="wall-thickness">
            <Text size="1" weight="medium" color="gray">
              Thickness
            </Text>
          </Label.Root>
          <TextField.Root
            id="wall-thickness"
            type="number"
            value={thicknessInput.value.toString()}
            onChange={e => thicknessInput.handleChange(e.target.value)}
            onBlur={thicknessInput.handleBlur}
            onKeyDown={thicknessInput.handleKeyDown}
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

      <Separator size="4" />

      {/* Measurements */}
      <Flex direction="column" gap="2">
        <Heading size="2">Measurements</Heading>
        <DataList.Root size="1">
          <DataList.Item>
            <DataList.Label minWidth="88px">Inside Length</DataList.Label>
            <DataList.Value>{formatLength(wall.insideLength)}</DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label minWidth="88px">Outside Length</DataList.Label>
            <DataList.Value>{formatLength(wall.outsideLength)}</DataList.Value>
          </DataList.Item>
          {constructionMethod ? (
            <>
              <DataList.Item>
                <DataList.Label minWidth="88px">Inside Layers Thickness</DataList.Label>
                <DataList.Value>{formatLength(constructionMethod.layers.insideThickness)}</DataList.Value>
              </DataList.Item>
              <DataList.Item>
                <DataList.Label minWidth="88px">Outside Layers Thickness</DataList.Label>
                <DataList.Value>{formatLength(constructionMethod.layers.outsideThickness)}</DataList.Value>
              </DataList.Item>
              <DataList.Item>
                <DataList.Label minWidth="88px">Construction Thickness</DataList.Label>
                <DataList.Value>
                  {formatLength(
                    (wall.thickness -
                      constructionMethod.layers.outsideThickness -
                      constructionMethod.layers.insideThickness) as Length
                  )}
                </DataList.Value>
              </DataList.Item>
            </>
          ) : (
            <></>
          )}
        </DataList.Root>
      </Flex>

      <Separator size="4" />

      {/* Openings */}
      <Flex direction="column" gap="2">
        <Heading size="2">Openings</Heading>
        <Grid columns="3" gap="2">
          <Card size="1" variant="surface">
            <Flex direction="column" gap="0" m="-1">
              <Text align="center" size="2" weight="bold">
                {wall.openings.filter(o => o.type === 'door').length}
              </Text>
              <Text align="center" size="1" color="gray">
                Doors
              </Text>
            </Flex>
          </Card>
          <Card size="1" variant="surface">
            <Flex direction="column" gap="0" m="-1">
              <Text align="center" size="2" weight="bold">
                {wall.openings.filter(o => o.type === 'window').length}
              </Text>
              <Text align="center" size="1" color="gray">
                Windows
              </Text>
            </Flex>
          </Card>
          <Card size="1" variant="surface">
            <Flex direction="column" gap="0" m="-1">
              <Text align="center" size="2" weight="bold">
                {wall.openings.filter(o => o.type === 'passage').length}
              </Text>
              <Text align="center" size="1" color="gray">
                Passages
              </Text>
            </Flex>
          </Card>
        </Grid>
      </Flex>

      <Separator size="4" />

      {/* Actions */}
      <Flex direction="column" gap="2">
        {constructionPlan && (
          <WallConstructionPlanModal plan={constructionPlan}>
            <Button size="1">View Construction Plan</Button>
          </WallConstructionPlanModal>
        )}
      </Flex>
    </Flex>
  )
}
