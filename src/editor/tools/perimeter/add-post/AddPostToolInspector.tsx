import { InfoCircledIcon } from '@radix-ui/react-icons'
import * as Label from '@radix-ui/react-label'
import { Button, Callout, Flex, Grid, SegmentedControl, Select, Separator, Text } from '@radix-ui/themes'
import { useCallback } from 'react'

import type { WallPostType } from '@/building/model/model'
import { DEFAULT_MATERIALS, type MaterialId } from '@/construction/materials/material'
import { useReactiveTool } from '@/editor/tools/system/hooks/useReactiveTool'
import type { ToolInspectorProps } from '@/editor/tools/system/types'
import { LengthField } from '@/shared/components/LengthField'

import type { AddPostTool } from './AddPostTool'

export function AddPostToolInspector({ tool }: ToolInspectorProps<AddPostTool>): React.JSX.Element {
  return <AddPostToolInspectorImpl tool={tool} />
}

interface AddPostToolInspectorImplProps {
  tool: AddPostTool
}

function AddPostToolInspectorImpl({ tool }: AddPostToolInspectorImplProps): React.JSX.Element {
  const { state } = useReactiveTool(tool)

  // Get available materials (filter for structural materials)
  const availableMaterials = Object.values(DEFAULT_MATERIALS).filter(
    m => m.type === 'dimensional' || m.type === 'sheet'
  )

  // Event handlers
  const handleTypeChange = useCallback(
    (newType: WallPostType) => {
      tool.setPostType(newType)
    },
    [tool]
  )

  const handlePositionChange = useCallback(
    (newPosition: 'center' | 'inside' | 'outside') => {
      tool.setPosition(newPosition)
    },
    [tool]
  )

  const handleMaterialChange = useCallback(
    (materialId: MaterialId) => {
      tool.setMaterial(materialId)
    },
    [tool]
  )

  const handleInfillMaterialChange = useCallback(
    (materialId: MaterialId) => {
      tool.setInfillMaterial(materialId)
    },
    [tool]
  )

  return (
    <Flex direction="column" gap="4">
      {/* Informational Note */}
      <Callout.Root color="blue">
        <Callout.Icon>
          <InfoCircledIcon />
        </Callout.Icon>
        <Callout.Text>
          <Text size="1">
            Click on a wall to place a post. Configure dimensions, type, position, and materials before placement.
          </Text>
        </Callout.Text>
      </Callout.Root>

      {/* Type Selection */}
      <Flex align="center" justify="between" gap="2">
        <Text size="1" weight="medium" color="gray">
          Type
        </Text>
        <SegmentedControl.Root value={state.type} onValueChange={handleTypeChange} size="1">
          <SegmentedControl.Item value="single">Single</SegmentedControl.Item>
          <SegmentedControl.Item value="double">Double</SegmentedControl.Item>
        </SegmentedControl.Root>
      </Flex>

      {/* Position Selection */}
      <Flex align="center" justify="between" gap="2">
        <Text size="1" weight="medium" color="gray">
          Position
        </Text>
        <SegmentedControl.Root value={state.position} onValueChange={handlePositionChange} size="1">
          <SegmentedControl.Item value="inside">Inside</SegmentedControl.Item>
          <SegmentedControl.Item value="center">Center</SegmentedControl.Item>
          <SegmentedControl.Item value="outside">Outside</SegmentedControl.Item>
        </SegmentedControl.Root>
      </Flex>

      {/* Dimension inputs */}
      <Grid columns="auto 1fr auto 1fr" rows="1" gap="2" gapX="3" align="center">
        {/* Width Label */}
        <Label.Root htmlFor="post-width">
          <Text size="1" weight="medium" color="gray">
            Width
          </Text>
        </Label.Root>

        {/* Width Input */}
        <LengthField
          value={state.width}
          onCommit={value => tool.setWidth(value)}
          unit="cm"
          min={10}
          max={500}
          step={10}
          size="1"
          style={{ width: '80px' }}
        />

        {/* Thickness Label */}
        <Label.Root htmlFor="post-thickness">
          <Text size="1" weight="medium" color="gray">
            Thickness
          </Text>
        </Label.Root>

        {/* Thickness Input */}
        <LengthField
          value={state.thickness}
          onCommit={value => tool.setThickness(value)}
          unit="cm"
          min={50}
          max={1000}
          step={10}
          size="1"
          style={{ width: '80px' }}
        />
      </Grid>

      {/* Material Selection */}
      <Flex direction="column" gap="2">
        <Text size="1" weight="medium" color="gray">
          Post Material
        </Text>
        <Select.Root value={state.material} onValueChange={handleMaterialChange} size="1">
          <Select.Trigger />
          <Select.Content>
            {availableMaterials.map(material => (
              <Select.Item key={material.id} value={material.id}>
                {material.name}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      </Flex>

      {/* Infill Material Selection */}
      <Flex direction="column" gap="2">
        <Text size="1" weight="medium" color="gray">
          Infill Material
        </Text>
        <Select.Root value={state.infillMaterial} onValueChange={handleInfillMaterialChange} size="1">
          <Select.Trigger />
          <Select.Content>
            {availableMaterials.map(material => (
              <Select.Item key={material.id} value={material.id}>
                {material.name}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      </Flex>

      <Separator size="4" />

      {/* Quick presets */}
      <Flex direction="column" gap="2">
        <Text size="1" weight="medium" color="gray">
          Quick Presets
        </Text>
        <Grid columns="2" gap="2">
          <Button
            size="1"
            variant="surface"
            onClick={() => {
              tool.setPostType('single')
              tool.setWidth(60)
              tool.setThickness(360)
            }}
          >
            6×36cm Single
          </Button>
          <Button
            size="1"
            variant="surface"
            onClick={() => {
              tool.setPostType('double')
              tool.setWidth(60)
              tool.setThickness(120)
            }}
          >
            6×12cm Double
          </Button>
          <Button
            size="1"
            variant="surface"
            onClick={() => {
              tool.setPostType('single')
              tool.setWidth(140)
              tool.setThickness(140)
            }}
          >
            14×14cm Single
          </Button>
          <Button
            size="1"
            variant="surface"
            onClick={() => {
              tool.setPostType('double')
              tool.setWidth(140)
              tool.setThickness(140)
            }}
          >
            14×14cm Double
          </Button>
        </Grid>
      </Flex>
    </Flex>
  )
}
