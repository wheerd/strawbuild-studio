import { Button, Dialog, Heading, SegmentedControl } from '@radix-ui/themes'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { PerimeterReferenceSide } from '@/building/model'
import type { WallAssemblyId } from '@/building/model/ids'
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
import type { LShapedPresetConfig, PresetDialogProps } from './types'

export function LShapedPresetDialog({ onConfirm, trigger }: PresetDialogProps): React.JSX.Element {
  const { t } = useTranslation('tool')
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
    referenceSide: 'inside'
  }))

  useEffect(() => {
    setConfig(prev => ({ ...prev, wallAssemblyId: defaultWallAssemblyId }))
  }, [defaultWallAssemblyId])
  useEffect(() => {
    setConfig(prev => ({ ...prev, baseRingBeamAssemblyId: defaultBaseRingBeamAssemblyId }))
  }, [defaultBaseRingBeamAssemblyId])
  useEffect(() => {
    setConfig(prev => ({ ...prev, topRingBeamAssemblyId: defaultTopRingBeamAssemblyId }))
  }, [defaultTopRingBeamAssemblyId])

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
    <BaseModal title={t($ => $.presetDialogs.lShaped.title)} trigger={trigger} size="4" maxWidth="800px">
      <div className="flex flex-col gap-4">
        <div className="grid-cols-[1fr_auto] gap-5">
          {/* Left Column - Configuration */}
          <div className="flex flex-col gap-3">
            <Heading size="2" font-medium>
              {t($ => $.presetDialogs.lShaped.configuration)}
            </Heading>

            {/* Main Rectangle Dimensions */}
            <div className="flex flex-col gap-2">
              <span className="text-base font-medium text-gray-900">
                {t($ => $.presetDialogs.lShaped.mainRectangle)}
              </span>
              <div className="grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-gray-900">{t($ => $.presetDialogs.lShaped.width1)}</span>
                  <LengthField
                    value={config.width1}
                    onChange={value => {
                      setConfig(prev => ({ ...prev, width1: value }))
                    }}
                    min={2000}
                    max={20000}
                    step={100}
                    unit="m"
                    precision={3}
                    size="1"
                    style={{ width: '100%' }}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-sm text-gray-900">{t($ => $.presetDialogs.lShaped.length1)}</span>
                  <LengthField
                    value={config.length1}
                    onChange={value => {
                      setConfig(prev => ({ ...prev, length1: value }))
                    }}
                    min={2000}
                    max={20000}
                    step={100}
                    unit="m"
                    precision={3}
                    size="1"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>

            {/* Extension Rectangle Dimensions */}
            <div className="flex flex-col gap-2">
              <span className="text-base font-medium text-gray-900">
                {t($ => $.presetDialogs.lShaped.extensionRectangle)}
              </span>
              <div className="grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-gray-900">{t($ => $.presetDialogs.lShaped.width2)}</span>

                  <LengthField
                    value={config.width2}
                    onChange={value => {
                      setConfig(prev => ({ ...prev, width2: value }))
                    }}
                    min={2000}
                    max={20000}
                    step={100}
                    unit="m"
                    precision={3}
                    size="1"
                    style={{ width: '100%' }}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-sm text-gray-900">{t($ => $.presetDialogs.lShaped.length2)}</span>

                  <LengthField
                    value={config.length2}
                    onChange={value => {
                      setConfig(prev => ({ ...prev, length2: value }))
                    }}
                    min={2000}
                    max={20000}
                    step={100}
                    unit="m"
                    precision={3}
                    size="1"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>

            {/* Rotation */}
            <div className="flex flex-col gap-2">
              <span className="text-sm text-gray-900">{t($ => $.presetDialogs.lShaped.rotation)}</span>
              <SegmentedControl.Root
                value={config.rotation.toString()}
                onValueChange={value => {
                  setConfig(prev => ({ ...prev, rotation: parseInt(value) as 0 | 90 | 180 | 270 }))
                }}
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
            </div>

            {/* Construction Settings */}
            <div className="grid-cols-2 gap-3">
              {/* Wall Thickness */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  <span className="text-sm text-gray-900">{t($ => $.presetDialogs.lShaped.wallThickness)}</span>
                  <MeasurementInfo highlightedMeasurement="totalWallThickness" showFinishedSides />
                </div>
                <LengthField
                  value={config.thickness}
                  onChange={value => {
                    setConfig(prev => ({ ...prev, thickness: value }))
                  }}
                  min={50}
                  max={1500}
                  step={10}
                  unit="cm"
                  size="1"
                  style={{ width: '100%' }}
                />
              </div>

              {/* Wall Assembly */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  <span className="text-sm text-gray-900">{t($ => $.presetDialogs.lShaped.wallAssembly)}</span>
                  <MeasurementInfo highlightedAssembly="wallAssembly" />
                </div>
                <WallAssemblySelectWithEdit
                  value={config.wallAssemblyId}
                  onValueChange={(value: WallAssemblyId) => {
                    setConfig(prev => ({ ...prev, wallAssemblyId: value }))
                  }}
                  placeholder={t($ => $.presetDialogs.lShaped.selectAssembly)}
                  size="1"
                />
              </div>

              {/* Base Plate */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  <span className="text-sm text-gray-900">{t($ => $.presetDialogs.lShaped.basePlate)}</span>
                  <MeasurementInfo highlightedPart="basePlate" />
                </div>
                <RingBeamAssemblySelectWithEdit
                  value={config.baseRingBeamAssemblyId}
                  onValueChange={value => {
                    setConfig(prev => ({ ...prev, baseRingBeamAssemblyId: value }))
                  }}
                  placeholder={t($ => $.presetDialogs.lShaped.none)}
                  size="1"
                  allowNone
                />
              </div>

              {/* Top Plate */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  <span className="text-sm text-gray-900">{t($ => $.presetDialogs.lShaped.topPlate)}</span>
                  <MeasurementInfo highlightedPart="topPlate" />
                </div>
                <RingBeamAssemblySelectWithEdit
                  value={config.topRingBeamAssemblyId}
                  onValueChange={value => {
                    setConfig(prev => ({ ...prev, topRingBeamAssemblyId: value }))
                  }}
                  placeholder={t($ => $.presetDialogs.lShaped.none)}
                  size="1"
                  allowNone
                />
              </div>
            </div>
          </div>

          {/* Right Column - Preview */}
          <div className="flex flex-col gap-3">
            <Heading items-center size="2" font-medium>
              {t($ => $.presetDialogs.lShaped.preview)}
            </Heading>

            {/* Reference Side */}
            <div className="flex flex-col gap-1">
              <span className="text-sm text-gray-900">{t($ => $.presetDialogs.lShaped.referenceSide)}</span>
              <SegmentedControl.Root
                size="1"
                value={config.referenceSide}
                onValueChange={value => {
                  setConfig(prev => ({ ...prev, referenceSide: value as PerimeterReferenceSide }))
                }}
              >
                <SegmentedControl.Item value="inside">{t($ => $.presetDialogs.lShaped.inside)}</SegmentedControl.Item>
                <SegmentedControl.Item value="outside">{t($ => $.presetDialogs.lShaped.outside)}</SegmentedControl.Item>
              </SegmentedControl.Root>
            </div>

            {isValid ? (
              <PolygonReferencePreview
                referencePoints={referencePoints}
                thickness={config.thickness}
                referenceSide={config.referenceSide}
              />
            ) : (
              <div className="items-center justify-center" style={{ height: '240px' }}>
                <span className="text-sm text-red-900">{t($ => $.presetDialogs.lShaped.invalidConfig)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="justify-end gap-3 mt-4">
          <Dialog.Close>
            <Button variant="soft" text-gray-900>
              {t($ => $.presetDialogs.lShaped.cancel)}
            </Button>
          </Dialog.Close>
          <Dialog.Close>
            <Button onClick={handleConfirm} disabled={!isValid}>
              {t($ => $.presetDialogs.lShaped.confirm)}
            </Button>
          </Dialog.Close>
        </div>
      </div>
    </BaseModal>
  )
}
