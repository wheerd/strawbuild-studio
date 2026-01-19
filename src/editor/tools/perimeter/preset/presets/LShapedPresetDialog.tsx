import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { PerimeterReferenceSide } from '@/building/model'
import type { WallAssemblyId } from '@/building/model/ids'
import { Button } from '@/components/ui/button'
import { DialogClose } from '@/components/ui/dialog'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
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
        <div className="flex flex-row gap-5">
          {/* Left Column - Configuration */}
          <div className="flex grow flex-col gap-3">
            <h2 font-medium>{t($ => $.presetDialogs.lShaped.configuration)}</h2>

            {/* Main Rectangle Dimensions */}
            <div className="flex flex-col gap-2">
              <span className="text-base font-medium text-gray-900">
                {t($ => $.presetDialogs.lShaped.mainRectangle)}
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-auto flex flex-col gap-1">
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
                    size="sm"
                    style={{ width: '100%' }}
                  />
                </div>

                <div className="col-auto flex flex-col gap-1">
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
                    size="sm"
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
              <div className="grid grid-cols-2 gap-3">
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
                    size="sm"
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
                    size="sm"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>

            {/* Rotation */}
            <div className="flex flex-col gap-2">
              <span className="text-sm text-gray-900">{t($ => $.presetDialogs.lShaped.rotation)}</span>
              <ToggleGroup
                type="single"
                variant="outline"
                value={config.rotation.toString()}
                onValueChange={value => {
                  if (value) {
                    setConfig(prev => ({ ...prev, rotation: parseInt(value) as 0 | 90 | 180 | 270 }))
                  }
                }}
                size="sm"
              >
                <ToggleGroupItem value="0">
                  <LShape0Icon />
                </ToggleGroupItem>
                <ToggleGroupItem value="90">
                  <LShape90Icon />
                </ToggleGroupItem>
                <ToggleGroupItem value="180">
                  <LShape180Icon />
                </ToggleGroupItem>
                <ToggleGroupItem value="270">
                  <LShape270Icon />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Construction Settings */}
            <div className="grid grid-cols-2 gap-3">
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
                  size="sm"
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
                  size="sm"
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
                  size="sm"
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
                  size="sm"
                  allowNone
                />
              </div>
            </div>
          </div>

          {/* Right Column - Preview */}
          <div className="flex flex-col gap-3">
            <h2 className="text-center font-medium">{t($ => $.presetDialogs.lShaped.preview)}</h2>

            {/* Reference Side */}
            <div className="flex flex-col gap-1">
              <span className="text-sm text-gray-900">{t($ => $.presetDialogs.lShaped.referenceSide)}</span>
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                value={config.referenceSide}
                onValueChange={value => {
                  if (value) {
                    setConfig(prev => ({ ...prev, referenceSide: value as PerimeterReferenceSide }))
                  }
                }}
              >
                <ToggleGroupItem value="inside">{t($ => $.presetDialogs.lShaped.inside)}</ToggleGroupItem>
                <ToggleGroupItem value="outside">{t($ => $.presetDialogs.lShaped.outside)}</ToggleGroupItem>
              </ToggleGroup>
            </div>

            {isValid ? (
              <PolygonReferencePreview
                referencePoints={referencePoints}
                thickness={config.thickness}
                referenceSide={config.referenceSide}
              />
            ) : (
              <div className="flex items-center justify-center" style={{ height: '240px' }}>
                <span className="text-sm text-red-900">{t($ => $.presetDialogs.lShaped.invalidConfig)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 justify-end gap-3">
          <DialogClose asChild>
            <Button variant="ghost">{t($ => $.presetDialogs.lShaped.cancel)}</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button onClick={handleConfirm} disabled={!isValid}>
              {t($ => $.presetDialogs.lShaped.confirm)}
            </Button>
          </DialogClose>
        </div>
      </div>
    </BaseModal>
  )
}
