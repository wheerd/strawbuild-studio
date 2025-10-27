import { vec2 } from 'gl-matrix'
import {
  Handle,
  IFC4,
  IFCAPPLICATION,
  IFCARBITRARYCLOSEDPROFILEDEF,
  IFCAXIS2PLACEMENT3D,
  IFCBUILDING,
  IFCBUILDINGSTOREY,
  IFCCARTESIANPOINT,
  IFCDIMENSIONALEXPONENTS,
  IFCDIRECTION,
  IFCEXTRUDEDAREASOLID,
  IFCGEOMETRICREPRESENTATIONCONTEXT,
  IFCIDENTIFIER,
  IFCINTEGER,
  IFCLABEL,
  IFCLENGTHMEASURE,
  IFCLOCALPLACEMENT,
  IFCMATERIAL,
  IFCMATERIALLAYER,
  IFCMATERIALLAYERSET,
  IFCMATERIALLAYERSETUSAGE,
  IFCNONNEGATIVELENGTHMEASURE,
  IFCOPENINGELEMENT,
  IFCORGANIZATION,
  IFCOWNERHISTORY,
  IFCPERSON,
  IFCPERSONANDORGANIZATION,
  IFCPOLYLINE,
  IFCPOSITIVELENGTHMEASURE,
  IFCPOSTALADDRESS,
  IFCPRODUCTDEFINITIONSHAPE,
  IFCPROJECT,
  IFCPROPERTYSET,
  IFCPROPERTYSINGLEVALUE,
  IFCREAL,
  IFCRELAGGREGATES,
  IFCRELASSOCIATESMATERIAL,
  IFCRELCONTAINEDINSPATIALSTRUCTURE,
  IFCRELDEFINESBYPROPERTIES,
  IFCRELVOIDSELEMENT,
  IFCSHAPEREPRESENTATION,
  IFCSITE,
  IFCSIUNIT,
  IFCSLAB,
  IFCTEXT,
  IFCTIMESTAMP,
  IFCUNITASSIGNMENT,
  IFCWALLSTANDARDCASE,
  IfcAPI
} from 'web-ifc'
import wasmUrl from 'web-ifc/web-ifc.wasm?url'

import type { Perimeter, PerimeterCorner, PerimeterWall, Storey } from '@/building/model'
import { getModelActions } from '@/building/store'
import { getConfigActions } from '@/construction/config'
import type { FloorAssemblyConfig } from '@/construction/config/types'
import { FLOOR_ASSEMBLIES } from '@/construction/floors'
import { createWallStoreyContext } from '@/construction/walls/segmentation'
import type { Polygon2D, PolygonWithHoles2D } from '@/shared/geometry'
import { arePolygonsIntersecting, subtractPolygons, unionPolygons } from '@/shared/geometry/polygon'
import { downloadFile } from '@/shared/utils/downloadFile'
import { getVersionString } from '@/shared/utils/version'

interface StoreyRuntimeInfo {
  readonly storey: Storey
  readonly elevation: number
  readonly floorConfig: FloorAssemblyConfig
  readonly wallHeight: number
}

interface FloorGeometry {
  readonly storeyId: Storey['id']
  readonly polygons: PolygonWithHoles2D[]
  readonly thickness: number
}

export async function exportCurrentModelToIfc(): Promise<void> {
  const exporter = new IfcExporter()
  const data = await exporter.export()
  const filename = exporter.getFilename()
  downloadFile(data, filename, 'application/octet-stream')
}

class IfcExporter {
  private readonly api = new IfcAPI()
  private modelID!: number

  private ownerHistory!: number
  private modelContext!: number
  private unitAssignment!: number
  private worldPlacement!: number
  private zAxis!: number
  private xAxis!: number

  private readonly now = Math.floor(Date.now() / 1000)
  private projectId!: number
  private siteId!: number
  private buildingId!: number
  private readonly storeyIds = new Map<string, number>()
  private readonly storeyPlacements = new Map<string, number>()

  async export(): Promise<Uint8Array> {
    await this.api.Init((path, prefix) => {
      if (path.endsWith('.wasm')) {
        return wasmUrl
      }
      return prefix + path
    })

    this.modelID = this.api.CreateModel({ schema: 'IFC4' })

    this.initialiseContext()

    const { getStoreysOrderedByLevel, getPerimetersByStorey, getFloorOpeningsByStorey, getFloorAreasByStorey } =
      getModelActions()
    const { getFloorAssemblyById, getWallAssemblyById } = getConfigActions()

    const orderedStoreys = getStoreysOrderedByLevel()
    if (orderedStoreys.length === 0) {
      throw new Error('Cannot export IFC without any storeys')
    }

    const storeyInfos = this.buildStoreyRuntimeInfo(orderedStoreys, getFloorAssemblyById)
    const floorGeometry = this.computeFloorGeometry(
      storeyInfos,
      getPerimetersByStorey,
      getFloorAreasByStorey,
      getFloorOpeningsByStorey
    )

    this.createSpatialStructure(storeyInfos)

    const wallMaterialCache = new Map<string, number>()

    for (const info of storeyInfos) {
      const storeyPlacement = this.storeyPlacements.get(info.storey.id)
      if (storeyPlacement == null) continue

      const perimeters = getPerimetersByStorey(info.storey.id)
      const elements: number[] = []

      for (const perimeter of perimeters) {
        elements.push(
          ...this.createWallsForPerimeter(perimeter, info, storeyPlacement, getWallAssemblyById, wallMaterialCache)
        )
      }

      for (const floor of floorGeometry.filter(f => f.storeyId === info.storey.id)) {
        const slabId = this.createFloorSlab(floor, storeyPlacement)
        elements.push(slabId)
      }

      if (elements.length > 0) {
        const storeyId = this.storeyIds.get(info.storey.id)
        if (storeyId != null) {
          this.createEntity(
            IFCRELCONTAINEDINSPATIALSTRUCTURE,
            this.globalId(),
            this.ownerHistory,
            null,
            null,
            elements.map(id => new Handle(id)),
            new Handle(storeyId)
          )
        }
      }
    }

    const data = this.api.SaveModel(this.modelID)
    this.api.CloseModel(this.modelID)
    return data
  }

  getFilename(): string {
    const timestamp = new Date().toISOString().split('T')[0]
    return `strawbaler-${timestamp}.ifc`
  }

  // --- context and setup ---

  private initialiseContext(): void {
    this.ownerHistory = this.createOwnerHistory()
    this.setupUnits()
    this.createGeometricContext()
  }

  private createOwnerHistory(): number {
    const familyName = this.label('Strawbaler')
    const givenName = this.label('User')
    const person = this.createEntity(IFCPERSON, null, familyName, givenName, null, null, null, null, null)

    const organisation = this.createEntity(IFCORGANIZATION, null, this.label('Strawbaler'), null, null, null)

    const personOrg = this.createEntity(IFCPERSONANDORGANIZATION, new Handle(person), new Handle(organisation), null)

    const version = this.label(getVersionString())
    const application = this.createEntity(
      IFCAPPLICATION,
      new Handle(organisation),
      version,
      this.label('Strawbaler Online'),
      this.identifier('Strawbaler-Online')
    )

    const timestamp = this.api.CreateIfcType(this.modelID, IFCTIMESTAMP, this.now)

    return this.createEntity(
      IFCOWNERHISTORY,
      new Handle(personOrg),
      new Handle(application),
      null,
      null,
      null,
      null,
      null,
      timestamp
    )
  }

  private setupUnits(): void {
    const lengthUnit = this.createEntity(
      IFCSIUNIT,
      null,
      IFC4.IfcUnitEnum.LENGTHUNIT,
      IFC4.IfcSIPrefix.MILLI,
      IFC4.IfcSIUnitName.METRE
    )

    const areaUnit = this.createEntity(
      IFCSIUNIT,
      null,
      IFC4.IfcUnitEnum.AREAUNIT,
      null,
      IFC4.IfcSIUnitName.SQUARE_METRE
    )

    const volumeUnit = this.createEntity(
      IFCSIUNIT,
      null,
      IFC4.IfcUnitEnum.VOLUMEUNIT,
      null,
      IFC4.IfcSIUnitName.CUBIC_METRE
    )

    const planeAngleUnit = this.createEntity(
      IFCSIUNIT,
      null,
      IFC4.IfcUnitEnum.PLANEANGLEUNIT,
      null,
      IFC4.IfcSIUnitName.RADIAN
    )

    this.unitAssignment = this.createEntity(IFCUNITASSIGNMENT, [
      new Handle(lengthUnit),
      new Handle(areaUnit),
      new Handle(volumeUnit),
      new Handle(planeAngleUnit)
    ])
  }

  private createGeometricContext(): void {
    const origin = this.createCartesianPoint([0, 0, 0])
    this.zAxis = this.createDirection([0, 0, 1])
    this.xAxis = this.createDirection([1, 0, 0])

    this.worldPlacement = this.createEntity(
      IFCAXIS2PLACEMENT3D,
      new Handle(origin),
      new Handle(this.zAxis),
      new Handle(this.xAxis)
    )

    this.modelContext = this.createEntity(
      IFCGEOMETRICREPRESENTATIONCONTEXT,
      null,
      this.label('Model'),
      this.api.CreateIfcType(this.modelID, IFCINTEGER, 3),
      this.api.CreateIfcType(this.modelID, IFCREAL, 0.01),
      new Handle(this.worldPlacement),
      null
    )
  }

  private createSpatialStructure(storeyInfos: StoreyRuntimeInfo[]): void {
    this.projectId = this.createEntity(
      IFCPROJECT,
      this.globalId(),
      this.ownerHistory,
      this.label('Strawbaler Project'),
      null,
      null,
      null,
      [new Handle(this.modelContext)],
      new Handle(this.unitAssignment)
    )

    const sitePlacement = this.createEntity(IFCLOCALPLACEMENT, null, new Handle(this.worldPlacement))

    this.siteId = this.createEntity(
      IFCSITE,
      this.globalId(),
      this.ownerHistory,
      this.label('Site'),
      null,
      null,
      new Handle(sitePlacement),
      null,
      null,
      null,
      null,
      null,
      null,
      null
    )

    const buildingPlacement = this.createEntity(
      IFCLOCALPLACEMENT,
      new Handle(sitePlacement),
      new Handle(this.worldPlacement)
    )

    const address = this.createDefaultPostalAddress()

    this.buildingId = this.createEntity(
      IFCBUILDING,
      this.globalId(),
      this.ownerHistory,
      this.label('Building'),
      null,
      null,
      new Handle(buildingPlacement),
      null,
      null,
      this.real(0),
      null,
      new Handle(address)
    )

    this.createEntity(IFCRELAGGREGATES, this.globalId(), this.ownerHistory, null, null, new Handle(this.projectId), [
      new Handle(this.siteId)
    ])

    this.createEntity(IFCRELAGGREGATES, this.globalId(), this.ownerHistory, null, null, new Handle(this.siteId), [
      new Handle(this.buildingId)
    ])

    for (const info of storeyInfos) {
      const placement = this.createEntity(
        IFCLOCALPLACEMENT,
        new Handle(buildingPlacement),
        new Handle(this.createAxisPlacement([0, 0, info.elevation]))
      )
      this.storeyPlacements.set(info.storey.id, placement)

      const storeyId = this.createEntity(
        IFCBUILDINGSTOREY,
        this.globalId(),
        this.ownerHistory,
        this.label(info.storey.name),
        null,
        null,
        new Handle(placement),
        null,
        this.real(info.storey.level),
        this.real(info.elevation)
      )
      this.storeyIds.set(info.storey.id, storeyId)

      this.createEntity(IFCRELAGGREGATES, this.globalId(), this.ownerHistory, null, null, new Handle(this.buildingId), [
        new Handle(storeyId)
      ])
    }
  }

  private createDefaultPostalAddress(): number {
    return this.createEntity(
      IFCPOSTALADDRESS,
      IFC4.IfcAddressTypeEnum.OFFICE,
      null,
      null,
      null,
      [this.label('Main Office')],
      null,
      this.label('Strawbaler Town'),
      null,
      null,
      this.label('Unknown Country')
    )
  }

  private buildStoreyRuntimeInfo(
    storeys: Storey[],
    getFloorAssemblyById: (id: Storey['floorAssemblyId']) => FloorAssemblyConfig | null
  ): StoreyRuntimeInfo[] {
    const infos: StoreyRuntimeInfo[] = []
    let elevation = 0

    for (let index = 0; index < storeys.length; index++) {
      const storey = storeys[index]
      const floorConfig = getFloorAssemblyById(storey.floorAssemblyId)
      if (!floorConfig) {
        throw new Error(`Missing floor assembly for storey ${storey.id}`)
      }

      const nextStorey = storeys[index + 1]
      const nextFloorConfig = nextStorey ? getFloorAssemblyById(nextStorey.floorAssemblyId) : null
      const storeyContext = createWallStoreyContext(storey, floorConfig, nextFloorConfig ?? null)

      const floorAssembly = FLOOR_ASSEMBLIES[floorConfig.type]
      const bottomOffset = floorAssembly.getBottomOffset(floorConfig)
      const constructionThickness = floorAssembly.getConstructionThickness(floorConfig)

      elevation += bottomOffset + constructionThickness

      infos.push({
        storey,
        elevation,
        floorConfig,
        wallHeight: storeyContext.storeyHeight + storeyContext.floorTopOffset + storeyContext.ceilingBottomOffset
      })

      elevation += floorConfig.layers.topThickness + floorAssembly.getTopOffset(floorConfig) + storey.height
    }

    return infos
  }

  private computeFloorGeometry(
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
        points: perimeter.corners.map(corner => corner.outsidePoint)
      }))

      const baseAreas = [...perimeterPolygons, ...getFloorAreasByStorey(info.storey.id).map(area => area.area)]
      const mergedFootprint = unionPolygons(baseAreas)
      if (mergedFootprint.length === 0) {
        continue
      }

      const openings = getFloorOpeningsByStorey(info.storey.id).map(opening => opening.area)
      const relevantOpenings = openings.filter(opening =>
        mergedFootprint.some(poly => arePolygonsIntersecting(poly, opening))
      )
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

  private createWallsForPerimeter(
    perimeter: Perimeter,
    info: StoreyRuntimeInfo,
    storeyPlacement: number,
    getWallAssemblyById: (id: PerimeterWall['wallAssemblyId']) => { type: string } | null,
    materialUsageCache: Map<string, number>
  ): number[] {
    const elements: number[] = []

    for (let index = 0; index < perimeter.walls.length; index++) {
      const wall = perimeter.walls[index]
      const assemblyConfig = getWallAssemblyById(wall.wallAssemblyId)
      if (!assemblyConfig) continue

      const startCorner = perimeter.corners[index]
      const endCorner = perimeter.corners[(index + 1) % perimeter.corners.length]

      const wallId = this.createWallElement(wall, startCorner, endCorner, info, storeyPlacement, materialUsageCache)
      elements.push(wallId)
    }

    return elements
  }

  private createWallElement(
    wall: PerimeterWall,
    startCorner: PerimeterCorner,
    endCorner: PerimeterCorner,
    info: StoreyRuntimeInfo,
    storeyPlacement: number,
    materialUsageCache: Map<string, number>
  ): number {
    const profile = this.createWallProfile(wall, startCorner, endCorner)
    const placement = this.createWallPlacement(wall, startCorner, storeyPlacement)

    const solid = this.createEntity(
      IFCEXTRUDEDAREASOLID,
      new Handle(profile),
      new Handle(this.createAxisPlacement([0, 0, 0])),
      new Handle(this.zAxis),
      this.api.CreateIfcType(this.modelID, IFCREAL, info.wallHeight)
    )

    const representation = this.createEntity(
      IFCSHAPEREPRESENTATION,
      new Handle(this.modelContext),
      this.label('Body'),
      this.label('SweptSolid'),
      [new Handle(solid)]
    )

    const productDefinition = this.createEntity(IFCPRODUCTDEFINITIONSHAPE, null, null, [new Handle(representation)])

    const wallId = this.createEntity(
      IFCWALLSTANDARDCASE,
      this.globalId(),
      this.ownerHistory,
      this.label(wall.id),
      null,
      null,
      new Handle(placement),
      new Handle(productDefinition),
      null,
      null
    )

    const materialUsageId = this.ensureWallMaterialUsage(wall.wallAssemblyId, wall.thickness, materialUsageCache)

    this.createEntity(
      IFCRELASSOCIATESMATERIAL,
      this.globalId(),
      this.ownerHistory,
      null,
      null,
      [new Handle(wallId)],
      new Handle(materialUsageId)
    )

    const propertySet = this.createEntity(
      IFCPROPERTYSET,
      this.globalId(),
      this.ownerHistory,
      this.label('Pset_StrawbalerWall'),
      null,
      [
        new Handle(
          this.createEntity(
            IFCPROPERTYSINGLEVALUE,
            this.label('Thickness'),
            null,
            this.api.CreateIfcType(this.modelID, IFCPOSITIVELENGTHMEASURE, wall.thickness),
            null
          )
        ),
        new Handle(
          this.createEntity(
            IFCPROPERTYSINGLEVALUE,
            this.label('AssemblyId'),
            null,
            this.label(wall.wallAssemblyId ?? 'unknown'),
            null
          )
        )
      ]
    )

    this.createEntity(
      IFCRELDEFINESBYPROPERTIES,
      this.globalId(),
      this.ownerHistory,
      null,
      null,
      [new Handle(wallId)],
      new Handle(propertySet)
    )

    for (const opening of wall.openings) {
      this.createOpeningElement(opening, wall, wallId, placement)
    }

    return wallId
  }

  private createOpeningElement(
    opening: PerimeterWall['openings'][number],
    wall: PerimeterWall,
    wallId: number,
    wallPlacement: number
  ): void {
    const placement = this.createEntity(
      IFCLOCALPLACEMENT,
      new Handle(wallPlacement),
      new Handle(this.createAxisPlacement([opening.offsetFromStart, 0, opening.sillHeight ?? 0]))
    )

    const profile = this.createRectangleProfile(opening.width, wall.thickness)

    const solid = this.createEntity(
      IFCEXTRUDEDAREASOLID,
      new Handle(profile),
      new Handle(this.createAxisPlacement([0, 0, 0])),
      new Handle(this.zAxis),
      this.api.CreateIfcType(this.modelID, IFCREAL, opening.height)
    )

    const representation = this.createEntity(
      IFCSHAPEREPRESENTATION,
      new Handle(this.modelContext),
      this.label('Body'),
      this.label('SweptSolid'),
      [new Handle(solid)]
    )

    const productDefinition = this.createEntity(IFCPRODUCTDEFINITIONSHAPE, null, null, [new Handle(representation)])

    const openingId = this.createEntity(
      IFCOPENINGELEMENT,
      this.globalId(),
      this.ownerHistory,
      this.label(`${opening.type}-${opening.id}`),
      null,
      null,
      new Handle(placement),
      new Handle(productDefinition),
      null,
      null
    )

    this.createEntity(
      IFCRELVOIDSELEMENT,
      this.globalId(),
      this.ownerHistory,
      null,
      null,
      new Handle(wallId),
      new Handle(openingId)
    )

    const propertySet = this.createEntity(
      IFCPROPERTYSET,
      this.globalId(),
      this.ownerHistory,
      this.label('Pset_StrawbalerOpening'),
      null,
      [
        new Handle(
          this.createEntity(
            IFCPROPERTYSINGLEVALUE,
            this.label('Width'),
            null,
            this.api.CreateIfcType(this.modelID, IFCPOSITIVELENGTHMEASURE, opening.width),
            null
          )
        ),
        new Handle(
          this.createEntity(
            IFCPROPERTYSINGLEVALUE,
            this.label('Height'),
            null,
            this.api.CreateIfcType(this.modelID, IFCPOSITIVELENGTHMEASURE, opening.height),
            null
          )
        ),
        new Handle(
          this.createEntity(
            IFCPROPERTYSINGLEVALUE,
            this.label('SillHeight'),
            null,
            this.api.CreateIfcType(this.modelID, IFCNONNEGATIVELENGTHMEASURE, opening.sillHeight ?? 0),
            null
          )
        ),
        new Handle(
          this.createEntity(
            IFCPROPERTYSINGLEVALUE,
            this.label('Type'),
            null,
            this.label(opening.type.toUpperCase()),
            null
          )
        )
      ]
    )

    this.createEntity(
      IFCRELDEFINESBYPROPERTIES,
      this.globalId(),
      this.ownerHistory,
      null,
      null,
      [new Handle(openingId)],
      new Handle(propertySet)
    )
  }

  private createFloorSlab(floor: FloorGeometry, storeyPlacement: number): number {
    const profileSolids = floor.polygons.map(polygon => this.createFloorSolid(polygon, floor.thickness))

    const representation = this.createEntity(
      IFCSHAPEREPRESENTATION,
      new Handle(this.modelContext),
      this.label('Body'),
      this.label('SweptSolid'),
      profileSolids.map(id => new Handle(id))
    )

    const productDefinition = this.createEntity(IFCPRODUCTDEFINITIONSHAPE, null, null, [new Handle(representation)])

    const slabPlacement = this.createEntity(
      IFCLOCALPLACEMENT,
      new Handle(storeyPlacement),
      new Handle(this.createAxisPlacement([0, 0, 0]))
    )

    const slabId = this.createEntity(
      IFCSLAB,
      this.globalId(),
      this.ownerHistory,
      this.label('Floor'),
      null,
      null,
      new Handle(slabPlacement),
      new Handle(productDefinition),
      null,
      IFC4.IfcSlabTypeEnum.FLOOR
    )

    const propertySet = this.createEntity(
      IFCPROPERTYSET,
      this.globalId(),
      this.ownerHistory,
      this.label('Pset_StrawbalerFloor'),
      null,
      [
        new Handle(
          this.createEntity(
            IFCPROPERTYSINGLEVALUE,
            this.label('Thickness'),
            null,
            this.api.CreateIfcType(this.modelID, IFCPOSITIVELENGTHMEASURE, floor.thickness),
            null
          )
        )
      ]
    )

    this.createEntity(
      IFCRELDEFINESBYPROPERTIES,
      this.globalId(),
      this.ownerHistory,
      null,
      null,
      [new Handle(slabId)],
      new Handle(propertySet)
    )

    return slabId
  }

  private createFloorSolid(polygon: PolygonWithHoles2D, thickness: number): number {
    const outer = this.createPolyline(polygon.outer)
    const profile = this.createEntity(
      IFCARBITRARYCLOSEDPROFILEDEF,
      IFC4.IfcProfileTypeEnum.AREA,
      null,
      new Handle(outer)
    )

    return this.createEntity(
      IFCEXTRUDEDAREASOLID,
      new Handle(profile),
      new Handle(this.createAxisPlacement([0, 0, 0])),
      new Handle(this.zAxis),
      this.api.CreateIfcType(this.modelID, IFCREAL, thickness)
    )
  }

  private createWallProfile(wall: PerimeterWall, startCorner: PerimeterCorner, endCorner: PerimeterCorner): number {
    const origin = startCorner.insidePoint
    const direction = wall.direction
    const normal = wall.outsideDirection

    const insideStart = startCorner.insidePoint
    const insideEnd = endCorner.insidePoint
    const outsideStart = startCorner.outsidePoint
    const outsideEnd = endCorner.outsidePoint

    const localPoints = [insideStart, insideEnd, outsideEnd, outsideStart].map(point =>
      this.toLocal(point, origin, direction, normal)
    )

    return this.createRectanglePolyline(localPoints)
  }

  private createRectangleProfile(width: number, depth: number): number {
    const points: vec2[] = [
      vec2.fromValues(0, 0),
      vec2.fromValues(width, 0),
      vec2.fromValues(width, depth),
      vec2.fromValues(0, depth)
    ]

    return this.createRectanglePolyline(points)
  }

  private createRectanglePolyline(points: vec2[]): number {
    const polyline = this.createPolyline({ points: [...points, vec2.clone(points[0])] })
    return this.createEntity(IFCARBITRARYCLOSEDPROFILEDEF, IFC4.IfcProfileTypeEnum.AREA, null, new Handle(polyline))
  }

  private createPolyline(polygon: Polygon2D): number {
    const points = polygon.points
    const pointIds = points.map(point => this.createCartesianPoint([point[0], point[1], 0]))

    return this.createEntity(
      IFCPOLYLINE,
      pointIds.map(id => new Handle(id))
    )
  }

  private createAxisPlacement(location: [number, number, number]): number {
    const point = this.createCartesianPoint(location)
    return this.createEntity(IFCAXIS2PLACEMENT3D, new Handle(point), new Handle(this.zAxis), new Handle(this.xAxis))
  }

  private createWallPlacement(wall: PerimeterWall, startCorner: PerimeterCorner, storeyPlacement: number): number {
    const location = this.createCartesianPoint([startCorner.insidePoint[0], startCorner.insidePoint[1], 0])
    const wallDirection = this.createDirection([wall.direction[0], wall.direction[1], 0])
    const placement = this.createEntity(
      IFCAXIS2PLACEMENT3D,
      new Handle(location),
      new Handle(this.zAxis),
      new Handle(wallDirection)
    )
    return this.createEntity(IFCLOCALPLACEMENT, new Handle(storeyPlacement), new Handle(placement))
  }

  private ensureWallMaterialUsage(assemblyId: string, thickness: number, cache: Map<string, number>): number {
    const key = `${assemblyId}:${thickness}`
    const cached = cache.get(key)
    if (cached) return cached

    const materialId = this.createEntity(IFCMATERIAL, this.label(`Wall ${assemblyId}`), null, null)
    const layerId = this.createEntity(
      IFCMATERIALLAYER,
      new Handle(materialId),
      this.api.CreateIfcType(this.modelID, IFCPOSITIVELENGTHMEASURE, thickness),
      null,
      null,
      null,
      null,
      null
    )

    const layerSetId = this.createEntity(
      IFCMATERIALLAYERSET,
      [new Handle(layerId)],
      this.label(`Wall ${assemblyId}`),
      null
    )

    const usageId = this.createEntity(
      IFCMATERIALLAYERSETUSAGE,
      new Handle(layerSetId),
      IFC4.IfcLayerSetDirectionEnum.AXIS2,
      IFC4.IfcDirectionSenseEnum.POSITIVE,
      this.api.CreateIfcType(this.modelID, IFCLENGTHMEASURE, 0),
      null
    )

    cache.set(key, usageId)
    return usageId
  }

  // --- helpers ---

  private createEntity(type: number, ...args: unknown[]): number {
    const entity = this.api.CreateIfcEntity(this.modelID, type, ...args)
    this.api.WriteLine(this.modelID, entity)
    return entity.expressID
  }

  private createDimensionalExponents(...exponents: readonly number[]): number {
    return this.createEntity(IFCDIMENSIONALEXPONENTS, ...exponents)
  }

  private createCartesianPoint(coordinates: [number, number, number]): number {
    return this.createEntity(IFCCARTESIANPOINT, coordinates)
  }

  private createDirection(components: [number, number, number] | [number, number]): number {
    const normalized = this.normalizeVector(components)
    return this.createEntity(IFCDIRECTION, normalized)
  }

  private normalizeVector(components: [number, number, number] | [number, number]): number[] {
    const vector = [...components]
    const length = Math.hypot(...vector)
    if (length === 0) {
      if (vector.length === 3) {
        return [0, 0, 1]
      }
      return [1, 0]
    }
    return vector.map(component => component / length)
  }

  private label(value: string): unknown {
    return this.api.CreateIfcType(this.modelID, IFCLABEL, value)
  }

  private text(value: string): unknown {
    return this.api.CreateIfcType(this.modelID, IFCTEXT, value)
  }

  private identifier(value: string): unknown {
    return this.api.CreateIfcType(this.modelID, IFCIDENTIFIER, value)
  }

  private real(value: number): unknown {
    return this.api.CreateIfcType(this.modelID, IFCREAL, value)
  }

  private integer(value: number): unknown {
    return this.api.CreateIfcType(this.modelID, IFCINTEGER, value)
  }

  private globalId(): unknown {
    return this.api.CreateIFCGloballyUniqueId(this.modelID)
  }

  private toLocal(point: vec2, origin: vec2, direction: vec2, normal: vec2): vec2 {
    const delta = vec2.subtract(vec2.create(), point, origin)
    const x = vec2.dot(delta, direction)
    const y = vec2.dot(delta, normal)
    return vec2.fromValues(x, y)
  }
}
