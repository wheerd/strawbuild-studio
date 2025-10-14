import { Cross2Icon } from '@radix-ui/react-icons'
import { Button, Dialog, Flex, Grid, Heading, IconButton, Text } from '@radix-ui/themes'
import { useCallback, useEffect, useState } from 'react'

import type { PerimeterConstructionMethodId } from '@/building/model/ids'
import { PerimeterMethodSelectWithEdit } from '@/construction/config/components/PerimeterMethodSelectWithEdit'
import { RingBeamMethodSelectWithEdit } from '@/construction/config/components/RingBeamMethodSelectWithEdit'
import { useConfigActions } from '@/construction/config/store'
import { LengthField } from '@/shared/components/LengthField'
import { createLength } from '@/shared/geometry'
import { formatLength } from '@/shared/utils/formatLength'

import type { RectangularPresetConfig } from './types'

interface RectangularPresetDialogProps {
  onConfirm: (config: RectangularPresetConfig) => void
  initialConfig?: Partial<RectangularPresetConfig>
  trigger: React.ReactNode
}

/**
 * Preview component showing nested rectangles to visualize thickness
 * Shows inside dimensions (interior space) vs outside perimeter
 */
function RectangularPreview({ config }: { config: RectangularPresetConfig }) {
  const insideWidth = config.width
  const insideLength = config.length
  const outsideWidth = insideWidth + 2 * config.thickness
  const outsideLength = insideLength + 2 * config.thickness

  // Scale for display (fit in preview area)
  const maxDimension = Math.max(outsideWidth, outsideLength)
  const scale = 200 / maxDimension

  const displayOutsideWidth = outsideWidth * scale
  const displayOutsideLength = outsideLength * scale
  const displayInsideWidth = insideWidth * scale
  const displayInsideLength = insideLength * scale
  const scaledThickness = config.thickness * scale

  return (
    <Flex direction="column" align="center">
      <svg
        width={displayOutsideWidth}
        height={displayOutsideLength}
        viewBox={`0 0 ${displayOutsideWidth} ${displayOutsideLength}`}
        className="overflow-visible"
      >
        {/* Outer rectangle (perimeter walls) */}
        <rect
          width={displayOutsideWidth}
          height={displayOutsideLength}
          fill="var(--gray-3)"
          stroke="var(--gray-8)"
          strokeWidth="1"
          strokeDasharray="3,3"
        />

        {/* Inner rectangle (interior space) */}
        <rect
          x={scaledThickness}
          y={scaledThickness}
          width={displayInsideWidth}
          height={displayInsideLength}
          fill="var(--accent-3)"
          stroke="var(--accent-8)"
          strokeWidth="2"
        />

        {/* Dimension labels */}
        <text
          fill="var(--gray-12)"
          className="font-mono"
          x={displayOutsideWidth / 2}
          y={12 + scaledThickness}
          textAnchor="middle"
          fontSize={12}
          style={{
            filter: 'drop-shadow(1px 1px 2px var(--gray-1))'
          }}
        >
          {formatLength(insideWidth)}
        </text>
        <text
          fill="var(--gray-12)"
          className="font-mono"
          x={10 + scaledThickness}
          y={displayOutsideLength / 2}
          textAnchor="middle"
          fontSize={12}
          transform={`rotate(-90, ${12 + scaledThickness}, ${displayOutsideLength / 2})`}
          style={{
            filter: 'drop-shadow(1px 1px 2px var(--gray-1))'
          }}
        >
          {formatLength(insideLength)}
        </text>
      </svg>
    </Flex>
  )
}

function RectangularPresetDialogContent({
  onConfirm,
  initialConfig
}: Omit<RectangularPresetDialogProps, 'isOpen' | 'trigger'>): React.JSX.Element {
  const configStore = useConfigActions()

  // Form state with defaults from config store
  const [config, setConfig] = useState<RectangularPresetConfig>(() => ({
    width: createLength(10000), // 10m default inside width
    length: createLength(7000), // 7m default inside length
    thickness: createLength(440), // 44cm default
    constructionMethodId: configStore.getDefaultPerimeterMethodId(),
    baseRingBeamMethodId: configStore.getDefaultBaseRingBeamMethodId(),
    topRingBeamMethodId: configStore.getDefaultTopRingBeamMethodId(),
    ...initialConfig
  }))

  // Update config when initial config changes
  useEffect(() => {
    if (initialConfig) {
      setConfig(prev => ({ ...prev, ...initialConfig }))
    }
  }, [initialConfig])

  const handleConfirm = useCallback(() => {
    if (config.width > 0 && config.length > 0 && config.thickness > 0 && config.constructionMethodId) {
      onConfirm(config)
    }
  }, [config, onConfirm])

  const isValid = config.width > 0 && config.length > 0 && config.thickness > 0 && config.constructionMethodId

  return (
    <Dialog.Content
      aria-describedby={undefined}
      size="3"
      maxWidth="600px"
      onEscapeKeyDown={e => {
        e.stopPropagation()
      }}
    >
      <Flex direction="column" gap="4">
        <Dialog.Title>
          <Flex justify="between" align="center">
            Rectangular Perimeter
            <Dialog.Close>
              <IconButton variant="ghost" size="1">
                <Cross2Icon />
              </IconButton>
            </Dialog.Close>
          </Flex>
        </Dialog.Title>

        <Grid columns="2" gap="4">
          {/* Left Column - Properties in 2x3 Grid */}
          <Flex direction="column" gap="3">
            <Heading size="2" weight="medium">
              Configuration
            </Heading>

            <Grid columns="2" gap="3">
              {/* Width */}
              <Flex direction="column" gap="1">
                <Text size="1" color="gray">
                  Width
                </Text>
                <LengthField
                  value={config.width}
                  onChange={value => setConfig(prev => ({ ...prev, width: value }))}
                  min={createLength(2000)}
                  max={createLength(20000)}
                  step={createLength(100)}
                  unit="m"
                  precision={3}
                  size="1"
                  style={{ width: '100%' }}
                />
              </Flex>

              {/* Length */}
              <Flex direction="column" gap="1">
                <Text size="1" color="gray">
                  Length
                </Text>
                <LengthField
                  value={config.length}
                  onChange={value => setConfig(prev => ({ ...prev, length: value }))}
                  min={createLength(2000)}
                  max={createLength(20000)}
                  step={createLength(100)}
                  unit="m"
                  precision={3}
                  size="1"
                  style={{ width: '100%' }}
                />
              </Flex>

              {/* Wall Thickness */}
              <Flex direction="column" gap="1">
                <Text size="1" color="gray">
                  Wall Thickness
                </Text>
                <LengthField
                  value={config.thickness}
                  onChange={value => setConfig(prev => ({ ...prev, thickness: value }))}
                  min={createLength(50)}
                  max={createLength(1500)}
                  step={createLength(10)}
                  unit="cm"
                  size="1"
                  style={{ width: '100%' }}
                />
              </Flex>

              {/* Construction Method */}
              <Flex direction="column" gap="1">
                <Text size="1" color="gray">
                  Construction Method
                </Text>
                <PerimeterMethodSelectWithEdit
                  value={config.constructionMethodId ?? undefined}
                  onValueChange={(value: PerimeterConstructionMethodId) => {
                    setConfig(prev => ({ ...prev, constructionMethodId: value }))
                  }}
                  placeholder="Select method"
                  size="1"
                />
              </Flex>

              {/* Base Plate */}
              <Flex direction="column" gap="1">
                <Text size="1" color="gray">
                  Base Plate
                </Text>
                <RingBeamMethodSelectWithEdit
                  value={config.baseRingBeamMethodId}
                  onValueChange={value => {
                    setConfig(prev => ({ ...prev, baseRingBeamMethodId: value }))
                  }}
                  placeholder="None"
                  size="1"
                  allowNone
                />
              </Flex>

              {/* Top Plate */}
              <Flex direction="column" gap="1">
                <Text size="1" color="gray">
                  Top Plate
                </Text>
                <RingBeamMethodSelectWithEdit
                  value={config.topRingBeamMethodId}
                  onValueChange={value => {
                    setConfig(prev => ({ ...prev, topRingBeamMethodId: value }))
                  }}
                  placeholder="None"
                  size="1"
                  allowNone
                />
              </Flex>
            </Grid>
          </Flex>

          {/* Right Column - Preview */}
          <Flex direction="column" gap="2">
            <Heading align="center" size="2" weight="medium">
              Preview
            </Heading>
            <RectangularPreview config={config} />
          </Flex>
        </Grid>

        {/* Actions */}
        <Flex justify="end" gap="3" mt="4">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </Dialog.Close>
          <Dialog.Close>
            <Button onClick={handleConfirm} disabled={!isValid}>
              Confirm
            </Button>
          </Dialog.Close>
        </Flex>
      </Flex>
    </Dialog.Content>
  )
}

export function RectangularPresetDialog({
  onConfirm,
  initialConfig,
  trigger
}: RectangularPresetDialogProps): React.JSX.Element {
  return (
    <Dialog.Root>
      <Dialog.Trigger>{trigger}</Dialog.Trigger>
      <RectangularPresetDialogContent onConfirm={onConfirm} initialConfig={initialConfig} />
    </Dialog.Root>
  )
}
