import { Button, Dialog, Flex, Grid, Heading, SegmentedControl, Text } from '@radix-ui/themes'
import { useCallback, useEffect, useMemo, useState } from 'react'

import type { WallAssemblyId } from '@/building/model/ids'
import type { PerimeterReferenceSide } from '@/building/model/model'
import { RingBeamAssemblySelectWithEdit } from '@/construction/config/components/RingBeamAssemblySelectWithEdit'
import { WallAssemblySelectWithEdit } from '@/construction/config/components/WallAssemblySelectWithEdit'
import {
  useDefaultBaseRingBeamAssemblyId,
  useDefaultTopRingBeamAssemblyId,
  useDefaultWallAssemblyId
} from '@/construction/config/store'
import { MeasurementInfo } from '@/editor/components/MeasurementInfo'
import { BaseModal } from '@/shared/components/BaseModal'
import { LengthField } from '@/shared/components/LengthField'

import { PolygonReferencePreview } from './PolygonReferencePreview'
import { RectangularPreset } from './RectangularPreset'
import type { RectangularPresetConfig } from './types'

interface RectangularPresetDialogProps {
  onConfirm: (config: RectangularPresetConfig) => void
  trigger: React.ReactNode
}

export function RectangularPresetDialog({ onConfirm, trigger }: RectangularPresetDialogProps): React.JSX.Element {
  const defaultWallAssemblyId = useDefaultWallAssemblyId()
  const defaultBaseRingBeamAssemblyId = useDefaultBaseRingBeamAssemblyId()
  const defaultTopRingBeamAssemblyId = useDefaultTopRingBeamAssemblyId()
  const preset = useMemo(() => new RectangularPreset(), [])

  // Form state with defaults from config store
  const [config, setConfig] = useState<RectangularPresetConfig>(() => ({
    width: 10000, // 10m default inside width
    length: 7000, // 7m default inside length
    thickness: 420, // 42cm default
    wallAssemblyId: defaultWallAssemblyId,
    baseRingBeamAssemblyId: defaultBaseRingBeamAssemblyId,
    topRingBeamAssemblyId: defaultTopRingBeamAssemblyId,
    referenceSide: 'inside'
  }))

  // Update config when default config changes
  useEffect(() => setConfig(prev => ({ ...prev, wallAssemblyId: defaultWallAssemblyId })), [defaultWallAssemblyId])
  useEffect(
    () => setConfig(prev => ({ ...prev, baseRingBeamAssemblyId: defaultBaseRingBeamAssemblyId })),
    [defaultBaseRingBeamAssemblyId]
  )
  useEffect(
    () => setConfig(prev => ({ ...prev, topRingBeamAssemblyId: defaultTopRingBeamAssemblyId })),
    [defaultTopRingBeamAssemblyId]
  )

  const effectiveInteriorWidth = config.referenceSide === 'inside' ? config.width : config.width - 2 * config.thickness
  const effectiveInteriorLength =
    config.referenceSide === 'inside' ? config.length : config.length - 2 * config.thickness

  const isValid =
    effectiveInteriorWidth > 0 &&
    effectiveInteriorLength > 0 &&
    config.thickness > 0 &&
    (config.wallAssemblyId?.length ?? 0) > 0

  const handleConfirm = useCallback(() => {
    if (isValid) {
      onConfirm(config)
    }
  }, [config, isValid, onConfirm])

  const referencePoints = useMemo(() => preset.getPolygonPoints(config), [preset, config.width, config.length])

  return (
    <BaseModal title="Rectangular Perimeter" trigger={trigger} size="3" maxWidth="700px">
      <Flex direction="column" gap="4">
        <Grid columns="1fr auto" gap="5">
          {/* Left Column - Properties in 2x3 Grid */}
          <Flex direction="column" gap="3">
            <Heading size="2" weight="medium">
              Configuration
            </Heading>

            <Grid columns="2" gapY="3" gapX="2">
              {/* Width */}
              <Flex direction="column" gap="1">
                <Text size="1" color="gray">
                  Width
                </Text>
                <LengthField
                  value={config.width}
                  onChange={value => setConfig(prev => ({ ...prev, width: value }))}
                  min={1000}
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
                  min={1000}
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
          <Flex direction="column" gap="3">
            <Heading align="center" size="2" weight="medium">
              Preview
            </Heading>

            {/* Reference Side */}
            <Flex direction="column" gap="1">
              <Text size="1" color="gray">
                Reference Side
              </Text>
              <SegmentedControl.Root
                size="1"
                value={config.referenceSide}
                onValueChange={value =>
                  setConfig(prev => ({ ...prev, referenceSide: value as PerimeterReferenceSide }))
                }
              >
                <SegmentedControl.Item value="inside">Inside</SegmentedControl.Item>
                <SegmentedControl.Item value="outside">Outside</SegmentedControl.Item>
              </SegmentedControl.Root>
            </Flex>

            <PolygonReferencePreview
              referencePoints={referencePoints}
              thickness={config.thickness}
              referenceSide={config.referenceSide}
            />
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
