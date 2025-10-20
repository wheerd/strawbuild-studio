import { vec2, vec3 } from 'gl-matrix'

import type { Perimeter, StoreyId } from '@/building/model'
import { getModelActions } from '@/building/store'
import {
  type Length,
  type Line2D,
  type Polygon2D,
  direction,
  distanceToInfiniteLine,
  perpendicular,
  polygonEdgeOffset,
  subtractPolygons
} from '@/shared/geometry'

import { getConfigActions } from './config'
import { FLOOR_ASSEMBLIES } from './floors'
import { type ConstructionModel, mergeModels, transformModel } from './model'
import { computeFloorConstructionPolygon, constructPerimeter } from './perimeter'
import { TAG_STOREY } from './tags'

export function constructStoreyFloor(storeyId: StoreyId): ConstructionModel[] {
  const { getPerimetersByStorey, getFloorAreasByStorey, getFloorOpeningsByStorey, getStoreyById } = getModelActions()
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
  const perimeterPolygons = perimeters.map(perimeter => computeFloorConstructionPolygon(perimeter))

  const floorAreas = getFloorAreasByStorey(storeyId).map(a => applyWallFaceOffsets(a.area, wallFaces))
  const openings = getFloorOpeningsByStorey(storeyId).map(o => applyWallFaceOffsets(o.area, wallFaces))

  const floorPolygons = subtractPolygons([...perimeterPolygons, ...floorAreas], openings)
  const floorAssembly = FLOOR_ASSEMBLIES[floorAssemblyConfig.type]
  const floorModels = floorPolygons.map(p => floorAssembly.construct(p, floorAssemblyConfig))
  return floorModels
}

export function constructStorey(storeyId: StoreyId): ConstructionModel | null {
  const { getPerimetersByStorey } = getModelActions()
  const perimeters = getPerimetersByStorey(storeyId)
  if (perimeters.length === 0) {
    return null
  }
  const perimeterModels = perimeters.map(p => constructPerimeter(p, false))
  const floorModels = constructStoreyFloor(storeyId)
  return mergeModels(...perimeterModels, ...floorModels)
}

export function constructModel(): ConstructionModel | null {
  const { getStoreysOrderedByLevel } = getModelActions()
  const { getFloorAssemblyById } = getConfigActions()
  const models: ConstructionModel[] = []
  let zOffset = 0
  for (const storey of getStoreysOrderedByLevel()) {
    const floor = getFloorAssemblyById(storey.floorAssemblyId)
    if (!floor) {
      throw new Error('Invalid floor assembly id')
    }
    const floorAssembly = FLOOR_ASSEMBLIES[floor.type]
    zOffset += floorAssembly.getBottomOffset(floor) + floorAssembly.getConstructionThickness(floor)
    const model = constructStorey(storey.id)
    if (model) {
      models.push(
        transformModel(model, { position: [0, 0, zOffset], rotation: vec3.fromValues(0, 0, 0) }, [TAG_STOREY])
      )
    }
    zOffset += floor.layers.topThickness + floorAssembly.getTopOffset(floor) + storey.height
  }
  return models.length > 0 ? mergeModels(...models) : null
}

interface WallFaceOffset {
  line: Line2D
  normal: vec2
  distance: Length
}

const PARALLEL_EPSILON = 1e-6
const DISTANCE_EPSILON = 1e-3

export function createWallFaceOffsets(perimeters: Perimeter[]): WallFaceOffset[] {
  const { getWallAssemblyById } = getConfigActions()
  const faces: WallFaceOffset[] = []

  for (const perimeter of perimeters) {
    for (const wall of perimeter.walls) {
      const assembly = getWallAssemblyById(wall.wallAssemblyId)
      if (!assembly) {
        continue
      }

      const inwardNormal = vec2.negate(vec2.create(), wall.outsideDirection)

      const insideThickness = Math.max(assembly.layers.insideThickness ?? 0, 0)
      if (insideThickness > 0) {
        faces.push({
          line: {
            point: wall.insideLine.start,
            direction: wall.direction
          },
          normal: vec2.clone(wall.outsideDirection),
          distance: insideThickness
        })
      }

      const outsideThickness = Math.max(assembly.layers.outsideThickness ?? 0, 0)
      if (outsideThickness > 0) {
        faces.push({
          line: {
            point: wall.outsideLine.start,
            direction: wall.direction
          },
          normal: vec2.clone(inwardNormal),
          distance: outsideThickness
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
      const cross = edgeDirection[0] * face.line.direction[1] - edgeDirection[1] * face.line.direction[0]
      if (Math.abs(cross) > PARALLEL_EPSILON) {
        continue
      }

      const distanceStart = distanceToInfiniteLine(start, face.line)
      const distanceEnd = distanceToInfiniteLine(end, face.line)
      if (distanceStart > DISTANCE_EPSILON || distanceEnd > DISTANCE_EPSILON) {
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
