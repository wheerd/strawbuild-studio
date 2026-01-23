import * as Label from '@radix-ui/react-label'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import type { WallAssemblyId } from '@/building/model/ids'
import { Separator } from '@/components/ui/separator'
import { OpeningAssemblySelectWithEdit } from '@/construction/config/components/OpeningAssemblySelectWithEdit'
import { type LayerCopySource, LayerListEditor } from '@/construction/config/components/layers/LayerListEditor'
import { useConfigActions, useWallAssemblies } from '@/construction/config/store'
import type { WallAssemblyConfig } from '@/construction/config/types'
import { WALL_LAYER_PRESETS } from '@/construction/layers/defaults'
import { MeasurementInfo } from '@/editor/components/MeasurementInfo'

interface CommonConfigFormProps {
  assemblyId: WallAssemblyId
  config: WallAssemblyConfig
}

export function CommonConfigForm({ assemblyId, config }: CommonConfigFormProps): React.JSX.Element {
  const {
    updateWallAssemblyConfig,
    addWallAssemblyInsideLayer,
    setWallAssemblyInsideLayers,
    updateWallAssemblyInsideLayer,
    removeWallAssemblyInsideLayer,
    moveWallAssemblyInsideLayer,
    addWallAssemblyOutsideLayer,
    setWallAssemblyOutsideLayers,
    updateWallAssemblyOutsideLayer,
    removeWallAssemblyOutsideLayer,
    moveWallAssemblyOutsideLayer
  } = useConfigActions()

  const allAssemblies = useWallAssemblies()

  const insideLayerSources = useMemo(
    () =>
      allAssemblies.map(
        a =>
          ({
            name: a.name,
            totalThickness: a.layers.insideThickness,
            layerSource: () => a.layers.insideLayers
          }) satisfies LayerCopySource
      ),
    [allAssemblies]
  )
  const outsideLayerSources = useMemo(
    () =>
      allAssemblies.map(
        a =>
          ({
            name: a.name,
            totalThickness: a.layers.outsideThickness,
            layerSource: () => a.layers.outsideLayers
          }) satisfies LayerCopySource
      ),
    [allAssemblies]
  )

  const { t } = useTranslation('config')
  return (
    <div className="flex flex-col gap-3">
      <h2>{t($ => $.walls.openingsSection)}</h2>
      <div className="flex flex-col gap-1">
        <Label.Root>
          <span className="text-sm font-medium">{t($ => $.walls.openingAssembly)}</span>
        </Label.Root>
        <OpeningAssemblySelectWithEdit
          value={config.openingAssemblyId}
          onValueChange={value => {
            updateWallAssemblyConfig(assemblyId, {
              openingAssemblyId: value
            })
          }}
          allowDefault
          showDefaultIndicator
          placeholder={t($ => $.common.placeholder)}
          size="sm"
        />
      </div>
      <Separator />
      <div className="flex flex-col gap-3">
        <LayerListEditor
          title={t($ => $.walls.insideLayers)}
          measurementInfo={<MeasurementInfo highlightedPart="insideLayer" showFinishedSides />}
          layers={config.layers.insideLayers}
          onAddLayer={layer => {
            addWallAssemblyInsideLayer(assemblyId, layer)
          }}
          onReplaceLayers={layers => {
            setWallAssemblyInsideLayers(assemblyId, layers)
          }}
          onUpdateLayer={(index, updates) => {
            updateWallAssemblyInsideLayer(assemblyId, index, updates)
          }}
          onRemoveLayer={index => {
            removeWallAssemblyInsideLayer(assemblyId, index)
          }}
          onMoveLayer={(fromIndex, toIndex) => {
            moveWallAssemblyInsideLayer(assemblyId, fromIndex, toIndex)
          }}
          addLabel={t($ => $.walls.addInsideLayer)}
          emptyHint={t($ => $.walls.noInsideLayers)}
          layerPresets={WALL_LAYER_PRESETS}
          layerCopySources={insideLayerSources}
          beforeLabel={t($ => $.walls.wallConstruction)}
          afterLabel={t($ => $.walls.inside)}
        />

        <Separator />

        <LayerListEditor
          title={t($ => $.walls.outsideLayers)}
          measurementInfo={<MeasurementInfo highlightedPart="outsideLayer" showFinishedSides />}
          layers={config.layers.outsideLayers}
          onAddLayer={layer => {
            addWallAssemblyOutsideLayer(assemblyId, layer)
          }}
          onReplaceLayers={layers => {
            setWallAssemblyOutsideLayers(assemblyId, layers)
          }}
          onUpdateLayer={(index, updates) => {
            updateWallAssemblyOutsideLayer(assemblyId, index, updates)
          }}
          onRemoveLayer={index => {
            removeWallAssemblyOutsideLayer(assemblyId, index)
          }}
          onMoveLayer={(fromIndex, toIndex) => {
            moveWallAssemblyOutsideLayer(assemblyId, fromIndex, toIndex)
          }}
          addLabel={t($ => $.walls.addOutsideLayer)}
          emptyHint={t($ => $.walls.noOutsideLayers)}
          layerPresets={WALL_LAYER_PRESETS}
          layerCopySources={outsideLayerSources}
          beforeLabel={t($ => $.walls.wallConstruction)}
          afterLabel={t($ => $.walls.outside)}
        />
      </div>
    </div>
  )
}
