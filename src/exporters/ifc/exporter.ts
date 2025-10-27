import { vec2 } from 'gl-matrix'

import { getModelActions } from '@/building/store'
import type { Perimeter, PerimeterWall, Storey } from '@/building/model'
import { getConfigActions } from '@/construction/config'
import type { FloorAssemblyConfig } from '@/construction/config/types'
import { FLOOR_ASSEMBLIES } from '@/construction/floors'
import { createWallStoreyContext } from '@/construction/walls/segmentation'
import type { Polygon2D, PolygonWithHoles2D } from '@/shared/geometry'
import {
  arePolygonsIntersecting,
  polygonIsClockwise,
  subtractPolygons,
  unionPolygons
} from '@/shared/geometry/polygon'
import { downloadFile } from '@/shared/utils/downloadFile'

import { StepWriter, stepEnum, stepRaw, stepRef } from './stepWriter'

interface StoreyRuntimeInfo {
  readonly storey: Storey
  readonly elevation: number
  readonly floorConfig: FloorAssemblyConfig
  readonly wallHeight: number
}

interface IfcContext {
  readonly ownerHistory: number
  readonly modelContext: number
  readonly unitAssignment: number
  readonly worldPlacement: number
  readonly zAxis: number
  readonly xAxis: number
}

interface FloorGeometry {
  readonly storeyId: Storey['id']
  readonly polygons: PolygonWithHoles2D[]
  readonly thickness: number
}

const LENGTH_UNIT_PREFIX = 'MILLI'
const LENGTH_UNIT_NAME = 'METRE'
const IFCP_PROFILE_TYPE_AREA = stepEnum('AREA')

export async function exportCurrentModelToIfc(): Promise<void> {
  const writer = new StepWriter()
  const ifcContext = createIfcContext(writer)

  const { getStoreysOrderedByLevel, getPerimetersByStorey, getFloorOpeningsByStorey, getFloorAreasByStorey } =
    getModelActions()
  const { getFloorAssemblyById, getWallAssemblyById } = getConfigActions()

  const orderedStoreys = getStoreysOrderedByLevel()
  if (orderedStoreys.length === 0) {
    throw new Error('Cannot export IFC without any storeys')
  }

  const storeyInfos = buildStoreyRuntimeInfo(orderedStoreys, getFloorAssemblyById)
  const floorGeometry = computeFloorGeometry(
    storeyInfos,
    getPerimetersByStorey,
    getFloorAreasByStorey,
    getFloorOpeningsByStorey
  )

  const rootPlacement = createAxisPlacement(writer, [0, 0, 0], ifcContext.zAxis, ifcContext.xAxis)
  const sitePlacement = createLocalPlacement(writer, null, rootPlacement)
  const buildingPlacement = createLocalPlacement(writer, sitePlacement, rootPlacement)

  const projectId = writer.addEntity('IFCPROJECT', [
    createIfcGuid(),
    stepRef(ifcContext.ownerHistory),
    'Strawbaler Project',
    null,
    null,
    null,
    null,
    [stepRef(ifcContext.modelContext)],
    stepRef(ifcContext.unitAssignment)
  ])

  const siteId = writer.addEntity('IFCSITE', [
    createIfcGuid(),
    stepRef(ifcContext.ownerHistory),
    'Site',
    null,
    null,
    stepRef(sitePlacement),
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    stepEnum('ELEMENT'),
    null,
    null
  ])

  const buildingId = writer.addEntity('IFCBUILDING', [
    createIfcGuid(),
    stepRef(ifcContext.ownerHistory),
    'Building',
    null,
    null,
    stepRef(buildingPlacement),
    null,
    null,
    null,
    stepEnum('ELEMENT'),
    null,
    null,
    null
  ])

  writer.addEntity('IFCRELAGGREGATES', [
    createIfcGuid(),
    stepRef(ifcContext.ownerHistory),
    'Project Structure',
    null,
    stepRef(projectId),
    [stepRef(siteId)]
  ])

  writer.addEntity('IFCRELAGGREGATES', [
    createIfcGuid(),
    stepRef(ifcContext.ownerHistory),
    'Site Structure',
    null,
    stepRef(siteId),
    [stepRef(buildingId)]
  ])

  const allStoreyIds: number[] = []
  const storeyDistribution: Array<{ storeyId: number; elements: number[] }> = []

  for (const info of storeyInfos) {
    const storeyPlacement = createLocalPlacementForStorey(writer, buildingPlacement, info.elevation, ifcContext)
    const storeyId = writer.addEntity('IFCBUILDINGSTOREY', [
      createIfcGuid(),
      stepRef(ifcContext.ownerHistory),
      info.storey.name,
      null,
      null,
      stepRef(storeyPlacement),
      null,
      null,
      stepEnum('ELEMENT'),
      info.elevation
    ])

    allStoreyIds.push(storeyId)

    const perimeterElements: number[] = []
    const perimeters = getPerimetersByStorey(info.storey.id)
    for (const perimeter of perimeters) {
      perimeterElements.push(
        ...createWallsForPerimeter(writer, perimeter, info, storeyPlacement, getWallAssemblyById, ifcContext)
      )
    }

    const floors = floorGeometry.filter(f => f.storeyId === info.storey.id)
    for (const floor of floors) {
      const floorElement = createFloorSlab(writer, floor, storeyPlacement, info, ifcContext)
      perimeterElements.push(floorElement)
    }

    storeyDistribution.push({ storeyId, elements: perimeterElements })
  }

  writer.addEntity('IFCRELAGGREGATES', [
    createIfcGuid(),
    stepRef(ifcContext.ownerHistory),
    'Building Structure',
    null,
    stepRef(buildingId),
    allStoreyIds.map(stepRef)
  ])

  for (const distribution of storeyDistribution) {
    if (distribution.elements.length === 0) continue
    writer.addEntity('IFCRELCONTAINEDINSPATIALSTRUCTURE', [
      createIfcGuid(),
      stepRef(ifcContext.ownerHistory),
      `Elements in ${distribution.storeyId}`,
      null,
      distribution.elements.map(stepRef),
      stepRef(distribution.storeyId)
    ])
  }

  const ifcContent = writer.build()
  downloadFile(ifcContent, generateFilename('ifc'), 'application/x-step')
}

function createIfcContext(writer: StepWriter): IfcContext {
  const zAxis = createDirection(writer, [0, 0, 1])
  const xAxis = createDirection(writer, [1, 0, 0])
  const originPoint = createCartesianPoint(writer, [0, 0, 0])
  const worldPlacement = writer.addEntity('IFCAXIS2PLACEMENT3D', [
    stepRef(originPoint),
    stepRef(zAxis),
    stepRef(xAxis)
  ])

  const modelContext = writer.addEntity('IFCGEOMETRICREPRESENTATIONCONTEXT', [
    null,
    'Model',
    3,
    1e-5,
    stepRef(worldPlacement),
    null
  ])

  const lengthUnit = writer.addEntity('IFCSIUNIT', [
    stepEnum('LENGTHUNIT'),
    LENGTH_UNIT_PREFIX ? stepEnum(LENGTH_UNIT_PREFIX) : null,
    stepEnum(LENGTH_UNIT_NAME),
    null
  ])
  const areaUnit = writer.addEntity('IFCSIUNIT', [stepEnum('AREAUNIT'), null, stepEnum('SQUARE_METRE'), null])
  const volumeUnit = writer.addEntity('IFCSIUNIT', [stepEnum('VOLUMEUNIT'), null, stepEnum('CUBIC_METRE'), null])
  const planeAngle = writer.addEntity('IFCSIUNIT', [stepEnum('PLANEANGLEUNIT'), null, stepEnum('RADIAN'), null])

  const unitAssignment = writer.addEntity('IFCUNITASSIGNMENT', [
    [stepRef(lengthUnit), stepRef(areaUnit), stepRef(volumeUnit), stepRef(planeAngle)]
  ])

  const now = Math.floor(Date.now() / 1000)
  const person = writer.addEntity('IFCPERSON', [null, 'Strawbaler', 'User', null, null, null, null, null])
  const organization = writer.addEntity('IFCORGANIZATION', [null, 'Strawbaler', null, null, null])
  const personOrg = writer.addEntity('IFCPERSONANDORGANIZATION', [stepRef(person), stepRef(organization), null])
  const application = writer.addEntity('IFCAPPLICATION', [
    stepRef(organization),
    '1.0',
    'Strawbaler IFC Exporter',
    'STRAWBALER_IFC'
  ])
  const ownerHistory = writer.addEntity('IFCOWNERHISTORY', [
    stepRef(personOrg),
    stepRef(application),
    null,
    stepEnum('ADDED'),
    now,
    null,
    null,
    now
  ])

  return {
    ownerHistory,
    modelContext,
    unitAssignment,
    worldPlacement,
    zAxis,
    xAxis
  }
}

function buildStoreyRuntimeInfo(
  storeys: Storey[],
  getFloorAssemblyById: (id: Storey['floorAssemblyId']) => FloorAssemblyConfig | null
): StoreyRuntimeInfo[] {
  const infos: StoreyRuntimeInfo[] = []
  let elevation = 0

  for (let i = 0; i < storeys.length; i++) {
    const storey = storeys[i]
    const floorConfig = getFloorAssemblyById(storey.floorAssemblyId)
    if (!floorConfig) {
      throw new Error(`Missing floor assembly for storey ${storey.id}`)
    }

    const floorAssembly = FLOOR_ASSEMBLIES[floorConfig.type]
    const bottomOffset = floorAssembly.getBottomOffset(floorConfig)
    const constructionThickness = floorAssembly.getConstructionThickness(floorConfig)
    elevation += bottomOffset + constructionThickness

    const nextStorey = storeys[i + 1]
    const nextFloorConfig = nextStorey ? getFloorAssemblyById(nextStorey.floorAssemblyId) : null
    const storeyContext = createWallStoreyContext(storey, floorConfig, nextFloorConfig ?? null)
    const wallHeight = storeyContext.storeyHeight + storeyContext.ceilingBottomOffset + storeyContext.floorTopOffset

    infos.push({
      storey,
      elevation,
      floorConfig,
      wallHeight
    })

    elevation += floorConfig.layers.topThickness + floorAssembly.getTopOffset(floorConfig) + storey.height
  }

  return infos
}

function computeFloorGeometry(
  storeyInfos: StoreyRuntimeInfo[],
  getPerimetersByStorey: (storeyId: Storey['id']) => Perimeter[],
  getFloorAreasByStorey: (storeyId: Storey['id']) => { area: Polygon2D }[],
  getFloorOpeningsByStorey: (storeyId: Storey['id']) => { area: Polygon2D }[]
): FloorGeometry[] {
  const geometries: FloorGeometry[] = []

  for (const info of storeyInfos) {
    const perimeters = getPerimetersByStorey(info.storey.id)
    if (perimeters.length === 0) continue

    const perimeterPolygons = perimeters.map(perimeter => ({
      points: perimeter.corners.map(corner => corner.insidePoint)
    }))

    const baseAreas = [...perimeterPolygons, ...getFloorAreasByStorey(info.storey.id).map(area => area.area)]
    const mergedFootprint = unionPolygons(baseAreas)
    if (mergedFootprint.length === 0) {
      continue
    }

    const openings = getFloorOpeningsByStorey(info.storey.id).map(opening => opening.area)
    const relevantOpenings = openings.filter(opening => mergedFootprint.some(poly => arePolygonsIntersecting(poly, opening)))
    const mergedOpenings = unionPolygons(relevantOpenings)

    const polygonsWithHoles = mergedOpenings.length
      ? subtractPolygons(mergedFootprint, mergedOpenings)
      : mergedFootprint.map(polygon => ({ outer: polygon, holes: [] }))
    const floorAssembly = FLOOR_ASSEMBLIES[info.floorConfig.type]

    geometries.push({
      storeyId: info.storey.id,
      polygons: polygonsWithHoles,
      thickness: floorAssembly.getConstructionThickness(info.floorConfig)
    })
  }

  return geometries
}

function createWallsForPerimeter(
  writer: StepWriter,
  perimeter: Perimeter,
  info: StoreyRuntimeInfo,
  storeyPlacement: number,
  getWallAssemblyById: (id: PerimeterWall['wallAssemblyId']) => { type: string } | null,
  ifcContext: IfcContext
): number[] {
  const elements: number[] = []
  for (const wall of perimeter.walls) {
    const assemblyConfig = getWallAssemblyById(wall.wallAssemblyId)
    if (!assemblyConfig) continue
    const wallId = createWallElement(writer, wall, info, storeyPlacement, ifcContext)
    elements.push(wallId)
    const wallPropertySet = writer.addEntity('IFCPROPERTYSET', [
      createIfcGuid(),
      stepRef(ifcContext.ownerHistory),
      'Pset_StrawbalerWall',
      null,
      [
        stepRef(
          writer.addEntity('IFCPROPERTYSINGLEVALUE', [
            'Thickness',
            null,
            stepRaw(`IFCLENGTHMEASURE(${formatNumber(wall.thickness)})`),
            null
          ])
        ),
        stepRef(
          writer.addEntity('IFCPROPERTYSINGLEVALUE', [
            'AssemblyId',
            null,
            wall.wallAssemblyId ?? '',
            null
          ])
        )
      ]
    ])

    writer.addEntity('IFCRELDEFINESBYPROPERTIES', [
      createIfcGuid(),
      stepRef(ifcContext.ownerHistory),
      `Wall Properties ${wall.id}`,
      null,
      [stepRef(wallId)],
      stepRef(wallPropertySet)
    ])
  }
  return elements
}

function createWallElement(
  writer: StepWriter,
  wall: PerimeterWall,
  info: StoreyRuntimeInfo,
  storeyPlacement: number,
  ifcContext: IfcContext
): number {
  const profile = createWallProfile(writer, wall)
  const placement = createWallPlacement(writer, wall, storeyPlacement, ifcContext)
  const extrudedDirection = createDirection(writer, [0, 0, 1])
  const solid = writer.addEntity('IFCEXTRUDEDAREASOLID', [
    stepRef(profile),
    stepRef(createAxisPlacement(writer, [0, 0, 0], ifcContext.zAxis, ifcContext.xAxis)),
    stepRef(extrudedDirection),
    info.wallHeight
  ])
  const shapeRepresentation = writer.addEntity('IFCSHAPEREPRESENTATION', [
    stepRef(ifcContext.modelContext),
    'Body',
    'SweptSolid',
    [stepRef(solid)]
  ])
  const productDefinition = writer.addEntity('IFCPRODUCTDEFINITIONSHAPE', [null, null, [stepRef(shapeRepresentation)]])

  const wallId = writer.addEntity('IFCWALLSTANDARDCASE', [
    createIfcGuid(),
    stepRef(ifcContext.ownerHistory),
    wall.id,
    null,
    null,
    stepRef(placement),
    stepRef(productDefinition),
    null,
    null
  ])

  for (const opening of wall.openings) {
    createOpeningElement(writer, opening, wall, wallId, placement, ifcContext)
  }

  return wallId
}

function createOpeningElement(
  writer: StepWriter,
  opening: PerimeterWall['openings'][number],
  wall: PerimeterWall,
  wallId: number,
  wallPlacement: number,
  ifcContext: IfcContext
): void {
  const openingPlacement = createLocalPlacement(
    writer,
    wallPlacement,
    createAxisPlacement(writer, [opening.offsetFromStart, 0, opening.sillHeight ?? 0], ifcContext.zAxis, ifcContext.xAxis)
  )

  const profile = createRectangleProfile(writer, opening.width, wall.thickness)
  const extrudedDirection = createDirection(writer, [0, 0, 1])
  const solid = writer.addEntity('IFCEXTRUDEDAREASOLID', [
    stepRef(profile),
    stepRef(createAxisPlacement(writer, [0, 0, 0], ifcContext.zAxis, ifcContext.xAxis)),
    stepRef(extrudedDirection),
    opening.height
  ])
  const shapeRepresentation = writer.addEntity('IFCSHAPEREPRESENTATION', [
    stepRef(ifcContext.modelContext),
    'Body',
    'SweptSolid',
    [stepRef(solid)]
  ])
  const productDefinition = writer.addEntity('IFCPRODUCTDEFINITIONSHAPE', [null, null, [stepRef(shapeRepresentation)]])

  const openingElement = writer.addEntity('IFCOPENINGELEMENT', [
    createIfcGuid(),
    stepRef(ifcContext.ownerHistory),
    `${opening.type.toUpperCase()}-${opening.id}`,
    null,
    null,
    stepRef(openingPlacement),
    stepRef(productDefinition),
    null,
    null
  ])

  writer.addEntity('IFCRELVOIDSELEMENT', [
    createIfcGuid(),
    stepRef(ifcContext.ownerHistory),
    `Voids-${opening.id}`,
    null,
    stepRef(wallId),
    stepRef(openingElement)
  ])

  const propertySet = writer.addEntity('IFCPROPERTYSET', [
    createIfcGuid(),
    stepRef(ifcContext.ownerHistory),
    'Pset_StrawbalerOpening',
    null,
    [
      stepRef(
        writer.addEntity('IFCPROPERTYSINGLEVALUE', [
          'Width',
          null,
          stepRaw(`IFCLENGTHMEASURE(${formatNumber(opening.width)})`),
          null
        ])
      ),
      stepRef(
        writer.addEntity('IFCPROPERTYSINGLEVALUE', [
          'Height',
          null,
          stepRaw(`IFCLENGTHMEASURE(${formatNumber(opening.height)})`),
          null
        ])
      ),
      stepRef(
        writer.addEntity('IFCPROPERTYSINGLEVALUE', [
          'SillHeight',
          null,
          stepRaw(`IFCLENGTHMEASURE(${formatNumber(opening.sillHeight ?? 0)})`),
          null
        ])
      ),
      stepRef(
        writer.addEntity('IFCPROPERTYSINGLEVALUE', [
          'Type',
          null,
          opening.type,
          null
        ])
      )
    ]
  ])

  writer.addEntity('IFCRELDEFINESBYPROPERTIES', [
    createIfcGuid(),
    stepRef(ifcContext.ownerHistory),
    `OpeningProperties-${opening.id}`,
    null,
    [stepRef(openingElement)],
    stepRef(propertySet)
  ])
}

function createFloorSlab(
  writer: StepWriter,
  floor: FloorGeometry,
  storeyPlacement: number,
  info: StoreyRuntimeInfo,
  ifcContext: IfcContext
): number {
  if (floor.polygons.length === 0) {
    throw new Error(`No floor geometry generated for storey ${floor.storeyId}`)
  }

  const slabPlacement = createLocalPlacement(
    writer,
    storeyPlacement,
    createAxisPlacement(writer, [0, 0, 0], ifcContext.zAxis, ifcContext.xAxis)
  )

  const solids = floor.polygons.map(polygon => createFloorSolid(writer, polygon, floor.thickness, ifcContext))
  const shapeRepresentation = writer.addEntity('IFCSHAPEREPRESENTATION', [
    stepRef(ifcContext.modelContext),
    'Body',
    'SweptSolid',
    solids.map(stepRef)
  ])
  const productDefinition = writer.addEntity('IFCPRODUCTDEFINITIONSHAPE', [null, null, [stepRef(shapeRepresentation)]])

  const slabId = writer.addEntity('IFCSLAB', [
    createIfcGuid(),
    stepRef(ifcContext.ownerHistory),
    `Floor-${info.storey.id}`,
    null,
    null,
    stepRef(slabPlacement),
    stepRef(productDefinition),
    null,
    stepEnum('FLOOR')
  ])

  const propertySet = writer.addEntity('IFCPROPERTYSET', [
    createIfcGuid(),
    stepRef(ifcContext.ownerHistory),
    'Pset_StrawbalerFloor',
    null,
    [
      stepRef(
        writer.addEntity('IFCPROPERTYSINGLEVALUE', [
          'Thickness',
          null,
          stepRaw(`IFCLENGTHMEASURE(${formatNumber(floor.thickness)})`),
          null
        ])
      )
    ]
  ])

  writer.addEntity('IFCRELDEFINESBYPROPERTIES', [
    createIfcGuid(),
    stepRef(ifcContext.ownerHistory),
    `FloorProperties-${info.storey.id}`,
    null,
    [stepRef(slabId)],
    stepRef(propertySet)
  ])

  return slabId
}

function createFloorSolid(
  writer: StepWriter,
  polygon: PolygonWithHoles2D,
  thickness: number,
  ifcContext: IfcContext
): number {
  const outerPolyline = createPolyline(writer, ensureCounterClockwise(polygon.outer))
  const holeCurves = polygon.holes.map(hole => stepRef(createPolyline(writer, ensureClockwise(hole))))

  const profile = writer.addEntity('IFCARBITRARYPROFILEDEFWITHVOIDS', [
    IFCP_PROFILE_TYPE_AREA,
    null,
    stepRef(outerPolyline),
    holeCurves
  ])

  const extrudedDirection = createDirection(writer, [0, 0, -1])
  const position = createAxisPlacement(writer, [0, 0, 0], ifcContext.zAxis, ifcContext.xAxis)

  return writer.addEntity('IFCEXTRUDEDAREASOLID', [
    stepRef(profile),
    stepRef(position),
    stepRef(extrudedDirection),
    Math.abs(thickness)
  ])
}

function createWallProfile(writer: StepWriter, wall: PerimeterWall): number {
  const origin = wall.insideLine.start
  const direction = wall.direction
  const normal = wall.outsideDirection

  const insideStart = wall.insideLine.start
  const insideEnd = wall.insideLine.end
  const outsideStart = wall.outsideLine.start
  const outsideEnd = wall.outsideLine.end

  const localPoints = [
    toLocalVec(insideStart, origin, direction, normal),
    toLocalVec(insideEnd, origin, direction, normal),
    toLocalVec(outsideEnd, origin, direction, normal),
    toLocalVec(outsideStart, origin, direction, normal)
  ]

  const cleaned = sanitiseLocalPolygon(localPoints)
  const polygon: Polygon2D = { points: cleaned }
  const polyline = createPolyline(writer, polygon)
  return writer.addEntity('IFCARBITRARYCLOSEDPROFILEDEF', [IFCP_PROFILE_TYPE_AREA, null, stepRef(polyline)])
}

function createPolyline(writer: StepWriter, polygon: Polygon2D): number {
  const points = ensureClosed(polygon.points)
  const pointRefs = points.map(point => stepRef(createCartesianPoint(writer, [point[0], point[1]])))
  return writer.addEntity('IFCPOLYLINE', [pointRefs])
}

function toLocalVec(point: vec2, origin: vec2, direction: vec2, normal: vec2): vec2 {
  const delta = vec2.subtract(vec2.create(), point, origin)
  const x = vec2.dot(delta, direction)
  const y = vec2.dot(delta, normal)
  return vec2.fromValues(cleanValue(x), cleanValue(y))
}

function sanitiseLocalPolygon(points: vec2[]): vec2[] {
  const unique: vec2[] = []
  for (const point of points) {
    if (unique.length === 0 || vec2.distance(unique[unique.length - 1], point) > 1e-6) {
      unique.push(point)
    }
  }

  if (unique.length < 3) {
    return points
  }

  const area = polygonSignedArea(unique)
  if (area < 0) {
    unique.reverse()
  }
  return unique
}

function polygonSignedArea(points: vec2[]): number {
  let area = 0
  const count = points.length
  for (let i = 0; i < count; i++) {
    const current = points[i]
    const next = points[(i + 1) % count]
    area += current[0] * next[1] - next[0] * current[1]
  }
  return area / 2
}

function cleanValue(value: number): number {
  return Math.abs(value) < 1e-6 ? 0 : value
}

function createRectangleProfile(writer: StepWriter, width: number, depth: number): number {
  const points: vec2[] = [
    vec2.fromValues(0, 0),
    vec2.fromValues(width, 0),
    vec2.fromValues(width, depth),
    vec2.fromValues(0, depth)
  ]
  const polygon: Polygon2D = { points }
  const polyline = createPolyline(writer, polygon)
  return writer.addEntity('IFCARBITRARYCLOSEDPROFILEDEF', [IFCP_PROFILE_TYPE_AREA, null, stepRef(polyline)])
}

function ensureClosed(points: vec2[]): vec2[] {
  if (points.length === 0) return points
  const first = points[0]
  const last = points[points.length - 1]
  if (vec2.distance(first, last) < 1e-6) {
    return points
  }
  return [...points, vec2.clone(first)]
}

function ensureCounterClockwise(polygon: Polygon2D): Polygon2D {
  if (!polygonIsClockwise(polygon)) {
    return polygon
  }
  return { points: [...polygon.points].reverse() }
}

function ensureClockwise(polygon: Polygon2D): Polygon2D {
  if (polygonIsClockwise(polygon)) {
    return polygon
  }
  return { points: [...polygon.points].reverse() }
}

function createCartesianPoint(writer: StepWriter, coordinates: [number, number] | [number, number, number]): number {
  return writer.addEntity('IFCCARTESIANPOINT', [[...coordinates]])
}

function createDirection(writer: StepWriter, components: [number, number] | [number, number, number]): number {
  return writer.addEntity('IFCDIRECTION', [[...components]])
}

function createAxisPlacement(
  writer: StepWriter,
  location: [number, number, number],
  axis: number,
  refDirection: number
): number {
  return writer.addEntity('IFCAXIS2PLACEMENT3D', [stepRef(createCartesianPoint(writer, location)), stepRef(axis), stepRef(refDirection)])
}

function createLocalPlacement(writer: StepWriter, relativeTo: number | null, relativePlacement: number): number {
  return writer.addEntity('IFCLOCALPLACEMENT', [relativeTo ? stepRef(relativeTo) : null, stepRef(relativePlacement)])
}

function createLocalPlacementForStorey(
  writer: StepWriter,
  buildingPlacement: number,
  elevation: number,
  ifcContext: IfcContext
): number {
  const placement = createAxisPlacement(writer, [0, 0, elevation], ifcContext.zAxis, ifcContext.xAxis)
  return createLocalPlacement(writer, buildingPlacement, placement)
}

function createWallPlacement(
  writer: StepWriter,
  wall: PerimeterWall,
  storeyPlacement: number,
  ifcContext: IfcContext
): number {
  const start = wall.insideLine.start
  const location = createCartesianPoint(writer, [start[0], start[1], 0])
  const wallDirection = createDirection(writer, [wall.direction[0], wall.direction[1], 0])
  const placement = writer.addEntity('IFCAXIS2PLACEMENT3D', [
    stepRef(location),
    stepRef(ifcContext.zAxis),
    stepRef(wallDirection)
  ])
  return createLocalPlacement(writer, storeyPlacement, placement)
}

function createGuidByteArray(): Uint8Array {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const array = new Uint8Array(16)
    crypto.getRandomValues(array)
    return array
  }
  const array = new Uint8Array(16)
  for (let i = 0; i < array.length; i++) {
    array[i] = Math.floor(Math.random() * 256)
  }
  return array
}

function createIfcGuid(): string {
  const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$'
  const data = createGuidByteArray()
  let bitString = ''
  for (const byte of data) {
    bitString += byte.toString(2).padStart(8, '0')
  }
  bitString += '0000'

  let result = ''
  for (let offset = 0; offset < 132; offset += 6) {
    const segment = bitString.slice(offset, offset + 6)
    const value = parseInt(segment, 2)
    result += charset[value]
  }
  return result
}

function generateFilename(ext: string): string {
  const timestamp = new Date().toISOString().split('T')[0]
  return `strawbaler-${timestamp}.${ext}`
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')
}
