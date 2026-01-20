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
  useEffect(() => {
    setConfig(prev => ({ ...prev, wallAssemblyId: defaultWallAssemblyId }))
  }, [defaultWallAssemblyId])
  useEffect(() => {
    setConfig(prev => ({ ...prev, baseRingBeamAssemblyId: defaultBaseRingBeamAssemblyId }))
  }, [defaultBaseRingBeamAssemblyId])
  useEffect(() => {
    setConfig(prev => ({ ...prev, topRingBeamAssemblyId: defaultTopRingBeamAssemblyId }))
  }, [defaultTopRingBeamAssemblyId])

  const effectiveInteriorWidth = config.referenceSide === 'inside' ? config.width : config.width - 2 * config.thickness
  const effectiveInteriorLength =
    config.referenceSide === 'inside' ? config.length : config.length - 2 * config.thickness

  const isValid = effectiveInteriorWidth > 0 && effectiveInteriorLength > 0 && config.thickness > 0

  const handleConfirm = useCallback(() => {
    if (isValid) {
      onConfirm(config)
    }
  }, [config, isValid, onConfirm])

  const referencePoints = useMemo(() => preset.getPolygonPoints(config), [preset, config.width, config.length])

  return (
    <BaseModal title={t($ => $.presetDialogs.rectangular.title)} trigger={trigger} size="lg" maxWidth="700px">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-[1fr_auto] gap-5">
          {/* Left Column - Properties in 2x3 Grid */}
          <div className="flex flex-col gap-3">
            <h2 className="font-medium">{t($ => $.presetDialogs.rectangular.configuration)}</h2>

            <div className="grid grid-cols-2 gap-x-2 gap-y-3">
              {/* Width */}
              <div className="flex flex-col gap-1">
                <span className="text-sm">{t($ => $.presetDialogs.rectangular.width)}</span>
                <LengthField
                  value={config.width}
                  onChange={value => {
                    setConfig(prev => ({ ...prev, width: value }))
                  }}
                  min={1000}
                  step={100}
                  unit="m"
                  precision={3}
                  size="sm"
                  className="w-full"
                />
              </div>

              {/* Length */}
              <div className="flex flex-col gap-1">
                <span className="text-sm">{t($ => $.presetDialogs.rectangular.length)}</span>
                <LengthField
                  value={config.length}
                  onChange={value => {
                    setConfig(prev => ({ ...prev, length: value }))
                  }}
                  min={1000}
                  step={100}
                  unit="m"
                  precision={3}
                  size="sm"
                  className="w-full"
                />
              </div>

              {/* Wall Thickness */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  <span className="text-sm">{t($ => $.presetDialogs.rectangular.wallThickness)}</span>
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
                  className="w-full"
                />
              </div>

              {/* Wall Assembly */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  <span className="text-sm">{t($ => $.presetDialogs.rectangular.wallAssembly)}</span>
                  <MeasurementInfo highlightedAssembly="wallAssembly" />
                </div>
                <WallAssemblySelectWithEdit
                  value={config.wallAssemblyId}
                  onValueChange={(value: WallAssemblyId) => {
                    setConfig(prev => ({ ...prev, wallAssemblyId: value }))
                  }}
                  placeholder={t($ => $.presetDialogs.rectangular.selectAssembly)}
                  size="sm"
                />
              </div>

              {/* Base Plate */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  <span className="text-sm">{t($ => $.presetDialogs.rectangular.basePlate)}</span>
                  <MeasurementInfo highlightedPart="basePlate" />
                </div>
                <RingBeamAssemblySelectWithEdit
                  value={config.baseRingBeamAssemblyId}
                  onValueChange={value => {
                    setConfig(prev => ({ ...prev, baseRingBeamAssemblyId: value }))
                  }}
                  placeholder={t($ => $.presetDialogs.rectangular.none)}
                  size="sm"
                  allowNone
                />
              </div>

              {/* Top Plate */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  <span className="text-sm">{t($ => $.presetDialogs.rectangular.topPlate)}</span>
                  <MeasurementInfo highlightedPart="topPlate" />
                </div>
                <RingBeamAssemblySelectWithEdit
                  value={config.topRingBeamAssemblyId}
                  onValueChange={value => {
                    setConfig(prev => ({ ...prev, topRingBeamAssemblyId: value }))
                  }}
                  placeholder={t($ => $.presetDialogs.rectangular.none)}
                  size="sm"
                  allowNone
                />
              </div>
            </div>
          </div>

          {/* Right Column - Preview */}
          <div className="flex flex-col gap-3 pl-5">
            <h2 className="text-center font-medium">{t($ => $.presetDialogs.rectangular.preview)}</h2>

            {/* Reference Side */}
            <div className="flex flex-col gap-1">
              <span className="text-sm">{t($ => $.presetDialogs.rectangular.referenceSide)}</span>
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
                <ToggleGroupItem value="inside">{t($ => $.presetDialogs.rectangular.inside)}</ToggleGroupItem>
                <ToggleGroupItem value="outside">{t($ => $.presetDialogs.rectangular.outside)}</ToggleGroupItem>
              </ToggleGroup>
            </div>

            <PolygonReferencePreview
              referencePoints={referencePoints}
              thickness={config.thickness}
              referenceSide={config.referenceSide}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex justify-end gap-3">
          <DialogClose>
            <Button variant="soft" className="">
              {t($ => $.presetDialogs.rectangular.cancel)}
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button onClick={handleConfirm} disabled={!isValid}>
              {t($ => $.presetDialogs.rectangular.confirm)}
            </Button>
          </DialogClose>
        </div>
      </div>
    </BaseModal>
  )
}
