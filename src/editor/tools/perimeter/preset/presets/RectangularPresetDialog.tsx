import { Button, Dialog, Flex, Grid, Heading, SegmentedControl, Text } from '@radix-ui/themes'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

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
import type { PresetDialogProps, RectangularPresetConfig } from './types'

export function RectangularPresetDialog({ onConfirm, trigger }: PresetDialogProps): React.JSX.Element {
  const { t } = useTranslation('tool')
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
    <BaseModal title={t($ => $.presetDialogs.rectangular.title)} trigger={trigger} size="3" maxWidth="700px">
      <Flex direction="column" gap="4">
        <Grid columns="1fr auto" gap="5">
          {/* Left Column - Properties in 2x3 Grid */}
          <Flex direction="column" gap="3">
            <Heading size="2" weight="medium">
              {t($ => $.presetDialogs.rectangular.configuration)}
            </Heading>

            <Grid columns="2" gapY="3" gapX="2">
              {/* Width */}
              <Flex direction="column" gap="1">
                <Text size="1" color="gray">
                  {t($ => $.presetDialogs.rectangular.width)}
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
                  {t($ => $.presetDialogs.rectangular.length)}
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
                    {t($ => $.presetDialogs.rectangular.wallThickness)}
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
                    {t($ => $.presetDialogs.rectangular.wallAssembly)}
                  </Text>
                  {config.wallAssemblyId && <MeasurementInfo highlightedAssembly="wallAssembly" />}
                </Flex>
                <WallAssemblySelectWithEdit
                  value={config.wallAssemblyId ?? undefined}
                  onValueChange={(value: WallAssemblyId) => {
                    setConfig(prev => ({ ...prev, wallAssemblyId: value }))
                  }}
                  placeholder={t($ => $.presetDialogs.rectangular.selectAssembly)}
                  size="1"
                />
              </Flex>

              {/* Base Plate */}
              <Flex direction="column" gap="1">
                <Flex align="center" gap="1">
                  <Text size="1" color="gray">
                    {t($ => $.presetDialogs.rectangular.basePlate)}
                  </Text>
                  <MeasurementInfo highlightedPart="basePlate" />
                </Flex>
                <RingBeamAssemblySelectWithEdit
                  value={config.baseRingBeamAssemblyId}
                  onValueChange={value => {
                    setConfig(prev => ({ ...prev, baseRingBeamAssemblyId: value }))
                  }}
                  placeholder={t($ => $.presetDialogs.rectangular.none)}
                  size="1"
                  allowNone
                />
              </Flex>

              {/* Top Plate */}
              <Flex direction="column" gap="1">
                <Flex align="center" gap="1">
                  <Text size="1" color="gray">
                    {t($ => $.presetDialogs.rectangular.topPlate)}
                  </Text>
                  <MeasurementInfo highlightedPart="topPlate" />
                </Flex>
                <RingBeamAssemblySelectWithEdit
                  value={config.topRingBeamAssemblyId}
                  onValueChange={value => {
                    setConfig(prev => ({ ...prev, topRingBeamAssemblyId: value }))
                  }}
                  placeholder={t($ => $.presetDialogs.rectangular.none)}
                  size="1"
                  allowNone
                />
              </Flex>
            </Grid>
          </Flex>

          {/* Right Column - Preview */}
          <Flex direction="column" gap="3">
            <Heading align="center" size="2" weight="medium">
              {t($ => $.presetDialogs.rectangular.preview)}
            </Heading>

            {/* Reference Side */}
            <Flex direction="column" gap="1">
              <Text size="1" color="gray">
                {t($ => $.presetDialogs.rectangular.referenceSide)}
              </Text>
              <SegmentedControl.Root
                size="1"
                value={config.referenceSide}
                onValueChange={value =>
                  setConfig(prev => ({ ...prev, referenceSide: value as PerimeterReferenceSide }))
                }
              >
                <SegmentedControl.Item value="inside">
                  {t($ => $.presetDialogs.rectangular.inside)}
                </SegmentedControl.Item>
                <SegmentedControl.Item value="outside">
                  {t($ => $.presetDialogs.rectangular.outside)}
                </SegmentedControl.Item>
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
              {t($ => $.presetDialogs.rectangular.cancel)}
            </Button>
          </Dialog.Close>
          <Dialog.Close>
            <Button onClick={handleConfirm} disabled={!isValid}>
              {t($ => $.presetDialogs.rectangular.confirm)}
            </Button>
          </Dialog.Close>
        </Flex>
      </Flex>
    </BaseModal>
  )
}
