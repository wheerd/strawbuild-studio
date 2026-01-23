import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import type { RoofAssemblyId } from '@/building/model/ids'
import { Separator } from '@/components/ui/separator'
import { type LayerCopySource, LayerListEditor } from '@/construction/config/components/layers/LayerListEditor'
import { useConfigActions, useRoofAssemblies } from '@/construction/config/store'
import type { RoofAssemblyConfig } from '@/construction/config/types'
import { CEILING_LAYER_PRESETS, ROOF_LAYER_PRESETS } from '@/construction/layers/defaults'
import { RoofMeasurementInfo } from '@/editor/components/RoofMeasurementInfo'

interface LayersConfigFormProps {
  assemblyId: RoofAssemblyId
  config: RoofAssemblyConfig
}

export function LayersConfigForm({ assemblyId, config }: LayersConfigFormProps): React.JSX.Element {
  const { t } = useTranslation('config')
  const {
    addRoofAssemblyInsideLayer,
    setRoofAssemblyInsideLayers,
    updateRoofAssemblyInsideLayer,
    removeRoofAssemblyInsideLayer,
    moveRoofAssemblyInsideLayer,
    addRoofAssemblyTopLayer,
    setRoofAssemblyTopLayers,
    updateRoofAssemblyTopLayer,
    removeRoofAssemblyTopLayer,
    moveRoofAssemblyTopLayer,
    addRoofAssemblyOverhangLayer,
    setRoofAssemblyOverhangLayers,
    updateRoofAssemblyOverhangLayer,
    removeRoofAssemblyOverhangLayer,
    moveRoofAssemblyOverhangLayer
  } = useConfigActions()

  const allAssemblies = useRoofAssemblies()

  const topLayerSources = useMemo(
    () =>
      allAssemblies.map(
        a =>
          ({
            name: a.name,
            totalThickness: a.layers.topThickness,
            layerSource: () => a.layers.topLayers
          }) satisfies LayerCopySource
      ),
    [allAssemblies]
  )
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
  const overhangLayerSources = useMemo(
    () =>
      allAssemblies.map(
        a =>
          ({
            name: a.name,
            totalThickness: a.layers.overhangThickness,
            layerSource: () => a.layers.overhangLayers
          }) satisfies LayerCopySource
      ),
    [allAssemblies]
  )

  const topLayers = config.layers.topLayers
  const displayedTopLayers = [...topLayers].reverse()
  const mapTopIndex = (displayIndex: number) => topLayers.length - 1 - displayIndex

  return (
    <div className="flex flex-col gap-3">
      <LayerListEditor
        title={t($ => $.roofs.layers.insideLayers)}
        layers={config.layers.insideLayers}
        measurementInfo={<RoofMeasurementInfo highlightedPart="roofBottomLayers" showFinishedLevels />}
        onAddLayer={layer => {
          addRoofAssemblyInsideLayer(assemblyId, layer)
        }}
        onReplaceLayers={layers => {
          setRoofAssemblyInsideLayers(assemblyId, layers)
        }}
        onUpdateLayer={(index, updates) => {
          updateRoofAssemblyInsideLayer(assemblyId, index, updates)
        }}
        onRemoveLayer={index => {
          removeRoofAssemblyInsideLayer(assemblyId, index)
        }}
        onMoveLayer={(fromIndex, toIndex) => {
          moveRoofAssemblyInsideLayer(assemblyId, fromIndex, toIndex)
        }}
        addLabel={t($ => $.roofs.addInsideLayer)}
        emptyHint={t($ => $.roofs.noInsideLayers)}
        layerPresets={CEILING_LAYER_PRESETS}
        layerCopySources={insideLayerSources}
        beforeLabel={t($ => $.roofs.roofConstruction)}
        afterLabel={t($ => $.roofs.layers.insideLayers)}
      />

      <Separator />

      <LayerListEditor
        title={t($ => $.roofs.topLayers)}
        layers={displayedTopLayers}
        measurementInfo={<RoofMeasurementInfo highlightedPart="roofTopLayers" showFinishedLevels />}
        onAddLayer={layer => {
          addRoofAssemblyTopLayer(assemblyId, layer)
        }}
        onReplaceLayers={layers => {
          setRoofAssemblyTopLayers(assemblyId, layers)
        }}
        onUpdateLayer={(index, updates) => {
          updateRoofAssemblyTopLayer(assemblyId, mapTopIndex(index), updates)
        }}
        onRemoveLayer={index => {
          removeRoofAssemblyTopLayer(assemblyId, mapTopIndex(index))
        }}
        onMoveLayer={(fromIndex, toIndex) => {
          moveRoofAssemblyTopLayer(assemblyId, mapTopIndex(fromIndex), mapTopIndex(toIndex))
        }}
        addLabel={t($ => $.roofs.addTopLayer)}
        emptyHint={t($ => $.roofs.noTopLayers)}
        layerPresets={ROOF_LAYER_PRESETS}
        layerCopySources={topLayerSources}
        beforeLabel={t($ => $.roofs.finishedTop)}
        afterLabel={t($ => $.roofs.roofConstruction)}
      />

      <Separator />

      <LayerListEditor
        title={t($ => $.roofs.layers.overhangLayers)}
        layers={config.layers.overhangLayers}
        measurementInfo={<RoofMeasurementInfo highlightedPart="overhangBottomLayers" showFinishedLevels />}
        onAddLayer={layer => {
          addRoofAssemblyOverhangLayer(assemblyId, layer)
        }}
        onReplaceLayers={layers => {
          setRoofAssemblyOverhangLayers(assemblyId, layers)
        }}
        onUpdateLayer={(index, updates) => {
          updateRoofAssemblyOverhangLayer(assemblyId, index, updates)
        }}
        onRemoveLayer={index => {
          removeRoofAssemblyOverhangLayer(assemblyId, index)
        }}
        onMoveLayer={(fromIndex, toIndex) => {
          moveRoofAssemblyOverhangLayer(assemblyId, fromIndex, toIndex)
        }}
        addLabel={t($ => $.roofs.addOverhangLayer)}
        emptyHint={t($ => $.roofs.noOverhangLayers)}
        layerPresets={[]}
        layerCopySources={overhangLayerSources}
        beforeLabel={t($ => $.roofs.overhang)}
        afterLabel={t($ => $.roofs.outside)}
      />
    </div>
  )
}
