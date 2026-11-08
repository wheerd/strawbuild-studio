import {
  type IntermediateWallWithGeometry,
  type OpeningWithGeometry,
  type WallNodeWithGeometry,
  isOpeningId
} from '@/building/model'
import { getModelActions } from '@/building/store'
import { resolveLayerSetLayers, resolveLayerSetThickness } from '@/config/store'
import type { InteriorWallAssemblyConfig } from '@/config/types'
import type { LayerConfig } from '@/construction/assemblies/layers/types'
import { runLayerConstruction } from '@/construction/assemblies/perimeterWalls/layers'
import { convertHeightLineToWallOffsets } from '@/construction/assemblies/perimeterWalls/roofIntegration'
import { WallConstructionArea } from '@/construction/assemblies/utils/WallConstructionArea'
import type { PerimeterConstructionContext } from '@/construction/context/perimeter'
import { getRoofHeightLineCached } from '@/construction/context/roofHeightLineCache'
import type { StoreyContext } from '@/construction/context/storeys'
import { type ConstructionElement } from '@/construction/model/elements'
import { type ConstructionModel, type DebugClippingPlane, createConstructionGroup } from '@/construction/model/model'
import { aggregateResults, assignDeterministicIdsToResults } from '@/construction/model/results'
import type { ConstructionResult } from '@/construction/model/results'
import { TAG_INTERIOR_WALLS, TAG_LAYERS, TAG_WALL_LAYER_INTERIOR, type Tag, createTag } from '@/construction/model/tags'
import { intermediateWallTransform } from '@/construction/model/transforms'
import {
  Bounds3D,
  IDENTITY,
  type Length,
  type Polygon2D,
  type PolygonWithHoles2D,
  fromTrans,
  newVec2,
  newVec3,
  scaleAddVec2
} from '@/shared/geometry'

import {
  clipInteriorWallResults,
  computeLayerExtension,
  computeTerminalCapLayerOffset,
  computeWallExtensionAndClipping,
  transformPlaneToWallCoordinates
} from './geometry'
import type { ClippingPlane, LayerExtension, WallExtension } from './geometry'
import type { InteriorWallAssembly } from './types'

const WALL_SUPPORT_DIRECTION = newVec2(0, 1)
export abstract class BaseInteriorWallAssembly<
  TConfig extends InteriorWallAssemblyConfig
> implements InteriorWallAssembly {
  protected readonly config: TConfig

  constructor(config: TConfig) {
    this.config = config
  }

  protected abstract constructCore(
    wall: IntermediateWallWithGeometry,
    area: WallConstructionArea,
    openings: OpeningWithGeometry[],
    openingHoles: Polygon2D[],
    storeyContext: StoreyContext,
    perimeterContext: PerimeterConstructionContext,
    extension: WallExtension
  ): Generator<ConstructionElement>

  construct(
    wall: IntermediateWallWithGeometry,
    storeyContext: StoreyContext,
    perimeterContext: PerimeterConstructionContext
  ): ConstructionModel {
    const { getWallOpeningById, getWallNodeById } = getModelActions()
    const faceThickness = resolveLayerSetThickness(this.config.layerSetId)
    const coreThickness = wall.thickness - 2 * faceThickness
    const halfCoreThickness = coreThickness / 2

    const startNode = getWallNodeById(wall.start.nodeId)
    const endNode = getWallNodeById(wall.end.nodeId)
    const extension = computeWallExtensionAndClipping(wall, startNode, endNode, perimeterContext, faceThickness)

    const ceilingOffset = storeyContext.roofBottom - storeyContext.ceilingConstructionBottom
    const wallHeight = storeyContext.ceilingConstructionBottom - storeyContext.floorConstructionTop

    const geometry = perimeterContext.interiorWallGeometry.get(wall.id)
    if (!geometry?.start || !geometry.end) throw new Error('Missing geometry for wall')

    const extStart = scaleAddVec2(wall.entityReferenceLine.start, wall.direction, -extension.startExtension)
    const extEnd = scaleAddVec2(wall.entityReferenceLine.end, wall.direction, extension.endExtension)

    const left = {
      start: scaleAddVec2(extStart, wall.leftDirection, halfCoreThickness),
      end: scaleAddVec2(extEnd, wall.leftDirection, halfCoreThickness)
    }
    const right = {
      start: scaleAddVec2(extStart, wall.leftDirection, -halfCoreThickness),
      end: scaleAddVec2(extEnd, wall.leftDirection, -halfCoreThickness)
    }
    const roofHeightLine = getRoofHeightLineCached(storeyContext.storeyId, [left, right])

    // Convert roof height line to wall offsets
    let roofOffsets
    if (roofHeightLine.length === 0) {
      roofOffsets = convertHeightLineToWallOffsets(roofHeightLine, extension.totalLength)
    } else {
      roofOffsets = [newVec2(0, -ceilingOffset), newVec2(extension.totalLength, -ceilingOffset)]
    }

    // Create overall wall construction area ONCE with roof offsets
    const wallArea = new WallConstructionArea(
      newVec3(-extension.startExtension, -halfCoreThickness, 0),
      newVec3(extension.totalLength, coreThickness, wallHeight),
      roofOffsets
    )

    // console.log(wallArea, left, right, extension)

    const openings = wall.entityIds.filter(isOpeningId).map(getWallOpeningById)
    const finishedFloorZLevel = storeyContext.finishedFloorTop - storeyContext.floorConstructionTop

    const openingHoles = openings.flatMap(opening => {
      const start = Math.max(0, opening.centerOffsetFromWallStart - opening.width / 2)
      const end = Math.min(wall.wallLength, opening.centerOffsetFromWallStart + opening.width / 2)
      const bottom = Math.max(0, finishedFloorZLevel + (opening.sillHeight ?? 0))
      const top = Math.min(wallHeight, bottom + opening.height)
      return end > start && top > bottom
        ? [
            {
              points: [newVec2(start, bottom), newVec2(end, bottom), newVec2(end, top), newVec2(start, top)]
            } satisfies Polygon2D
          ]
        : []
    })

    const debugPlaneEntries: { endpoint: 'start' | 'end'; plane: typeof extension.startClipPlane }[] = [
      { endpoint: 'start', plane: extension.startClipPlane },
      { endpoint: 'end', plane: extension.endClipPlane }
    ]
    const debugClippingPlanes: DebugClippingPlane[] = debugPlaneEntries.flatMap(({ endpoint, plane }) => {
      if (!plane) return []
      const localPlane = transformPlaneToWallCoordinates(plane, wall, storeyContext.wallBottom)
      return [
        {
          id: `${wall.id}-${endpoint}`,
          sourceWallId: wall.id,
          endpoint,
          normal: localPlane.normal,
          originOffset: localPlane.originOffset
        }
      ]
    })
    const coreResults = [
      ...this.constructCore(wall, wallArea, openings, openingHoles, storeyContext, perimeterContext, extension)
    ]
    const coreGroup = createConstructionGroup(
      coreResults,
      fromTrans(
        newVec3(0, -wall.thickness / 2 + faceThickness, storeyContext.floorConstructionTop - storeyContext.wallBottom)
      )
    )

    const layerResults = [
      ...this.buildLayers(
        wall,
        extension,
        wallHeight,
        openingHoles,
        perimeterContext,
        storeyContext,
        startNode,
        endNode
      )
    ]

    const clippedCoreResults = clipInteriorWallResults(
      [{ type: 'element', element: coreGroup }],
      extension,
      wall,
      wallHeight,
      perimeterContext,
      intermediateWallTransform(wall, storeyContext.wallBottom)
    )
    const aggregated = aggregateResults([...clippedCoreResults, ...layerResults])
    return {
      elements: aggregated.elements,
      measurements: aggregated.measurements,
      areas: aggregated.areas,
      errors: aggregated.errors,
      warnings: aggregated.warnings,
      bounds: Bounds3D.merge(...aggregated.elements.map(element => element.bounds)),
      debugClippingPlanes
    }
  }

  private *buildLayers(
    wall: IntermediateWallWithGeometry,
    extension: WallExtension,
    height: Length,
    openingHoles: Polygon2D[],
    perimeterContext: PerimeterConstructionContext,
    storeyContext: StoreyContext,
    startNode: WallNodeWithGeometry,
    endNode: WallNodeWithGeometry
  ): Generator<ConstructionResult> {
    const faceThickness = resolveLayerSetThickness(this.config.layerSetId)
    const layers = resolveLayerSetLayers(this.config.layerSetId)

    yield* this.buildSideLayers(
      wall,
      height,
      openingHoles,
      layers,
      faceThickness,
      extension,
      perimeterContext,
      storeyContext
    )

    if (startNode.connectedWallIds.length === 1) {
      yield* this.buildCapLayers(
        wall,
        storeyContext,
        extension.layerClipping.left.start,
        'start',
        layers,
        faceThickness
      )
    }

    if (endNode.connectedWallIds.length === 1) {
      yield* this.buildCapLayers(wall, storeyContext, extension.layerClipping.left.end, 'end', layers, faceThickness)
    }
  }

  private *buildCapLayers(
    wall: IntermediateWallWithGeometry,
    storeyContext: StoreyContext,
    capPlane: ClippingPlane | undefined,
    endpoint: 'start' | 'end',
    layers: LayerConfig[],
    faceThickness: number
  ) {
    const finishedFloorZLevel = storeyContext.finishedFloorTop - storeyContext.floorConstructionTop
    const finishedCeilingZLevel = storeyContext.finishedCeilingBottom - storeyContext.floorConstructionTop

    const capPolygon: PolygonWithHoles2D = {
      outer: {
        points: [
          newVec2(-wall.thickness / 2, finishedFloorZLevel),
          newVec2(wall.thickness / 2, finishedFloorZLevel),
          newVec2(wall.thickness / 2, finishedCeilingZLevel),
          newVec2(-wall.thickness / 2, finishedCeilingZLevel)
        ]
      },
      holes: []
    }

    if (!capPlane) return

    const localCapPlane = transformPlaneToWallCoordinates(capPlane, wall)
    const normalX = localCapPlane.normal[0]
    if (Math.abs(normalX) <= 1e-6) return
    const capX = localCapPlane.originOffset / normalX

    let offset = 0
    for (const [index, layer] of layers.entries()) {
      const layerX = computeTerminalCapLayerOffset(endpoint, capX, faceThickness, offset, layer.thickness)
      const results = runLayerConstruction(capPolygon, layerX, 'yz', layer, newVec2(1, 0))
      assignDeterministicIdsToResults(results, `${wall.id}_cap_${endpoint}_${index}`)

      yield* results.filter(r => r.type !== 'element')

      const elements = results.filter(r => r.type === 'element').map(e => e.element)
      if (elements.length > 0) {
        const nameKey = layer.nameKey
        const customTag = createTag(
          'wall-layer',
          layer.name,
          nameKey != null ? t => t(nameKey, { ns: 'config' }) : layer.name
        )
        const group = createConstructionGroup(elements, IDENTITY, [TAG_WALL_LAYER_INTERIOR, TAG_LAYERS, customTag])
        yield { type: 'element', element: group } satisfies ConstructionResult
      }

      if (!layer.overlap) offset += layer.thickness
    }
  }

  private *buildSideLayers(
    wall: IntermediateWallWithGeometry,
    height: number,
    openingHoles: Polygon2D[],
    layers: LayerConfig[],
    faceThickness: number,
    extension: WallExtension,
    perimeterContext: PerimeterConstructionContext,
    storeyContext: StoreyContext
  ) {
    const finishedFloorZLevel = storeyContext.finishedFloorTop - storeyContext.floorConstructionTop
    const finishedCeilingZLevel = storeyContext.finishedCeilingBottom - storeyContext.floorConstructionTop
    const createLayerPolygon = (layerExtension: LayerExtension): PolygonWithHoles2D => ({
      outer: {
        points: [
          newVec2(-layerExtension.startExtension, finishedFloorZLevel),
          newVec2(wall.wallLength + layerExtension.endExtension, finishedFloorZLevel),
          newVec2(wall.wallLength + layerExtension.endExtension, finishedCeilingZLevel),
          newVec2(-layerExtension.startExtension, finishedCeilingZLevel)
        ]
      },
      holes: openingHoles
    })

    let offset = 0
    for (const [index, layer] of layers.entries()) {
      const leftBand = {
        start: wall.thickness / 2 - faceThickness + offset,
        end: wall.thickness / 2 - faceThickness + offset + layer.thickness
      }
      const rightBand = {
        start: -wall.thickness / 2 + faceThickness - offset - layer.thickness,
        end: -wall.thickness / 2 + faceThickness - offset
      }
      const leftExtension = computeLayerExtension(wall, extension.layerClipping.left, leftBand)
      const rightExtension = computeLayerExtension(wall, extension.layerClipping.right, rightBand)

      const leftPolygon = createLayerPolygon(leftExtension)
      yield* this.buildSideLayer(
        leftPolygon,
        leftExtension,
        leftBand.start,
        layer,
        `${wall.id}_left_${index}`,
        wall,
        height,
        perimeterContext,
        storeyContext
      )

      const rightPolygon = createLayerPolygon(rightExtension)
      yield* this.buildSideLayer(
        rightPolygon,
        rightExtension,
        rightBand.start,
        layer,
        `${wall.id}_right_${index}`,
        wall,
        height,
        perimeterContext,
        storeyContext
      )

      if (!layer.overlap) offset += layer.thickness
    }
  }

  private *buildSideLayer(
    layerPolygon: PolygonWithHoles2D,
    layerExtension: LayerExtension,
    offset: Length,
    layer: LayerConfig,
    idPrefix: string,
    wall: IntermediateWallWithGeometry,
    height: number,
    perimeterContext: PerimeterConstructionContext,
    storeyContext: StoreyContext
  ) {
    const results = runLayerConstruction(layerPolygon, offset, 'xz', layer, WALL_SUPPORT_DIRECTION)
    assignDeterministicIdsToResults(results, idPrefix)
    yield* results.filter(r => r.type !== 'element')

    const elements = results.filter(r => r.type === 'element').map(e => e.element)
    if (elements.length > 0) {
      const nameKey = layer.nameKey
      const customTag = createTag(
        'wall-layer',
        layer.name,
        nameKey != null ? t => t(nameKey, { ns: 'config' }) : layer.name
      )
      const group = createConstructionGroup(elements, IDENTITY, [TAG_WALL_LAYER_INTERIOR, TAG_LAYERS, customTag])
      yield* clipInteriorWallResults(
        [{ type: 'element', element: group }],
        layerExtension,
        wall,
        height,
        perimeterContext,
        intermediateWallTransform(wall, storeyContext.wallBottom)
      )
    }
  }

  abstract get assemblyTypeTag(): Tag

  get tags() {
    const nameKey = this.config.nameKey
    return [
      createTag(
        'interior-wall-assembly',
        this.config.id,
        nameKey != null ? t => t(nameKey, { ns: 'config' }) : this.config.name
      ),
      this.assemblyTypeTag,
      TAG_INTERIOR_WALLS
    ]
  }
}
