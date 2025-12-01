import { mat4, vec2, vec3 } from 'gl-matrix'

import type { Perimeter, StoreyId } from '@/building/model'
import { getModelActions } from '@/building/store'
import {
  type Length,
  type Line2D,
  type LineSegment2D,
  type Polygon2D,
  direction,
  distanceToInfiniteLine,
  perpendicular,
  polygonEdgeOffset,
  subtractPolygons,
  unionPolygons
} from '@/shared/geometry'

import { getConfigActions } from './config'
import { FLOOR_ASSEMBLIES, constructFloorLayerModel } from './floors'
import { type ConstructionModel, mergeModels, transformModel } from './model'
import { computeFloorConstructionPolygon, constructPerimeter } from './perimeter'
import { TAG_STOREY } from './tags'
import { createWallStoreyContext } from './walls'

export function constructStoreyFloor(storeyId: StoreyId): ConstructionModel[] {
  const { getPerimetersByStorey, getFloorAreasByStorey, getFloorOpeningsByStorey, getStoreyById, getStoreyAbove } =
    getModelActions()
  const storey = getStoreyById(storeyId)
  if (!storey) {
    throw new Error('Invalid storey')
  }

  const { getFloorAssemblyById } = getConfigActions()
  const floorAssemblyConfig = getFloorAssemblyById(storey.floorAssemblyId)
  if (!floorAssemblyConfig) {
    throw new Error('Invalid floor assembly')
  }

  const perimeters = getPerimetersByStorey(storeyId)
  const wallFaces = createWallFaceOffsets(perimeters)

  const perimeterPolygons = perimeters.map(computeFloorConstructionPolygon)

  const floorAreas = getFloorAreasByStorey(storeyId).map(area => applyWallFaceOffsets(area.area, wallFaces))
  const floorOpenings = unionPolygons(
    getFloorOpeningsByStorey(storeyId).map(opening => applyWallFaceOffsets(opening.area, wallFaces))
  )

  const floorPolygons = subtractPolygons([...perimeterPolygons, ...floorAreas], floorOpenings)
  const floorAssembly = FLOOR_ASSEMBLIES[floorAssemblyConfig.type]
  const floorModels = floorPolygons.map(p => floorAssembly.construct(p, floorAssemblyConfig))

  const nextStorey = getStoreyAbove(storey.id)
  const nextFloorAssemblyConfig = nextStorey ? getFloorAssemblyById(nextStorey.floorAssemblyId) : null

  const storeyContext = createWallStoreyContext(storey, floorAssemblyConfig, nextFloorAssemblyConfig ?? null)
  const ceilingStartHeight = (storeyContext.floorTopOffset +
    storeyContext.ceilingHeight +
    storeyContext.ceilingBottomOffset) as Length

  let nextFloorOpenings: Polygon2D[] = []
  if (nextStorey && nextFloorAssemblyConfig) {
    const nextPerimeters = getPerimetersByStorey(nextStorey.id)
    if (nextPerimeters.length > 0) {
      const nextWallFaces = createWallFaceOffsets(nextPerimeters)
      nextFloorOpenings = unionPolygons(
        getFloorOpeningsByStorey(nextStorey.id).map(opening => applyWallFaceOffsets(opening.area, nextWallFaces))
      )
    }
  }

  const floorLayerModels: ConstructionModel[] = []

  const innerPolygons = perimeters.map(perimeter => ({
    points: perimeter.corners.map(corner => vec2.fromValues(corner.insidePoint[0], corner.insidePoint[1]))
  }))
  innerPolygons.forEach(finishedPolygon => {
    const floorLayerModel = constructFloorLayerModel({
      finishedPolygon,
      topHoles: floorOpenings,
      ceilingHoles: nextFloorOpenings,
      currentFloorConfig: floorAssemblyConfig,
      nextFloorConfig: nextFloorAssemblyConfig ?? null,
      floorTopOffset: storeyContext.floorTopOffset,
      ceilingStartHeight
    })

    if (floorLayerModel) {
      floorLayerModels.push(floorLayerModel)
    }
  })

  return [...floorModels, ...floorLayerModels]
}

export function constructStorey(storeyId: StoreyId): ConstructionModel | null {
  const { getPerimetersByStorey, getStoreyById } = getModelActions()
  const { getFloorAssemblyById } = getConfigActions()
  const perimeters = getPerimetersByStorey(storeyId)
  if (perimeters.length === 0) {
    return null
  }
  const storey = getStoreyById(storeyId)
  if (!storey) {
    throw new Error('Invalid storey')
  }
  const floorAssemblyConfig = getFloorAssemblyById(storey.floorAssemblyId)
  if (!floorAssemblyConfig) {
    throw new Error('Invalid floor assembly')
  }
  const floorAssembly = FLOOR_ASSEMBLIES[floorAssemblyConfig.type]
  const finishedFloorOffset = (floorAssemblyConfig.layers.topThickness +
    floorAssembly.getTopOffset(floorAssemblyConfig)) as Length
  const perimeterModels = perimeters.map(p => constructPerimeter(p, false))
  const floorModels = constructStoreyFloor(storeyId)
  const storeyModel = mergeModels(...perimeterModels, ...floorModels)
  if (finishedFloorOffset === 0) {
    return storeyModel
  }
  return transformModel(storeyModel, mat4.fromTranslation(mat4.create(), vec3.fromValues(0, 0, -finishedFloorOffset)))
}

export function constructModel(): ConstructionModel | null {
  const { getStoreysOrderedByLevel } = getModelActions()
  const models: ConstructionModel[] = []
  let finishedFloorElevation = 0
  for (const storey of getStoreysOrderedByLevel()) {
    const model = constructStorey(storey.id)
    if (model) {
      models.push(
        transformModel(model, mat4.fromTranslation(mat4.create(), vec3.fromValues(0, 0, finishedFloorElevation)), [
          TAG_STOREY
        ])
      )
    }
    finishedFloorElevation += storey.floorHeight
  }
  return models.length > 0 ? mergeModels(...models) : null
}

interface WallFaceOffset {
  line: Line2D
  segment: LineSegment2D
  normal: vec2
  distance: Length
  length: Length
}

const PARALLEL_EPSILON = 1e-6
const DISTANCE_EPSILON = 1e-3

export function createWallFaceOffsets(perimeters: Perimeter[]): WallFaceOffset[] {
  const { getWallAssemblyById } = getConfigActions()
  const faces: WallFaceOffset[] = []

  for (const perimeter of perimeters) {
    for (let wallIndex = 0; wallIndex < perimeter.walls.length; wallIndex++) {
      const wall = perimeter.walls[wallIndex]
      const assembly = getWallAssemblyById(wall.wallAssemblyId)
      if (!assembly) {
        continue
      }

      const inwardNormal = vec2.negate(vec2.create(), wall.outsideDirection)

      const insideThickness = Math.max(assembly.layers.insideThickness ?? 0, 0)
      if (insideThickness > 0) {
        const segment: LineSegment2D = {
          start: vec2.clone(perimeter.corners[wallIndex].insidePoint),
          end: vec2.clone(perimeter.corners[(wallIndex + 1) % perimeter.corners.length].insidePoint)
        }
        faces.push({
          line: {
            point: segment.start,
            direction: wall.direction
          },
          normal: vec2.clone(wall.outsideDirection),
          segment,
          distance: insideThickness,
          length: vec2.distance(segment.start, segment.end)
        })
      }

      const outsideThickness = Math.max(assembly.layers.outsideThickness ?? 0, 0)
      if (outsideThickness > 0) {
        const segment: LineSegment2D = {
          start: vec2.clone(perimeter.corners[wallIndex].outsidePoint),
          end: vec2.clone(perimeter.corners[(wallIndex + 1) % perimeter.corners.length].outsidePoint)
        }
        faces.push({
          line: {
            point: segment.start,
            direction: wall.direction
          },
          normal: vec2.clone(inwardNormal),
          segment,
          distance: outsideThickness,
          length: vec2.distance(segment.start, segment.end)
        })
      }
    }
  }

  return faces
}

export function applyWallFaceOffsets(polygon: Polygon2D, faces: WallFaceOffset[]): Polygon2D {
  if (faces.length === 0 || polygon.points.length < 3) {
    return polygon
  }

  const edgeOffsets = polygon.points.map(() => 0)
  let needsOffset = false

  for (let i = 0; i < polygon.points.length; i++) {
    const start = polygon.points[i]
    const end = polygon.points[(i + 1) % polygon.points.length]

    if (vec2.distance(start, end) < DISTANCE_EPSILON) {
      continue
    }

    const edgeDirection = direction(start, end)
    const edgeNormal = vec2.normalize(vec2.create(), perpendicular(edgeDirection))

    let selectedOffset = 0

    for (const face of faces) {
      if (face.length <= DISTANCE_EPSILON) {
        continue
      }

      const cross = edgeDirection[0] * face.line.direction[1] - edgeDirection[1] * face.line.direction[0]
      if (Math.abs(cross) > PARALLEL_EPSILON) {
        continue
      }

      const distanceStart = distanceToInfiniteLine(start, face.line)
      const distanceEnd = distanceToInfiniteLine(end, face.line)
      if (distanceStart > DISTANCE_EPSILON || distanceEnd > DISTANCE_EPSILON) {
        continue
      }

      if (!segmentsOverlap(start, end, face)) {
        continue
      }

      const alignment = vec2.dot(edgeNormal, face.normal)
      if (Math.abs(alignment) < PARALLEL_EPSILON) {
        continue
      }

      const candidateOffset = face.distance * Math.sign(alignment)
      if (Math.abs(candidateOffset) > Math.abs(selectedOffset)) {
        selectedOffset = candidateOffset
      }
    }

    if (selectedOffset !== 0) {
      needsOffset = true
      edgeOffsets[i] = selectedOffset
    }
  }

  if (!needsOffset) {
    return polygon
  }

  return polygonEdgeOffset(polygon, edgeOffsets)
}

function segmentsOverlap(edgeStart: vec2, edgeEnd: vec2, face: WallFaceOffset): boolean {
  const toStart = vec2.subtract(vec2.create(), edgeStart, face.line.point)
  const toEnd = vec2.subtract(vec2.create(), edgeEnd, face.line.point)

  const edgeProjStart = vec2.dot(toStart, face.line.direction)
  const edgeProjEnd = vec2.dot(toEnd, face.line.direction)

  const edgeMin = Math.min(edgeProjStart, edgeProjEnd)
  const edgeMax = Math.max(edgeProjStart, edgeProjEnd)

  const faceMin = -DISTANCE_EPSILON
  const faceMax = face.length + DISTANCE_EPSILON

  if (edgeMax < faceMin || edgeMin > faceMax) {
    return false
  }

  const overlapStart = Math.max(edgeMin, 0)
  const overlapEnd = Math.min(edgeMax, face.length)

  return overlapEnd >= overlapStart - DISTANCE_EPSILON
}
