import { InfoCircledIcon } from '@radix-ui/react-icons'
import * as Label from '@radix-ui/react-label'
import { Box, Callout, Flex, Grid, SegmentedControl, Select, Separator, Text, Tooltip } from '@radix-ui/themes'
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
        <Flex gap="1" align="center">
          <Text size="1" weight="medium" color="gray">
            Type
          </Text>
          <Tooltip content="Single or double post configuration">
            <InfoCircledIcon cursor="help" width={12} height={12} style={{ color: 'var(--gray-9)' }} />
          </Tooltip>
        </Flex>
        <SegmentedControl.Root value={state.type} onValueChange={handleTypeChange} size="2">
          <SegmentedControl.Item value="single">Single</SegmentedControl.Item>
          <SegmentedControl.Item value="double">Double</SegmentedControl.Item>
        </SegmentedControl.Root>
      </Flex>

      {/* Position Selection */}
      <Flex align="center" justify="between" gap="2">
        <Flex gap="1" align="center">
          <Text size="1" weight="medium" color="gray">
            Position
          </Text>
          <Tooltip content="Post position relative to wall center">
            <InfoCircledIcon cursor="help" width={12} height={12} style={{ color: 'var(--gray-9)' }} />
          </Tooltip>
        </Flex>
        <SegmentedControl.Root value={state.position} onValueChange={handlePositionChange} size="2">
          <SegmentedControl.Item value="inside">Inside</SegmentedControl.Item>
          <SegmentedControl.Item value="center">Center</SegmentedControl.Item>
          <SegmentedControl.Item value="outside">Outside</SegmentedControl.Item>
        </SegmentedControl.Root>
      </Flex>

      <Separator size="4" />

      {/* Dimension inputs */}
      <Grid columns="auto min-content auto min-content" rows="1" gap="2" gapX="3" align="center">
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

      <Separator size="4" />

      {/* Material Selection */}
      <Flex direction="column" gap="2">
        <Flex gap="1" align="center">
          <Text size="1" weight="medium" color="gray">
            Post Material
          </Text>
          <Tooltip content="Material for the structural post">
            <InfoCircledIcon cursor="help" width={12} height={12} style={{ color: 'var(--gray-9)' }} />
          </Tooltip>
        </Flex>
        <Select.Root value={state.material} onValueChange={handleMaterialChange} size="2">
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
        <Flex gap="1" align="center">
          <Text size="1" weight="medium" color="gray">
            Infill Material
          </Text>
          <Tooltip content="Material for infill between post sections">
            <InfoCircledIcon cursor="help" width={12} height={12} style={{ color: 'var(--gray-9)' }} />
          </Tooltip>
        </Flex>
        <Select.Root value={state.infillMaterial} onValueChange={handleInfillMaterialChange} size="2">
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
          <Box
            asChild
            style={{
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid var(--gray-6)',
              cursor: 'pointer'
            }}
            onClick={() => {
              tool.setWidth(60)
              tool.setThickness(360)
            }}
          >
            <Flex direction="column" align="center" gap="1">
              <Text size="1" weight="bold">
                Standard
              </Text>
              <Text size="1" color="gray">
                6×36cm
              </Text>
            </Flex>
          </Box>

          <Box
            asChild
            style={{
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid var(--gray-6)',
              cursor: 'pointer'
            }}
            onClick={() => {
              tool.setWidth(80)
              tool.setThickness(360)
            }}
          >
            <Flex direction="column" align="center" gap="1">
              <Text size="1" weight="bold">
                Wide
              </Text>
              <Text size="1" color="gray">
                8×36cm
              </Text>
            </Flex>
          </Box>

          <Box
            asChild
            style={{
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid var(--gray-6)',
              cursor: 'pointer'
            }}
            onClick={() => {
              tool.setWidth(60)
              tool.setThickness(240)
            }}
          >
            <Flex direction="column" align="center" gap="1">
              <Text size="1" weight="bold">
                Thin Wall
              </Text>
              <Text size="1" color="gray">
                6×24cm
              </Text>
            </Flex>
          </Box>

          <Box
            asChild
            style={{
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid var(--gray-6)',
              cursor: 'pointer'
            }}
            onClick={() => {
              tool.setWidth(140)
              tool.setThickness(140)
            }}
          >
            <Flex direction="column" align="center" gap="1">
              <Text size="1" weight="bold">
                Square
              </Text>
              <Text size="1" color="gray">
                14×14cm
              </Text>
            </Flex>
          </Box>
        </Grid>
      </Flex>
    </Flex>
  )
}
