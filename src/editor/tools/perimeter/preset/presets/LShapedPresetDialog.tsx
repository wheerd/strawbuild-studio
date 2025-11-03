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

import { LShape0Icon, LShape90Icon, LShape180Icon, LShape270Icon } from './Icons'
import { LShapedPreset } from './LShapedPreset'
import { PolygonReferencePreview } from './PolygonReferencePreview'
import type { LShapedPresetConfig } from './types'

interface LShapedPresetDialogProps {
  onConfirm: (config: LShapedPresetConfig) => void
  trigger: React.ReactNode
}

export function LShapedPresetDialog({
  onConfirm,
  trigger
}: LShapedPresetDialogProps): React.JSX.Element {
  const defaultWallAssemblyId = useDefaultWallAssemblyId()
  const defaultBaseRingBeamAssemblyId = useDefaultBaseRingBeamAssemblyId()
  const defaultTopRingBeamAssemblyId = useDefaultTopRingBeamAssemblyId()
  const preset = useMemo(() => new LShapedPreset(), [])

  // Form state with defaults from config store
  const [config, setConfig] = useState<LShapedPresetConfig>(() => ({
    width1: 10000, // 10m main rectangle width
    length1: 7000, // 7m main rectangle length
    width2: 5000, // 5m extension width
    length2: 4000, // 4m extension length
    rotation: 0, // 0° rotation
    thickness: 420, // 44cm wall thickness
    wallAssemblyId: defaultWallAssemblyId,
    baseRingBeamAssemblyId: defaultBaseRingBeamAssemblyId,
    topRingBeamAssemblyId: defaultTopRingBeamAssemblyId,
    referenceSide: 'inside',
  }))

  useEffect(() => setConfig(prev => ({ ...prev, wallAssemblyId: defaultWallAssemblyId })), [defaultWallAssemblyId])
  useEffect(
    () => setConfig(prev => ({ ...prev, baseRingBeamAssemblyId: defaultBaseRingBeamAssemblyId })),
    [defaultBaseRingBeamAssemblyId]
  )
  useEffect(
    () => setConfig(prev => ({ ...prev, topRingBeamAssemblyId: defaultTopRingBeamAssemblyId })),
    [defaultTopRingBeamAssemblyId]
  )

  const handleConfirm = useCallback(() => {
    if (preset.validateConfig(config)) {
      onConfirm(config)
    }
  }, [config, onConfirm, preset])

  const isValid = preset.validateConfig(config)
  const referencePoints = useMemo(
    () => preset.getPolygonPoints(config),
    [preset, config.width1, config.length1, config.width2, config.length2, config.rotation]
  )

  return (
    <BaseModal title="L-Shaped Perimeter" trigger={trigger} size="4" maxWidth="800px">
      <Flex direction="column" gap="4">
        <Grid columns="1fr auto" gap="5">
          {/* Left Column - Configuration */}
          <Flex direction="column" gap="3">
            <Heading size="2" weight="medium">
              Configuration
            </Heading>

            {/* Main Rectangle Dimensions */}
            <Flex direction="column" gap="2">
              <Text size="2" weight="medium" color="gray">
                Main Rectangle
              </Text>
              <Grid columns="2" gap="3">
                <Flex direction="column" gap="1">
                  <Text size="1" color="gray">
                    Width 1
                  </Text>
                  <LengthField
                    value={config.width1}
                    onChange={value => setConfig(prev => ({ ...prev, width1: value }))}
                    min={2000}
                    max={20000}
                    step={100}
                    unit="m"
                    precision={3}
                    size="1"
                    style={{ width: '100%' }}
                  />
                </Flex>

                <Flex direction="column" gap="1">
                  <Text size="1" color="gray">
                    Length 1
                  </Text>
                  <LengthField
                    value={config.length1}
                    onChange={value => setConfig(prev => ({ ...prev, length1: value }))}
                    min={2000}
                    max={20000}
                    step={100}
                    unit="m"
                    precision={3}
                    size="1"
                    style={{ width: '100%' }}
                  />
                </Flex>
              </Grid>
            </Flex>

            {/* Extension Rectangle Dimensions */}
            <Flex direction="column" gap="2">
              <Text size="2" weight="medium" color="gray">
                Extension Rectangle
              </Text>
              <Grid columns="2" gap="3">
                <Flex direction="column" gap="1">
                  <Text size="1" color="gray">
                    Width 2
                  </Text>

                  <LengthField
                    value={config.width2}
                    onChange={value => setConfig(prev => ({ ...prev, width2: value }))}
                    min={2000}
                    max={20000}
                    step={100}
                    unit="m"
                    precision={3}
                    size="1"
                    style={{ width: '100%' }}
                  />
                </Flex>

                <Flex direction="column" gap="1">
                  <Text size="1" color="gray">
                    Length 2
                  </Text>

                  <LengthField
                    value={config.length2}
                    onChange={value => setConfig(prev => ({ ...prev, length2: value }))}
                    min={2000}
                    max={20000}
                    step={100}
                    unit="m"
                    precision={3}
                    size="1"
                    style={{ width: '100%' }}
                  />
                </Flex>
              </Grid>
            </Flex>

            {/* Rotation */}
            <Flex direction="column" gap="2">
              <Text size="1" color="gray">
                Rotation
              </Text>
              <SegmentedControl.Root
                value={config.rotation.toString()}
                onValueChange={value =>
                  setConfig(prev => ({ ...prev, rotation: parseInt(value) as 0 | 90 | 180 | 270 }))
                }
                size="1"
              >
                <SegmentedControl.Item value="0">
                  <LShape0Icon />
                </SegmentedControl.Item>
                <SegmentedControl.Item value="90">
                  <LShape90Icon />
                </SegmentedControl.Item>
                <SegmentedControl.Item value="180">
                  <LShape180Icon />
                </SegmentedControl.Item>
                <SegmentedControl.Item value="270">
                  <LShape270Icon />
                </SegmentedControl.Item>
              </SegmentedControl.Root>
            </Flex>

            {/* Construction Settings */}
            <Grid columns="2" gap="3">
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

            {isValid ? (
              <PolygonReferencePreview
                referencePoints={referencePoints}
                thickness={config.thickness}
                referenceSide={config.referenceSide}
              />
            ) : (
              <Flex align="center" justify="center" style={{ height: '240px' }}>
                <Text size="1" color="red">
                  Invalid configuration
                </Text>
              </Flex>
            )}
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
