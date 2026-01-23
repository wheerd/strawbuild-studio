import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import type { FloorAssemblyId } from '@/building/model/ids'
import { Separator } from '@/components/ui/separator'
import { type LayerCopySource, LayerListEditor } from '@/construction/config/components/layers/LayerListEditor'
import { useConfigActions, useFloorAssemblies } from '@/construction/config/store'
import type { FloorConfig } from '@/construction/floors/types'
import { CEILING_LAYER_PRESETS, FLOOR_LAYER_PRESETS } from '@/construction/layers/defaults'
import { MeasurementInfo } from '@/editor/components/MeasurementInfo'

interface LayersConfigFormProps {
  assemblyId: FloorAssemblyId
  config: FloorConfig
}

export function LayersConfigForm({ assemblyId, config }: LayersConfigFormProps): React.JSX.Element {
  const { t } = useTranslation('config')
  const {
    addFloorAssemblyTopLayer,
    setFloorAssemblyTopLayers,
    updateFloorAssemblyTopLayer,
    removeFloorAssemblyTopLayer,
    moveFloorAssemblyTopLayer,
    addFloorAssemblyBottomLayer,
    setFloorAssemblyBottomLayers,
    updateFloorAssemblyBottomLayer,
    removeFloorAssemblyBottomLayer,
    moveFloorAssemblyBottomLayer
  } = useConfigActions()

  const topLayers = config.layers.topLayers
  const displayedTopLayers = [...topLayers].reverse()
  const mapTopIndex = (displayIndex: number) => topLayers.length - 1 - displayIndex

  const allAssemblies = useFloorAssemblies()

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
  const bottomLayerSources = useMemo(
    () =>
      allAssemblies.map(
        a =>
          ({
            name: a.name,
            totalThickness: a.layers.bottomThickness,
            layerSource: () => a.layers.bottomLayers
          }) satisfies LayerCopySource
      ),
    [allAssemblies]
  )

  return (
    <div className="flex flex-col gap-3">
      <LayerListEditor
        title={t($ => $.floors.layers.topLayers)}
        measurementInfo={<MeasurementInfo highlightedPart="floorTopLayers" showFinishedLevels />}
        layers={displayedTopLayers}
        onAddLayer={layer => {
          addFloorAssemblyTopLayer(assemblyId, layer)
        }}
        onReplaceLayers={layers => {
          setFloorAssemblyTopLayers(assemblyId, layers)
        }}
        onUpdateLayer={(index, updates) => {
          updateFloorAssemblyTopLayer(assemblyId, mapTopIndex(index), updates)
        }}
        onRemoveLayer={index => {
          removeFloorAssemblyTopLayer(assemblyId, mapTopIndex(index))
        }}
        onMoveLayer={(fromIndex, toIndex) => {
          moveFloorAssemblyTopLayer(assemblyId, mapTopIndex(fromIndex), mapTopIndex(toIndex))
        }}
        addLabel={t($ => $.floors.layers.addTopLayer)}
        emptyHint={t($ => $.floors.layers.noTopLayers)}
        layerPresets={FLOOR_LAYER_PRESETS}
        layerCopySources={topLayerSources}
        beforeLabel={t($ => $.floors.layers.finishedTop)}
        afterLabel={t($ => $.floors.layers.floorConstruction)}
      />

      <Separator />

      <LayerListEditor
        title={t($ => $.floors.layers.bottomLayers)}
        measurementInfo={<MeasurementInfo highlightedPart="floorBottomLayers" showFinishedLevels />}
        layers={config.layers.bottomLayers}
        onAddLayer={layer => {
          addFloorAssemblyBottomLayer(assemblyId, layer)
        }}
        onReplaceLayers={layers => {
          setFloorAssemblyBottomLayers(assemblyId, layers)
        }}
        onUpdateLayer={(index, updates) => {
          updateFloorAssemblyBottomLayer(assemblyId, index, updates)
        }}
        onRemoveLayer={index => {
          removeFloorAssemblyBottomLayer(assemblyId, index)
        }}
        onMoveLayer={(fromIndex, toIndex) => {
          moveFloorAssemblyBottomLayer(assemblyId, fromIndex, toIndex)
        }}
        addLabel={t($ => $.floors.layers.addBottomLayer)}
        emptyHint={t($ => $.floors.layers.noBottomLayers)}
        layerPresets={CEILING_LAYER_PRESETS}
        layerCopySources={bottomLayerSources}
        beforeLabel={t($ => $.floors.layers.floorConstruction)}
        afterLabel={t($ => $.floors.layers.finishedBottom)}
      />
    </div>
  )
}
