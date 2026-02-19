/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Handle, IFC4, IfcAPI, type IfcLineObject } from 'web-ifc'
import wasmUrl from 'web-ifc/web-ifc.wasm?url'

import {
  type OpeningWithGeometry,
  type PerimeterCornerWithGeometry,
  type PerimeterId,
  type PerimeterWallWithGeometry,
  type Storey,
  isOpeningId
} from '@/building/model'
import { type StoreActions, getModelActions } from '@/building/store'
import { type ConfigActions, getConfigActions } from '@/construction/config'
import { type StoreyContext, getWallStoreyContextCached } from '@/construction/storeys/context'
import {
  type Length,
  type Polygon2D,
  type PolygonWithHoles2D,
  type Vec2,
  distVec2,
  dotVec2,
  newVec2,
  subVec2
} from '@/shared/geometry'
import { arePolygonsIntersecting, subtractPolygons, unionPolygons } from '@/shared/geometry/polygon'
import { downloadFile } from '@/shared/utils/downloadFile'
import { getVersionString } from '@/shared/utils/version'

interface IfcStoreyContext extends StoreyContext {
  elevation: Length
  name: string
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

  private store: StoreActions
  private config: ConfigActions

  public constructor(store?: StoreActions, config?: ConfigActions) {
    this.store = store ?? getModelActions()
    this.config = config ?? getConfigActions()
  }

  async export(): Promise<Uint8Array<ArrayBuffer>> {
    await this.api.Init((path, prefix) => {
      if (path.endsWith('.wasm')) {
        return wasmUrl
      }
      return prefix + path
    })

    this.modelID = this.api.CreateModel({
      schema: 'IFC4',
      name: 'StrawBuild Studio Model',
      authors: ['StrawBuild Studio User'],
      organizations: [`???`],
      authorization: 'none',
      description: ['ViewDefinition [ReferenceView_V1.2]']
    })

    this.initialiseContext()

    const orderedStoreys = this.store.getStoreysOrderedByLevel()
    if (orderedStoreys.length === 0) {
      throw new Error('Cannot export IFC without any storeys')
    }

    const storeyInfos = this.buildStoreyContext(orderedStoreys)
    const floorGeometry = this.computeFloorGeometry(storeyInfos)

    this.createSpatialStructure(storeyInfos)

    const wallMaterialCache = new Map<string, Handle<IFC4.IfcMaterialLayerSetUsage>>()

    for (const info of storeyInfos) {
      const storeyPlacement = this.storeyPlacements.get(info.storeyId)
      if (storeyPlacement == null) continue

      const perimeters = this.store.getPerimetersByStorey(info.storeyId)
      const elements: Handle<IFC4.IfcElement>[] = []

      for (const perimeter of perimeters) {
        elements.push(...this.createWallsForPerimeter(perimeter.id, info, storeyPlacement, wallMaterialCache))
      }

      for (const floor of floorGeometry.filter(f => f.storeyId === info.storeyId)) {
        const slabId = this.createFloorSlab(floor, storeyPlacement)
        elements.push(slabId)
      }

      if (elements.length > 0) {
        const storeyId = this.storeyIds.get(info.storeyId)
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
    // Explicitly type the return value to satisfy TypeScript 5.8+ typed array constraints
    // web-ifc returns a standard Uint8Array, but TS 5.8+ infers it as Uint8Array<ArrayBufferLike>
    // We create a copy with explicit ArrayBuffer type (web-ifc doesn't use SharedArrayBuffer)
    return new Uint8Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer)
  }

  getFilename(): string {
    const timestamp = new Date().toISOString().split('T')[0]
    return `strawbuild-${timestamp}.ifc`
  }

  // --- context and setup ---

  private initialiseContext(): void {
    this.ownerHistory = this.createOwnerHistory()
    this.setupUnits()
    this.createGeometricContext()
  }

  private createOwnerHistory(): Handle<IFC4.IfcOwnerHistory> {
    const person = this.writeEntity(
      new IFC4.IfcPerson(null, this.label('StrawBuild Studio'), this.label('User'), null, null, null, null, null)
    )

    const organisation = this.writeEntity(
      new IFC4.IfcOrganization(null, this.label('StrawBuild Studio'), null, null, null)
    )

    const personOrg = this.writeEntity(new IFC4.IfcPersonAndOrganization(person, organisation, null))

    const application = this.writeEntity(
      new IFC4.IfcApplication(
        organisation,
        this.label(getVersionString()),
        this.label('StrawBuild Studio'),
        this.identifier(`StrawBuild-Studio-${getVersionString()}`)
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

  private createSpatialStructure(storeyInfos: IfcStoreyContext[]): void {
    this.projectId = this.writeEntity(
      new IFC4.IfcProject(
        this.globalId(),
        this.ownerHistory,
        this.label('StrawBuild Studio Project'),
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
      this.storeyPlacements.set(info.storeyId, placement)

      const storeyId = this.writeEntity(
        new IFC4.IfcBuildingStorey(
          this.globalId(),
          this.ownerHistory,
          this.label(info.name),
          null,
          null,
          placement,
          null,
          null,
          IFC4.IfcElementCompositionEnum.ELEMENT,
          this.lengthMeasure(info.elevation)
        )
      )
      this.storeyIds.set(info.storeyId, storeyId)

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
        this.label('Unknown City'),
        null,
        null,
        this.label('Unknown Country')
      )
    )
  }

  private buildStoreyContext(storeys: Storey[]): IfcStoreyContext[] {
    const infos: IfcStoreyContext[] = []
    let finishedFloorElevation = 0

    for (const storey of storeys) {
      const context = getWallStoreyContextCached(storey.id)

      infos.push({
        ...context,
        name: storey.name,
        elevation: finishedFloorElevation
      })

      finishedFloorElevation += storey.floorHeight
    }

    return infos
  }

  private computeFloorGeometry(storeyInfos: IfcStoreyContext[]): FloorGeometry[] {
    const geometries: FloorGeometry[] = []

    for (const info of storeyInfos) {
      const perimeters = this.store.getPerimetersByStorey(info.storeyId)
      if (perimeters.length === 0) continue

      const perimeterPolygons = perimeters.map(p => p.outerPolygon)

      const baseAreas = [
        ...perimeterPolygons,
        ...this.store.getFloorAreasByStorey(info.storeyId).map(area => area.area)
      ]
      const mergedFootprint = unionPolygons(baseAreas)
      if (mergedFootprint.length === 0) {
        continue
      }

      const openings = this.store.getFloorOpeningsByStorey(info.storeyId).map(opening => opening.area)
      const relevantOpenings = openings.filter(opening =>
        mergedFootprint.some(poly => arePolygonsIntersecting(poly, opening))
      )
      const mergedOpenings = unionPolygons(relevantOpenings)

      const polygonsWithHoles = mergedOpenings.length
        ? subtractPolygons(mergedFootprint, mergedOpenings)
        : mergedFootprint.map(polygon => ({ outer: polygon, holes: [] }))

      geometries.push({
        storeyId: info.storeyId,
        polygons: polygonsWithHoles,
        thickness: info.floorAssembly.totalThickness
      })
    }

    return geometries
  }

  private createWallsForPerimeter(
    perimeterId: PerimeterId,
    info: IfcStoreyContext,
    storeyPlacement: Handle<IFC4.IfcPlacement>,
    materialUsageCache: Map<string, Handle<IFC4.IfcMaterialLayerSetUsage>>
  ): Handle<IFC4.IfcWall>[] {
    const elements: Handle<IFC4.IfcWall>[] = []
    const walls = this.store.getPerimeterWallsById(perimeterId)
    for (const wall of walls) {
      const assemblyConfig = this.config.getWallAssemblyById(wall.wallAssemblyId)
      if (!assemblyConfig) continue

      const startCorner = this.store.getPerimeterCornerById(wall.startCornerId)
      const endCorner = this.store.getPerimeterCornerById(wall.endCornerId)

      const wallId = this.createWallElement(wall, startCorner, endCorner, info, storeyPlacement, materialUsageCache)
      elements.push(wallId)
    }

    return elements
  }

  private createWallElement(
    wall: PerimeterWallWithGeometry,
    startCorner: PerimeterCornerWithGeometry,
    endCorner: PerimeterCornerWithGeometry,
    info: IfcStoreyContext,
    storeyPlacement: Handle<IFC4.IfcPlacement>,
    materialUsageCache: Map<string, Handle<IFC4.IfcMaterialLayerSetUsage>>
  ): Handle<IFC4.IfcWall> {
    const profile = this.createWallProfile(wall, startCorner, endCorner)
    const placement = this.createWallPlacement(wall, startCorner, storeyPlacement)

    const profilePlacement = this.createAxisPlacement([0, 0, 0])
    const wallHeight = info.finishedCeilingBottom - info.finishedFloorTop
    const solid = this.writeEntity(
      new IFC4.IfcExtrudedAreaSolid(profile, profilePlacement, this.zAxis, this.positiveLengthMeasure(wallHeight))
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
      new IFC4.IfcPropertySingleValue(this.identifier('AssemblyId'), null, this.identifier(wall.wallAssemblyId), null)
    )

    const propertySet = this.writeEntity(
      new IFC4.IfcPropertySet(this.globalId(), this.ownerHistory, this.label('StrawBuildWall'), null, [
        thicknessProperty,
        assemblyProperty
      ])
    )

    this.writeEntity(
      new IFC4.IfcRelDefinesByProperties(this.globalId(), this.ownerHistory, null, null, [wallId], propertySet)
    )

    for (const entityId of wall.entityIds) {
      if (isOpeningId(entityId)) {
        const opening = this.store.getWallOpeningById(entityId)
        this.createOpeningElement(opening, wall, wallId, placement)
      }
    }

    return wallId
  }

  private createOpeningElement(
    opening: OpeningWithGeometry,
    wall: PerimeterWallWithGeometry,
    wallId: Handle<IFC4.IfcElement>,
    wallPlacement: Handle<IFC4.IfcPlacement>
  ): void {
    // Convert center position to left edge for IFC placement (profile starts at origin)
    const leftEdge = opening.centerOffsetFromWallStart - opening.width / 2
    const axisPlacement = this.createAxisPlacement([leftEdge, 0, opening.sillHeight ?? 0])
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
        this.label(`${opening.openingType}-${opening.id}`),
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
      new IFC4.IfcPropertySingleValue(
        this.identifier('Type'),
        null,
        this.label(opening.openingType.toUpperCase()),
        null
      )
    )

    const propertySet = this.writeEntity(
      new IFC4.IfcPropertySet(this.globalId(), this.ownerHistory, this.label('StrawBuildOpening'), null, [
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
      new IFC4.IfcPropertySet(this.globalId(), this.ownerHistory, this.label('StrawBuildFloor'), null, [
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
    wall: PerimeterWallWithGeometry,
    startCorner: PerimeterCornerWithGeometry,
    endCorner: PerimeterCornerWithGeometry
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
    const points: Vec2[] = [newVec2(0, 0), newVec2(width, 0), newVec2(width, depth), newVec2(0, depth)]

    return this.createRectanglePolyline(points)
  }

  private createRectanglePolyline(points: Vec2[]): Handle<IFC4.IfcArbitraryClosedProfileDef> {
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
    wall: PerimeterWallWithGeometry,
    startCorner: PerimeterCornerWithGeometry,
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

  private positiveLengthMeasure(value: number, force = false): IFC4.IfcPositiveLengthMeasure {
    if (force) {
      // To actually get a value like IFCPOSITIVELENGTHMEASURE(42.0) we need to do this:
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
      return { type: 2, label: 'IFCPOSITIVELENGTHMEASURE', valueType: 4, internalValue: Math.max(value, 0.01) } as any
    }
    return new IFC4.IfcPositiveLengthMeasure(Math.max(value, 1e-6))
  }

  private nonNegativeLengthMeasure(value: number, force = false): IFC4.IfcNonNegativeLengthMeasure {
    if (force) {
      // To actually get a value like IFCNONNEGATIVELENGTHMEASURE(42.0) we need to do this:
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
      return { type: 2, label: 'IFCNONNEGATIVELENGTHMEASURE', valueType: 4, internalValue: Math.max(value, 0) } as any
    }
    return new IFC4.IfcNonNegativeLengthMeasure(Math.max(value, 0))
  }

  private timestampValue(value: number): IFC4.IfcTimeStamp {
    return new IFC4.IfcTimeStamp(value)
  }

  private globalId(): IFC4.IfcGloballyUniqueId {
    return this.api.CreateIFCGloballyUniqueId(this.modelID) as IFC4.IfcGloballyUniqueId
  }

  private toLocal(point: Vec2, origin: Vec2, direction: Vec2, normal: Vec2): Vec2 {
    const delta = subVec2(point, origin)
    const x = dotVec2(delta, direction)
    const y = dotVec2(delta, normal)
    return newVec2(x, y)
  }

  private normalizePolygonPoints(points: Vec2[]): Vec2[] {
    if (points.length <= 1) {
      return points
    }

    const first = points[0]
    const last = points[points.length - 1]

    if (distVec2(first, last) < 1e-6) {
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

  private isClockwise(points: Vec2[]): boolean {
    return this.polygonSignedArea(this.normalizePolygonPoints(points)) < 0
  }

  private polygonSignedArea(points: Vec2[]): number {
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
