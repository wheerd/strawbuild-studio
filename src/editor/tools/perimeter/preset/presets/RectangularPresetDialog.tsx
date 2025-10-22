import { Button, Dialog, Flex, Grid, Heading, Text } from '@radix-ui/themes'
import { useCallback, useEffect, useState } from 'react'

import type { WallAssemblyId } from '@/building/model/ids'
import { RingBeamAssemblySelectWithEdit } from '@/construction/config/components/RingBeamAssemblySelectWithEdit'
import { WallAssemblySelectWithEdit } from '@/construction/config/components/WallAssemblySelectWithEdit'
import { useConfigActions } from '@/construction/config/store'
import { MeasurementInfo } from '@/editor/components/MeasurementInfo'
import { BaseModal } from '@/shared/components/BaseModal'
import { LengthField } from '@/shared/components/LengthField'
import '@/shared/geometry'
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

export function RectangularPresetDialog({
  onConfirm,
  initialConfig,
  trigger
}: RectangularPresetDialogProps): React.JSX.Element {
  const configStore = useConfigActions()

  // Form state with defaults from config store
  const [config, setConfig] = useState<RectangularPresetConfig>(() => ({
    width: 10000, // 10m default inside width
    length: 7000, // 7m default inside length
    thickness: 440, // 44cm default
    wallAssemblyId: configStore.getDefaultWallAssemblyId(),
    baseRingBeamAssemblyId: configStore.getDefaultBaseRingBeamAssemblyId(),
    topRingBeamAssemblyId: configStore.getDefaultTopRingBeamAssemblyId(),
    ...initialConfig
  }))

  // Update config when initial config changes
  useEffect(() => {
    if (initialConfig) {
      setConfig(prev => ({ ...prev, ...initialConfig }))
    }
  }, [initialConfig])

  const handleConfirm = useCallback(() => {
    if (config.width > 0 && config.length > 0 && config.thickness > 0 && config.wallAssemblyId) {
      onConfirm(config)
    }
  }, [config, onConfirm])

  const isValid = config.width > 0 && config.length > 0 && config.thickness > 0 && config.wallAssemblyId

  return (
    <BaseModal title="Rectangular Perimeter" trigger={trigger} size="3" maxWidth="600px">
      <Flex direction="column" gap="4">
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
                  min={2000}
                  max={20000}
                  step={100}
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
                  min={2000}
                  max={20000}
                  step={100}
                  unit="m"
                  precision={3}
                  size="1"
                  style={{ width: '100%' }}
                />
              </Flex>

              {/* Wall Thickness */}
              <Flex direction="column" gap="1">
                <Flex align="center" gap="1">
                  <Text size="1" color="gray">
                    Wall Thickness
                  </Text>
                  <MeasurementInfo highlightedMeasurement="totalWallThickness" showFinishedSides />
                </Flex>
                <LengthField
                  value={config.thickness}
                  onChange={value => setConfig(prev => ({ ...prev, thickness: value }))}
                  min={50}
                  max={1500}
                  step={10}
                  unit="cm"
                  size="1"
                  style={{ width: '100%' }}
                />
              </Flex>

              {/* Wall Assembly */}
              <Flex direction="column" gap="1">
                <Flex align="center" gap="1">
                  <Text size="1" color="gray">
                    Wall Assembly
                  </Text>
                  {config.wallAssemblyId && <MeasurementInfo highlightedAssembly="wallAssembly" />}
                </Flex>
                <WallAssemblySelectWithEdit
                  value={config.wallAssemblyId ?? undefined}
                  onValueChange={(value: WallAssemblyId) => {
                    setConfig(prev => ({ ...prev, wallAssemblyId: value }))
                  }}
                  placeholder="Select assembly"
                  size="1"
                />
              </Flex>

              {/* Base Plate */}
              <Flex direction="column" gap="1">
                <Flex align="center" gap="1">
                  <Text size="1" color="gray">
                    Base Plate
                  </Text>
                  <MeasurementInfo highlightedPart="basePlate" />
                </Flex>
                <RingBeamAssemblySelectWithEdit
                  value={config.baseRingBeamAssemblyId}
                  onValueChange={value => {
                    setConfig(prev => ({ ...prev, baseRingBeamAssemblyId: value }))
                  }}
                  placeholder="None"
                  size="1"
                  allowNone
                />
              </Flex>

              {/* Top Plate */}
              <Flex direction="column" gap="1">
                <Flex align="center" gap="1">
                  <Text size="1" color="gray">
                    Top Plate
                  </Text>
                  <MeasurementInfo highlightedPart="topPlate" />
                </Flex>
                <RingBeamAssemblySelectWithEdit
                  value={config.topRingBeamAssemblyId}
                  onValueChange={value => {
                    setConfig(prev => ({ ...prev, topRingBeamAssemblyId: value }))
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
    </BaseModal>
  )
}
