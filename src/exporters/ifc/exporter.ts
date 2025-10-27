import { vec2 } from 'gl-matrix'
import { Handle, IFC4, IfcAPI, type IfcLineObject } from 'web-ifc'
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

  private ownerHistory!: Handle<IFC4.IfcOwnerHistory>
  private modelContext!: Handle<IFC4.IfcGeometricRepresentationContext>
  private bodyContext!: Handle<IFC4.IfcGeometricRepresentationSubContext>
  private unitAssignment!: Handle<IFC4.IfcUnitAssignment>
  private worldPlacement!: Handle<IFC4.IfcPlacement>
  private zAxis!: Handle<IFC4.IfcDirection>
  private xAxis!: Handle<IFC4.IfcDirection>

  private readonly now = Math.floor(Date.now() / 1000)
  private projectId!: Handle<IFC4.IfcProject>
  private siteId!: Handle<IFC4.IfcSite>
  private buildingId!: Handle<IFC4.IfcBuilding>
  private readonly storeyIds = new Map<string, Handle<IFC4.IfcBuildingStorey>>()
  private readonly storeyPlacements = new Map<string, Handle<IFC4.IfcPlacement>>()

  async export(): Promise<Uint8Array> {
    await this.api.Init((path, prefix) => {
      if (path.endsWith('.wasm')) {
        return wasmUrl
      }
      return prefix + path
    })

    this.modelID = this.api.CreateModel({
      schema: 'IFC4',
      name: 'Strawbaler Online Model',
      authors: ['Strawbaler User'],
      organizations: [`???`],
      authorization: 'none',
      description: ['ViewDefinition [ReferenceView_V1.2]']
    })

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

    const wallMaterialCache = new Map<string, Handle<IFC4.IfcMaterialLayerSetUsage>>()

    for (const info of storeyInfos) {
      const storeyPlacement = this.storeyPlacements.get(info.storey.id)
      if (storeyPlacement == null) continue

      const perimeters = getPerimetersByStorey(info.storey.id)
      const elements: Handle<IFC4.IfcElement>[] = []

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
          this.writeEntity(
            new IFC4.IfcRelContainedInSpatialStructure(
              this.globalId(),
              this.ownerHistory,
              null,
              null,
              elements,
              storeyId
            )
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

  private createOwnerHistory(): Handle<IFC4.IfcOwnerHistory> {
    const person = this.writeEntity(
      new IFC4.IfcPerson(null, this.label('Strawbaler'), this.label('User'), null, null, null, null, null)
    )

    const organisation = this.writeEntity(new IFC4.IfcOrganization(null, this.label('Strawbaler'), null, null, null))

    const personOrg = this.writeEntity(new IFC4.IfcPersonAndOrganization(person, organisation, null))

    const application = this.writeEntity(
      new IFC4.IfcApplication(
        organisation,
        this.label(getVersionString()),
        this.label('Strawbaler Online'),
        this.identifier(`Strawbaler - Strawbaler-Online - ${getVersionString()}`)
      )
    )

    return this.writeEntity(
      new IFC4.IfcOwnerHistory(personOrg, application, null, null, null, null, null, this.timestampValue(this.now))
    )
  }

  private setupUnits(): void {
    const lengthUnitEntity = new IFC4.IfcSIUnit(
      IFC4.IfcUnitEnum.LENGTHUNIT,
      IFC4.IfcSIPrefix.MILLI,
      IFC4.IfcSIUnitName.METRE
    )
    const lengthUnit = this.writeEntity(lengthUnitEntity)

    const areaUnitEntity = new IFC4.IfcSIUnit(IFC4.IfcUnitEnum.AREAUNIT, null, IFC4.IfcSIUnitName.SQUARE_METRE)
    const areaUnit = this.writeEntity(areaUnitEntity)

    const volumeUnitEntity = new IFC4.IfcSIUnit(IFC4.IfcUnitEnum.VOLUMEUNIT, null, IFC4.IfcSIUnitName.CUBIC_METRE)
    const volumeUnit = this.writeEntity(volumeUnitEntity)

    const planeAngleUnitEntity = new IFC4.IfcSIUnit(IFC4.IfcUnitEnum.PLANEANGLEUNIT, null, IFC4.IfcSIUnitName.RADIAN)
    const planeAngleUnit = this.writeEntity(planeAngleUnitEntity)

    this.unitAssignment = this.writeEntity(
      new IFC4.IfcUnitAssignment([lengthUnit, areaUnit, volumeUnit, planeAngleUnit])
    )
  }

  private createGeometricContext(): void {
    const origin = this.createCartesianPoint([0, 0, 0])
    this.zAxis = this.createDirection([0, 0, 1])
    this.xAxis = this.createDirection([1, 0, 0])

    this.worldPlacement = this.writeEntity(new IFC4.IfcAxis2Placement3D(origin, this.zAxis, this.xAxis))

    this.modelContext = this.writeEntity(
      new IFC4.IfcGeometricRepresentationContext(
        this.label('Model'),
        this.label('Model'),
        new IFC4.IfcDimensionCount(3),
        this.real(0.01),
        this.worldPlacement,
        null
      )
    )

    this.bodyContext = this.writeEntity(
      new IFC4.IfcGeometricRepresentationSubContext(
        this.label('Body'),
        this.label('Model'),
        this.modelContext,
        null,
        IFC4.IfcGeometricProjectionEnum.MODEL_VIEW,
        null
      )
    )
  }

  private createSpatialStructure(storeyInfos: StoreyRuntimeInfo[]): void {
    this.projectId = this.writeEntity(
      new IFC4.IfcProject(
        this.globalId(),
        this.ownerHistory,
        this.label('Strawbaler Project'),
        null,
        null,
        null,
        null,
        [this.modelContext],
        this.unitAssignment
      )
    )

    const sitePlacement = this.writeEntity(new IFC4.IfcLocalPlacement(null, this.worldPlacement))

    this.siteId = this.writeEntity(
      new IFC4.IfcSite(
        this.globalId(),
        this.ownerHistory,
        this.label('Site'),
        null,
        null,
        sitePlacement,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null
      )
    )

    const buildingPlacement = this.writeEntity(new IFC4.IfcLocalPlacement(sitePlacement, this.worldPlacement))

    const address = this.createDefaultPostalAddress()

    this.buildingId = this.writeEntity(
      new IFC4.IfcBuilding(
        this.globalId(),
        this.ownerHistory,
        this.label('Building'),
        null,
        null,
        buildingPlacement,
        null,
        null,
        IFC4.IfcElementCompositionEnum.ELEMENT,
        this.lengthMeasure(0),
        null,
        address
      )
    )

    this.writeEntity(
      new IFC4.IfcRelAggregates(this.globalId(), this.ownerHistory, null, null, this.projectId, [this.siteId])
    )

    this.writeEntity(
      new IFC4.IfcRelAggregates(this.globalId(), this.ownerHistory, null, null, this.siteId, [this.buildingId])
    )

    for (const info of storeyInfos) {
      const placement = this.writeEntity(
        new IFC4.IfcLocalPlacement(buildingPlacement, this.createAxisPlacement([0, 0, info.elevation]))
      )
      this.storeyPlacements.set(info.storey.id, placement)

      const storeyId = this.writeEntity(
        new IFC4.IfcBuildingStorey(
          this.globalId(),
          this.ownerHistory,
          this.label(info.storey.name),
          null,
          null,
          placement,
          null,
          null,
          IFC4.IfcElementCompositionEnum.ELEMENT,
          this.lengthMeasure(info.elevation)
        )
      )
      this.storeyIds.set(info.storey.id, storeyId)

      this.writeEntity(
        new IFC4.IfcRelAggregates(this.globalId(), this.ownerHistory, null, null, this.buildingId, [storeyId])
      )
    }
  }

  private createDefaultPostalAddress(): Handle<IFC4.IfcPostalAddress> {
    return this.writeEntity(
      new IFC4.IfcPostalAddress(
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
    storeyPlacement: Handle<IFC4.IfcPlacement>,
    getWallAssemblyById: (id: PerimeterWall['wallAssemblyId']) => { type: string } | null,
    materialUsageCache: Map<string, Handle<IFC4.IfcMaterialLayerSetUsage>>
  ): Handle<IFC4.IfcWall>[] {
    const elements: Handle<IFC4.IfcWall>[] = []

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
    storeyPlacement: Handle<IFC4.IfcPlacement>,
    materialUsageCache: Map<string, Handle<IFC4.IfcMaterialLayerSetUsage>>
  ): Handle<IFC4.IfcWall> {
    const profile = this.createWallProfile(wall, startCorner, endCorner)
    const placement = this.createWallPlacement(wall, startCorner, storeyPlacement)

    const profilePlacement = this.createAxisPlacement([0, 0, 0])
    const solid = this.writeEntity(
      new IFC4.IfcExtrudedAreaSolid(profile, profilePlacement, this.zAxis, this.positiveLengthMeasure(info.wallHeight))
    )

    const representation = this.writeEntity(
      new IFC4.IfcShapeRepresentation(this.bodyContext, this.label('Body'), this.label('SweptSolid'), [solid])
    )

    const productDefinition = this.writeEntity(new IFC4.IfcProductDefinitionShape(null, null, [representation]))

    const wallId = this.writeEntity(
      new IFC4.IfcWall(
        this.globalId(),
        this.ownerHistory,
        this.label(wall.id),
        null,
        null,
        placement,
        productDefinition,
        null,
        null
      )
    )

    const materialUsageId = this.ensureWallMaterialUsage(wall.wallAssemblyId, wall.thickness, materialUsageCache)

    this.writeEntity(
      new IFC4.IfcRelAssociatesMaterial(this.globalId(), this.ownerHistory, null, null, [wallId], materialUsageId)
    )

    const thicknessProperty = this.writeEntity(
      new IFC4.IfcPropertySingleValue(
        this.identifier('Thickness'),
        null,
        this.positiveLengthMeasure(wall.thickness, true),
        null
      )
    )

    const assemblyProperty = this.writeEntity(
      new IFC4.IfcPropertySingleValue(
        this.identifier('AssemblyId'),
        null,
        this.identifier(wall.wallAssemblyId ?? 'unknown'),
        null
      )
    )

    const propertySet = this.writeEntity(
      new IFC4.IfcPropertySet(this.globalId(), this.ownerHistory, this.label('StrawbalerWall'), null, [
        thicknessProperty,
        assemblyProperty
      ])
    )

    this.writeEntity(
      new IFC4.IfcRelDefinesByProperties(this.globalId(), this.ownerHistory, null, null, [wallId], propertySet)
    )

    for (const opening of wall.openings) {
      this.createOpeningElement(opening, wall, wallId, placement)
    }

    return wallId
  }

  private createOpeningElement(
    opening: PerimeterWall['openings'][number],
    wall: PerimeterWall,
    wallId: Handle<IFC4.IfcElement>,
    wallPlacement: Handle<IFC4.IfcPlacement>
  ): void {
    const axisPlacement = this.createAxisPlacement([opening.offsetFromStart, 0, opening.sillHeight ?? 0])
    const placement = this.writeEntity(new IFC4.IfcLocalPlacement(wallPlacement, axisPlacement))

    const profile = this.createRectangleProfile(opening.width, wall.thickness)
    const solidPlacement = this.createAxisPlacement([0, 0, 0])
    const solid = this.writeEntity(
      new IFC4.IfcExtrudedAreaSolid(profile, solidPlacement, this.zAxis, this.positiveLengthMeasure(opening.height))
    )

    const representation = this.writeEntity(
      new IFC4.IfcShapeRepresentation(this.bodyContext, this.label('Body'), this.label('SweptSolid'), [solid])
    )

    const productDefinition = this.writeEntity(new IFC4.IfcProductDefinitionShape(null, null, [representation]))

    const openingId = this.writeEntity(
      new IFC4.IfcOpeningElement(
        this.globalId(),
        this.ownerHistory,
        this.label(`${opening.type}-${opening.id}`),
        null,
        null,
        placement,
        productDefinition,
        null,
        null
      )
    )

    this.writeEntity(new IFC4.IfcRelVoidsElement(this.globalId(), this.ownerHistory, null, null, wallId, openingId))

    const widthProp = this.writeEntity(
      new IFC4.IfcPropertySingleValue(
        this.identifier('Width'),
        null,
        this.positiveLengthMeasure(opening.sillHeight ?? 0, true),
        null
      )
    )

    const heightProp = this.writeEntity(
      new IFC4.IfcPropertySingleValue(
        this.identifier('Height'),
        null,
        this.positiveLengthMeasure(opening.height, true),
        null
      )
    )

    const sillProp = this.writeEntity(
      new IFC4.IfcPropertySingleValue(
        this.identifier('SillHeight'),
        null,
        this.nonNegativeLengthMeasure(opening.sillHeight ?? 0, true),
        null
      )
    )

    const typeProp = this.writeEntity(
      new IFC4.IfcPropertySingleValue(this.identifier('Type'), null, this.label(opening.type.toUpperCase()), null)
    )

    const propertySet = this.writeEntity(
      new IFC4.IfcPropertySet(this.globalId(), this.ownerHistory, this.label('StrawbalerOpening'), null, [
        widthProp,
        heightProp,
        sillProp,
        typeProp
      ])
    )

    this.writeEntity(
      new IFC4.IfcRelDefinesByProperties(this.globalId(), this.ownerHistory, null, null, [openingId], propertySet)
    )
  }

  private createFloorSlab(floor: FloorGeometry, storeyPlacement: Handle<IFC4.IfcPlacement>): Handle<IFC4.IfcSlab> {
    const profileSolids = floor.polygons.map(polygon => this.createFloorSolid(polygon, floor.thickness))

    const representation = this.writeEntity(
      new IFC4.IfcShapeRepresentation(
        this.bodyContext,
        this.label('Body'),
        this.label('SweptSolid'),
        profileSolids.map(id => id)
      )
    )

    const productDefinition = this.writeEntity(new IFC4.IfcProductDefinitionShape(null, null, [representation]))

    const placement = this.writeEntity(new IFC4.IfcLocalPlacement(storeyPlacement, this.createAxisPlacement([0, 0, 0])))

    const slabId = this.writeEntity(
      new IFC4.IfcSlab(
        this.globalId(),
        this.ownerHistory,
        this.label('Floor'),
        null,
        null,
        placement,
        productDefinition,
        null,
        IFC4.IfcSlabTypeEnum.FLOOR
      )
    )

    const thicknessProperty = this.writeEntity(
      new IFC4.IfcPropertySingleValue(
        this.identifier('Thickness'),
        null,
        this.positiveLengthMeasure(floor.thickness, true),
        null
      )
    )

    const propertySet = this.writeEntity(
      new IFC4.IfcPropertySet(this.globalId(), this.ownerHistory, this.label('StrawbalerFloor'), null, [
        thicknessProperty
      ])
    )

    this.writeEntity(
      new IFC4.IfcRelDefinesByProperties(this.globalId(), this.ownerHistory, null, null, [slabId], propertySet)
    )

    return slabId
  }

  private createFloorSolid(polygon: PolygonWithHoles2D, thickness: number): Handle<IFC4.IfcExtrudedAreaSolid> {
    const outerPolyline = this.createPolyline(this.ensureCounterClockwise(polygon.outer))

    const profile =
      polygon.holes.length > 0
        ? this.writeEntity(
            new IFC4.IfcArbitraryProfileDefWithVoids(
              IFC4.IfcProfileTypeEnum.AREA,
              null,
              outerPolyline,
              polygon.holes.map(hole => this.createPolyline(this.ensureClockwise(hole)))
            )
          )
        : this.writeEntity(new IFC4.IfcArbitraryClosedProfileDef(IFC4.IfcProfileTypeEnum.AREA, null, outerPolyline))

    const downwardDirection = this.createDirection([0, 0, -1])

    return this.writeEntity(
      new IFC4.IfcExtrudedAreaSolid(
        profile,
        this.createAxisPlacement([0, 0, 0]),
        downwardDirection,
        this.positiveLengthMeasure(thickness)
      )
    )
  }

  private createWallProfile(
    wall: PerimeterWall,
    startCorner: PerimeterCorner,
    endCorner: PerimeterCorner
  ): Handle<IFC4.IfcArbitraryClosedProfileDef> {
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

  private createRectangleProfile(width: number, depth: number): Handle<IFC4.IfcArbitraryClosedProfileDef> {
    const points: vec2[] = [
      vec2.fromValues(0, 0),
      vec2.fromValues(width, 0),
      vec2.fromValues(width, depth),
      vec2.fromValues(0, depth)
    ]

    return this.createRectanglePolyline(points)
  }

  private createRectanglePolyline(points: vec2[]): Handle<IFC4.IfcArbitraryClosedProfileDef> {
    const polyline = this.createPolyline({ points })
    return this.writeEntity(new IFC4.IfcArbitraryClosedProfileDef(IFC4.IfcProfileTypeEnum.AREA, null, polyline))
  }

  private createPolyline(polygon: Polygon2D): Handle<IFC4.IfcPolyline> {
    const points = this.normalizePolygonPoints(polygon.points)
    if (points.length === 0) {
      throw new Error('Cannot create polyline without points')
    }

    const pointIds = points.map(point => this.createCartesianPoint([point[0], point[1]]))
    const vertices = [...pointIds, pointIds[0]]

    return this.writeEntity(new IFC4.IfcPolyline(vertices))
  }

  private createAxisPlacement(location: [number, number, number]): Handle<IFC4.IfcAxis2Placement3D> {
    const point = this.createCartesianPoint(location)
    return this.writeEntity(new IFC4.IfcAxis2Placement3D(point, this.zAxis, this.xAxis))
  }

  private createWallPlacement(
    wall: PerimeterWall,
    startCorner: PerimeterCorner,
    storeyPlacement: Handle<IFC4.IfcPlacement>
  ): Handle<IFC4.IfcLocalPlacement> {
    const location = this.createCartesianPoint([startCorner.insidePoint[0], startCorner.insidePoint[1], 0])
    const wallDirection = this.createDirection([wall.direction[0], wall.direction[1], 0])
    const axisPlacement = this.writeEntity(new IFC4.IfcAxis2Placement3D(location, this.zAxis, wallDirection))
    return this.writeEntity(new IFC4.IfcLocalPlacement(storeyPlacement, axisPlacement))
  }

  private ensureWallMaterialUsage(
    assemblyId: string,
    thickness: number,
    cache: Map<string, Handle<IFC4.IfcMaterialLayerSetUsage>>
  ): Handle<IFC4.IfcMaterialLayerSetUsage> {
    const key = `${assemblyId}:${thickness}`
    const cached = cache.get(key)
    if (cached) return cached

    const material = new IFC4.IfcMaterial(this.label(`Wall ${assemblyId}`), null, null)
    this.writeEntity(material)

    const layer = new IFC4.IfcMaterialLayer(
      material,
      this.positiveLengthMeasure(thickness),
      null,
      null,
      null,
      null,
      null
    )
    this.writeEntity(layer)

    const layerSet = new IFC4.IfcMaterialLayerSet([layer], this.label(`Wall ${assemblyId}`), null)
    this.writeEntity(layerSet)

    const layerUsage = new IFC4.IfcMaterialLayerSetUsage(
      layerSet,
      IFC4.IfcLayerSetDirectionEnum.AXIS2,
      IFC4.IfcDirectionSenseEnum.POSITIVE,
      this.lengthMeasure(0),
      null
    )
    const usageId = this.writeEntity(layerUsage)

    cache.set(key, usageId)
    return usageId
  }

  // --- helpers ---

  private writeEntity<T extends IfcLineObject>(entity: T): Handle<T> {
    this.api.WriteLine(this.modelID, entity)
    return new Handle(entity.expressID)
  }

  private createCartesianPoint(
    coordinates: [number, number] | [number, number, number]
  ): Handle<IFC4.IfcCartesianPoint> {
    const measures = coordinates.map(value => this.lengthMeasure(value))
    return this.writeEntity(new IFC4.IfcCartesianPoint(measures))
  }

  private createDirection(components: [number, number, number] | [number, number]): Handle<IFC4.IfcDirection> {
    const normalized = this.normalizeVector(components)
    const ratios = normalized.map(value => this.real(value))
    return this.writeEntity(new IFC4.IfcDirection(ratios))
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

  private label(value: string): IFC4.IfcLabel {
    return new IFC4.IfcLabel(value)
  }

  private identifier(value: string): IFC4.IfcIdentifier {
    return new IFC4.IfcIdentifier(value)
  }

  private real(value: number): IFC4.IfcReal {
    return new IFC4.IfcReal(value)
  }

  private lengthMeasure(value: number): IFC4.IfcLengthMeasure {
    return new IFC4.IfcLengthMeasure(value)
  }

  private positiveLengthMeasure(value: number, force: boolean = false): IFC4.IfcPositiveLengthMeasure {
    if (force) {
      return { type: 2, label: 'IFCPOSITIVELENGTHMEASURE', valueType: 4, internalValue: Math.max(value, 0.01) } as any
    }
    return new IFC4.IfcPositiveLengthMeasure(Math.max(value, 1e-6))
  }

  private nonNegativeLengthMeasure(value: number, force: boolean = false): IFC4.IfcNonNegativeLengthMeasure {
    if (force) {
      return { type: 2, label: 'IFCNONNEGATIVELENGTHMEASURE', valueType: 4, internalValue: Math.max(value, 0) } as any
    }
    return new IFC4.IfcNonNegativeLengthMeasure(Math.max(value, 0))
  }

  private timestampValue(value: number): IFC4.IfcTimeStamp {
    return new IFC4.IfcTimeStamp(value)
  }

  private globalId(): IFC4.IfcGloballyUniqueId {
    return this.api.CreateIFCGloballyUniqueId(this.modelID)
  }

  private toLocal(point: vec2, origin: vec2, direction: vec2, normal: vec2): vec2 {
    const delta = vec2.subtract(vec2.create(), point, origin)
    const x = vec2.dot(delta, direction)
    const y = vec2.dot(delta, normal)
    return vec2.fromValues(x, y)
  }

  private normalizePolygonPoints(points: vec2[]): vec2[] {
    if (points.length <= 1) {
      return points
    }

    const first = points[0]
    const last = points[points.length - 1]

    if (vec2.distance(first, last) < 1e-6) {
      return points.slice(0, points.length - 1)
    }

    return points
  }

  private ensureCounterClockwise(polygon: Polygon2D): Polygon2D {
    const points = this.normalizePolygonPoints(polygon.points)
    if (this.isClockwise(points)) {
      return { points: [...points].reverse() }
    }
    return { points }
  }

  private ensureClockwise(polygon: Polygon2D): Polygon2D {
    const points = this.normalizePolygonPoints(polygon.points)
    if (this.isClockwise(points)) {
      return { points }
    }
    return { points: [...points].reverse() }
  }

  private isClockwise(points: vec2[]): boolean {
    return this.polygonSignedArea(this.normalizePolygonPoints(points)) < 0
  }

  private polygonSignedArea(points: vec2[]): number {
    if (points.length < 3) {
      return 0
    }

    let area = 0
    for (let index = 0; index < points.length; index++) {
      const current = points[index]
      const next = points[(index + 1) % points.length]
      area += current[0] * next[1] - next[0] * current[1]
    }

    return area / 2
  }
}
