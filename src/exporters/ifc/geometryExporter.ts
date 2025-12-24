import type { Manifold } from 'manifold-3d'
import { Handle, IFC4, IfcAPI, type IfcLineObject } from 'web-ifc'
import wasmUrl from 'web-ifc/web-ifc.wasm?url'

import { isOpeningId } from '@/building/model'
import { getModelActions } from '@/building/store'
import type { ConstructionElement, ConstructionGroup, GroupOrElement } from '@/construction/elements'
import type { MaterialId } from '@/construction/materials/material'
import type { ConstructionModel, HighlightedCuboid } from '@/construction/model'
import type { Shape } from '@/construction/shapes'
import { constructModel } from '@/construction/storeys/storey'
import type { Tag } from '@/construction/tags'
import {
  TAG_BASE_PLATE,
  TAG_DECKING,
  TAG_FLOOR,
  TAG_FLOOR_CEILING_SHEATHING,
  TAG_FLOOR_LAYER_BOTTOM,
  TAG_FLOOR_LAYER_TOP,
  TAG_FRAME,
  TAG_FULL_BALE,
  TAG_HEADER,
  TAG_INSIDE_SHEATHING,
  TAG_JOIST,
  TAG_PARTIAL_BALE,
  TAG_POST,
  TAG_PURLIN,
  TAG_RAFTER,
  TAG_RIDGE_BEAM,
  TAG_ROOF,
  TAG_ROOF_LAYER_INSIDE,
  TAG_ROOF_LAYER_TOP,
  TAG_SILL,
  TAG_STRAW_FLAKES,
  TAG_STRAW_INFILL,
  TAG_STRAW_STUFFED,
  TAG_SUBFLOOR,
  TAG_TOP_PLATE,
  TAG_WALLS,
  TAG_WALL_LAYER_INSIDE,
  TAG_WALL_LAYER_OUTSIDE
} from '@/construction/tags'
import { type Transform, getPosition, getXAxis, getZAxis } from '@/shared/geometry'
import { downloadFile } from '@/shared/utils/downloadFile'
import { getVersionString } from '@/shared/utils/version'

import { ManifoldToIfcConverter } from './geometryConverter'

type IfcElementType =
  | 'IfcWall'
  | 'IfcBeam'
  | 'IfcColumn'
  | 'IfcSlab'
  | 'IfcRoof'
  | 'IfcCovering'
  | 'IfcBuildingElementPart'
  | 'IfcBuildingElementProxy'
  | 'IfcElementAssembly'

interface IfcTypeMapping {
  elementType: IfcElementType
  predefinedType?: string
}

function isGroup(element: GroupOrElement): element is ConstructionGroup {
  return 'children' in element
}

function hasTag(tags: Tag[] | undefined, tag: Tag): boolean {
  return tags?.some(t => t.id === tag.id) ?? false
}

function hasAnyTag(tags: Tag[] | undefined, checkTags: Tag[]): boolean {
  return checkTags.some(tag => hasTag(tags, tag))
}

export async function exportConstructionGeometryToIfc(): Promise<void> {
  const exporter = new GeometryIfcExporter()
  const data = await exporter.export()
  const filename = exporter.getFilename()
  downloadFile(data, filename, 'application/octet-stream')
}

export class GeometryIfcExporter {
  private readonly api = new IfcAPI()
  private modelID!: number

  // IFC context
  private ownerHistory!: Handle<IFC4.IfcOwnerHistory>
  private modelContext!: Handle<IFC4.IfcGeometricRepresentationContext>
  private bodyContext!: Handle<IFC4.IfcGeometricRepresentationSubContext>
  private unitAssignment!: Handle<IFC4.IfcUnitAssignment>
  private lengthUnit!: Handle<IFC4.IfcUnit>
  private volumeUnit!: Handle<IFC4.IfcUnit>
  private areaUnit!: Handle<IFC4.IfcSIUnit>
  private worldPlacement!: Handle<IFC4.IfcPlacement>
  private zAxis!: Handle<IFC4.IfcDirection>
  private xAxis!: Handle<IFC4.IfcDirection>

  // Spatial structure
  private projectId!: Handle<IFC4.IfcProject>
  private siteId!: Handle<IFC4.IfcSite>
  private buildingId!: Handle<IFC4.IfcBuilding>
  private buildingPlacement!: Handle<IFC4.IfcLocalPlacement>

  // Caches
  private representationMapCache = new WeakMap<Manifold, Handle<IFC4.IfcRepresentationMap>>()
  private materialCache = new Map<MaterialId, Handle<IFC4.IfcMaterial>>()
  private sourceIdToElementMap = new Map<string, Handle<IFC4.IfcElement>>()

  // Converter
  private geometryConverter!: ManifoldToIfcConverter
  private readonly now = Math.floor(Date.now() / 1000)

  async export(): Promise<Uint8Array> {
    await this.api.Init((path, prefix) => {
      if (path.endsWith('.wasm')) {
        return wasmUrl
      }
      return prefix + path
    })

    this.modelID = this.api.CreateModel({
      schema: 'IFC4',
      name: 'Strawbaler Online Construction Model',
      authors: ['Strawbaler User'],
      organizations: ['Strawbaler'],
      authorization: 'none',
      description: ['ViewDefinition [ReferenceView_V1.2]']
    })

    // Initialize converter
    this.geometryConverter = new ManifoldToIfcConverter({
      writeEntity: this.writeEntity.bind(this),
      createCartesianPoint: this.createCartesianPoint.bind(this)
    })

    this.initialiseContext()

    const model = constructModel()
    if (!model) {
      throw new Error('No construction model to export')
    }

    this.createSpatialStructure()
    this.processConstructionModel(model)
    this.processOpenings(model)

    const data = this.api.SaveModel(this.modelID)
    this.api.CloseModel(this.modelID)
    return data
  }

  getFilename(): string {
    const timestamp = new Date().toISOString().split('T')[0]
    return `strawbaler-geometry-${timestamp}.ifc`
  }

  // --- Initialization (reused from existing exporter) ---

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
    this.lengthUnit = this.writeEntity(lengthUnitEntity)

    const areaUnitEntity = new IFC4.IfcSIUnit(IFC4.IfcUnitEnum.AREAUNIT, null, IFC4.IfcSIUnitName.SQUARE_METRE)
    this.areaUnit = this.writeEntity(areaUnitEntity)

    const volumeUnitEntity = new IFC4.IfcSIUnit(IFC4.IfcUnitEnum.VOLUMEUNIT, null, IFC4.IfcSIUnitName.CUBIC_METRE)
    this.volumeUnit = this.writeEntity(volumeUnitEntity)

    const planeAngleUnitEntity = new IFC4.IfcSIUnit(IFC4.IfcUnitEnum.PLANEANGLEUNIT, null, IFC4.IfcSIUnitName.RADIAN)
    const planeAngleUnit = this.writeEntity(planeAngleUnitEntity)

    this.unitAssignment = this.writeEntity(
      new IFC4.IfcUnitAssignment([this.lengthUnit, this.areaUnit, this.volumeUnit, planeAngleUnit])
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

  private createSpatialStructure(): void {
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

    this.buildingPlacement = this.writeEntity(new IFC4.IfcLocalPlacement(sitePlacement, this.worldPlacement))

    this.buildingId = this.writeEntity(
      new IFC4.IfcBuilding(
        this.globalId(),
        this.ownerHistory,
        this.label('Building'),
        null,
        null,
        this.buildingPlacement,
        null,
        null,
        IFC4.IfcElementCompositionEnum.ELEMENT,
        this.lengthMeasure(0),
        null,
        null
      )
    )

    this.writeEntity(
      new IFC4.IfcRelAggregates(this.globalId(), this.ownerHistory, null, null, this.projectId, [this.siteId])
    )

    this.writeEntity(
      new IFC4.IfcRelAggregates(this.globalId(), this.ownerHistory, null, null, this.siteId, [this.buildingId])
    )
  }

  // --- Type Mapping ---

  private determineIfcType(element: GroupOrElement): IfcTypeMapping {
    const tags = element.tags ?? []

    // Straw infill -> IfcBuildingElementPart
    if (hasAnyTag(tags, [TAG_STRAW_INFILL, TAG_FULL_BALE, TAG_PARTIAL_BALE, TAG_STRAW_FLAKES, TAG_STRAW_STUFFED])) {
      return { elementType: 'IfcBuildingElementPart' }
    }

    // Structural beams
    if (hasTag(tags, TAG_JOIST)) return { elementType: 'IfcBeam', predefinedType: 'JOIST' }
    if (hasTag(tags, TAG_HEADER)) return { elementType: 'IfcBeam', predefinedType: 'LINTEL' }
    if (hasTag(tags, TAG_SILL)) return { elementType: 'IfcBeam', predefinedType: 'BEAM' }
    if (hasTag(tags, TAG_PURLIN)) return { elementType: 'IfcBeam', predefinedType: 'JOIST' }
    if (hasTag(tags, TAG_RAFTER)) return { elementType: 'IfcBeam', predefinedType: 'JOIST' }
    if (hasTag(tags, TAG_RIDGE_BEAM)) return { elementType: 'IfcBeam', predefinedType: 'JOIST' }
    if (hasTag(tags, TAG_FRAME)) return { elementType: 'IfcBeam', predefinedType: 'BEAM' }
    if (hasTag(tags, TAG_BASE_PLATE)) return { elementType: 'IfcBeam', predefinedType: 'BEAM' }
    if (hasTag(tags, TAG_TOP_PLATE)) return { elementType: 'IfcBeam', predefinedType: 'BEAM' }

    // Columns/Posts
    if (hasTag(tags, TAG_POST)) return { elementType: 'IfcColumn' }

    // Walls
    if (hasTag(tags, TAG_WALLS)) return { elementType: 'IfcWall' }

    // Floors
    if (hasTag(tags, TAG_FLOOR)) return { elementType: 'IfcSlab', predefinedType: 'FLOOR' }
    if (hasTag(tags, TAG_SUBFLOOR)) return { elementType: 'IfcSlab', predefinedType: 'FLOOR' }
    if (hasTag(tags, TAG_FLOOR_CEILING_SHEATHING)) return { elementType: 'IfcSlab', predefinedType: 'FLOOR' }

    // Roofs
    if (hasTag(tags, TAG_ROOF)) return { elementType: 'IfcRoof' }
    if (hasTag(tags, TAG_DECKING)) return { elementType: 'IfcSlab', predefinedType: 'ROOF' }
    if (hasTag(tags, TAG_INSIDE_SHEATHING)) return { elementType: 'IfcSlab', predefinedType: 'ROOF' }

    // Coverings (surface layers)
    if (hasTag(tags, TAG_WALL_LAYER_INSIDE)) return { elementType: 'IfcCovering', predefinedType: 'CLADDING' }
    if (hasTag(tags, TAG_WALL_LAYER_OUTSIDE)) return { elementType: 'IfcCovering', predefinedType: 'CLADDING' }
    if (hasTag(tags, TAG_FLOOR_LAYER_TOP)) return { elementType: 'IfcCovering', predefinedType: 'FLOORING' }
    if (hasTag(tags, TAG_FLOOR_LAYER_BOTTOM)) return { elementType: 'IfcCovering', predefinedType: 'CEILING' }
    if (hasTag(tags, TAG_ROOF_LAYER_TOP)) return { elementType: 'IfcCovering', predefinedType: 'ROOFING' }
    if (hasTag(tags, TAG_ROOF_LAYER_INSIDE)) return { elementType: 'IfcCovering', predefinedType: 'CEILING' }

    if ('children' in element) {
      return { elementType: 'IfcElementAssembly' }
    }

    // Default fallback
    return { elementType: 'IfcBuildingElementProxy' }
  }

  // --- Geometry Instancing ---

  /**
   * Get or create an IfcRepresentationMap for reusable geometry.
   * This is cached per manifold to enable proper IFC geometry instancing.
   * Returns null if manifold has no valid geometry (e.g., filtered artifacts).
   */
  private getOrCreateRepresentationMap(manifold: Manifold): Handle<IFC4.IfcRepresentationMap> | null {
    // Check cache
    const cached = this.representationMapCache.get(manifold)
    if (cached) return cached

    // Convert manifold to IFC geometry
    const geometryHandle = this.geometryConverter.convert(manifold)

    // Return null if no valid geometry (all faces filtered out)
    if (!geometryHandle) {
      return null
    }

    const repType = 'Brep'

    // Create the mapped representation (the reusable geometry definition)
    const mappedRepresentation = this.writeEntity(
      new IFC4.IfcShapeRepresentation(this.bodyContext, this.label('Body'), this.label(repType), [
        geometryHandle as Handle<IFC4.IfcRepresentationItem>
      ])
    )

    // Create the origin for the map (at 0,0,0)
    const mapOrigin = this.createAxisPlacement([0, 0, 0])

    // Create the representation map
    const representationMap = this.writeEntity(new IFC4.IfcRepresentationMap(mapOrigin, mappedRepresentation))

    // Cache it
    this.representationMapCache.set(manifold, representationMap)
    return representationMap
  }

  /**
   * Create a unique IfcShapeRepresentation for each element using IfcMappedItem.
   * This satisfies IFC WR11 rule (each shape representation used by exactly one product).
   * Returns null if manifold has no valid geometry.
   */
  private getOrCreateShapeRepresentation(shape: Shape): Handle<IFC4.IfcShapeRepresentation> | null {
    // Get or create the representation map for this manifold (cached)
    const representationMap = this.getOrCreateRepresentationMap(shape.manifold)

    // Return null if no valid geometry
    if (!representationMap) {
      return null
    }

    // Create identity transformation operator (no rotation, no translation, scale=1)
    const identityTransform = this.createIdentityTransformationOperator()

    // Create a mapped item referencing the map with identity transform
    const mappedItem = this.writeEntity(new IFC4.IfcMappedItem(representationMap, identityTransform))

    // Create a NEW shape representation for THIS element that contains the mapped item
    // Each element gets its own IfcShapeRepresentation, satisfying WR11
    const shapeRep = this.writeEntity(
      new IFC4.IfcShapeRepresentation(this.bodyContext, this.label('Body'), this.label('MappedRepresentation'), [
        mappedItem as Handle<IFC4.IfcRepresentationItem>
      ])
    )

    return shapeRep
  }

  private createIdentityTransformationOperator(): Handle<IFC4.IfcCartesianTransformationOperator3D> {
    // Identity transformation: no axes (null = use default), origin at (0,0,0), scale=1 (null)
    const origin = this.createCartesianPoint([0, 0, 0])
    return this.writeEntity(new IFC4.IfcCartesianTransformationOperator3D(null, null, origin, null, null))
  }

  // --- Hierarchy Traversal ---

  private processConstructionModel(model: ConstructionModel): void {
    for (const element of model.elements) {
      if (!isGroup(element)) {
        console.warn('Top-level element is not a group:', element.id)
        continue
      }

      this.processStoreyGroup(element)
    }
  }

  private processStoreyGroup(storeyGroup: ConstructionGroup): void {
    const storeyLevel = this.extractStoreyLevel(storeyGroup)

    // Create storey on demand - extract elevation from transform
    const elevation = storeyGroup.transform[14] // Z translation from 4x4 matrix
    const { storey, placement: storeyPlacement } = this.createStorey(storeyLevel, elevation)

    const elements: Handle<IFC4.IfcElement>[] = []
    for (const child of storeyGroup.children) {
      if (isGroup(child)) {
        elements.push(this.processGroup(child, storey, storeyPlacement))
      } else {
        const element = this.processElement(child, storey, storeyPlacement)
        if (element) elements.push(element) // Skip null elements (filtered artifacts)
      }
    }

    if (elements.length > 0) {
      this.writeEntity(
        new IFC4.IfcRelContainedInSpatialStructure(this.globalId(), this.ownerHistory, null, null, elements, storey)
      )
    }
  }

  private createStorey(
    level: number,
    elevation: number
  ): { storey: Handle<IFC4.IfcBuildingStorey>; placement: Handle<IFC4.IfcLocalPlacement> } {
    const placement = this.writeEntity(
      new IFC4.IfcLocalPlacement(this.buildingPlacement, this.createAxisPlacement([0, 0, elevation]))
    )

    const storeyId = this.writeEntity(
      new IFC4.IfcBuildingStorey(
        this.globalId(),
        this.ownerHistory,
        this.label(`Level ${level}`),
        null,
        null,
        placement,
        null,
        null,
        IFC4.IfcElementCompositionEnum.ELEMENT,
        this.lengthMeasure(elevation)
      )
    )

    this.writeEntity(
      new IFC4.IfcRelAggregates(this.globalId(), this.ownerHistory, null, null, this.buildingId, [storeyId])
    )

    return { storey: storeyId, placement }
  }

  private processGroup(
    group: ConstructionGroup,
    storeyHandle: Handle<IFC4.IfcBuildingStorey>,
    parentPlacement: Handle<IFC4.IfcLocalPlacement>
  ): Handle<IFC4.IfcElement> {
    const typeMapping = this.determineIfcType(group)

    const groupPlacement = this.createPlacementFromTransform(group.transform, parentPlacement)

    const groupElement = this.createIfcElementByType(typeMapping, group.id, groupPlacement, null)

    if (group.sourceId && group.voidReceiver) {
      this.sourceIdToElementMap.set(group.sourceId, groupElement)
    }

    // Process children
    const childElements: Handle<IFC4.IfcElement>[] = []
    for (const child of group.children) {
      if (isGroup(child)) {
        childElements.push(this.processGroup(child, storeyHandle, groupPlacement))
      } else {
        const element = this.processElement(child, storeyHandle, groupPlacement)
        if (element) childElements.push(element) // Skip null elements (filtered artifacts)
      }
    }

    // Create decomposition relationship if we have children
    if (childElements.length > 0) {
      this.writeEntity(
        new IFC4.IfcRelAggregates(this.globalId(), this.ownerHistory, null, null, groupElement, childElements)
      )
    }

    return groupElement
  }

  private processElement(
    element: ConstructionElement,
    _storeyHandle: Handle<IFC4.IfcBuildingStorey>,
    parentPlacement: Handle<IFC4.IfcLocalPlacement>
  ): Handle<IFC4.IfcElement> | null {
    const typeMapping = this.determineIfcType(element)

    // Get or create geometry (with instancing)
    const shapeRep = this.getOrCreateShapeRepresentation(element.shape)

    // Skip element if no valid geometry (e.g., boolean artifact filtered out)
    if (!shapeRep) {
      return null
    }

    const productDef = this.writeEntity(new IFC4.IfcProductDefinitionShape(null, null, [shapeRep]))

    // Create placement relative to parent
    const placement = this.createPlacementFromTransform(element.transform, parentPlacement)

    // Create IFC element
    const ifcElement = this.createIfcElementByType(typeMapping, element.id, placement, productDef)

    // Track sourceId for opening association (if this is a wall)
    if (element.sourceId && typeMapping.elementType === 'IfcWall') {
      this.sourceIdToElementMap.set(element.sourceId, ifcElement)
    }

    // Associate material
    this.associateMaterial(ifcElement, element.material)

    // Add properties
    this.addElementProperties(ifcElement, element)

    return ifcElement
  }

  private extractStoreyLevel(group: ConstructionGroup): number {
    const storeyTag = group.tags?.find(t => t.category === 'storey-level')
    if (storeyTag) {
      const match = storeyTag.id.match(/_(\d+)/)
      if (match) return parseInt(match[1], 10)
    }
    return 0
  }

  private createIfcElementByType(
    typeMapping: IfcTypeMapping,
    elementId: string,
    placement: Handle<IFC4.IfcPlacement>,
    productDef: Handle<IFC4.IfcProductDefinitionShape> | null
  ): Handle<IFC4.IfcElement> {
    const { elementType, predefinedType } = typeMapping

    switch (elementType) {
      case 'IfcWall':
        return this.writeEntity(
          new IFC4.IfcWall(
            this.globalId(),
            this.ownerHistory,
            this.label(elementId),
            null,
            null,
            placement,
            productDef,
            null,
            IFC4.IfcWallTypeEnum[(predefinedType as keyof IFC4.IfcWallTypeEnum) ?? 'NOTDEFINED']
          )
        )

      case 'IfcBeam':
        return this.writeEntity(
          new IFC4.IfcBeam(
            this.globalId(),
            this.ownerHistory,
            this.label(elementId),
            null,
            null,
            placement,
            productDef,
            null,
            IFC4.IfcBeamTypeEnum[(predefinedType as keyof IFC4.IfcBeamTypeEnum) ?? 'NOTDEFINED']
          )
        )

      case 'IfcColumn':
        return this.writeEntity(
          new IFC4.IfcColumn(
            this.globalId(),
            this.ownerHistory,
            this.label(elementId),
            null,
            null,
            placement,
            productDef,
            null,
            IFC4.IfcColumnTypeEnum[(predefinedType as keyof IFC4.IfcColumnTypeEnum) ?? 'NOTDEFINED']
          )
        )

      case 'IfcSlab':
        return this.writeEntity(
          new IFC4.IfcSlab(
            this.globalId(),
            this.ownerHistory,
            this.label(elementId),
            null,
            null,
            placement,
            productDef,
            null,
            IFC4.IfcSlabTypeEnum[(predefinedType as keyof IFC4.IfcSlabTypeEnum) ?? 'NOTDEFINED']
          )
        )

      case 'IfcRoof':
        return this.writeEntity(
          new IFC4.IfcRoof(
            this.globalId(),
            this.ownerHistory,
            this.label(elementId),
            null,
            null,
            placement,
            productDef,
            null,
            IFC4.IfcRoofTypeEnum[(predefinedType as keyof IFC4.IfcRoofTypeEnum) ?? 'NOTDEFINED']
          )
        )

      case 'IfcCovering':
        return this.writeEntity(
          new IFC4.IfcCovering(
            this.globalId(),
            this.ownerHistory,
            this.label(elementId),
            null,
            null,
            placement,
            productDef,
            null,
            IFC4.IfcCoveringTypeEnum[(predefinedType as keyof IFC4.IfcCoveringTypeEnum) ?? 'NOTDEFINED']
          )
        )

      case 'IfcBuildingElementPart':
        return this.writeEntity(
          new IFC4.IfcBuildingElementPart(
            this.globalId(),
            this.ownerHistory,
            this.label(elementId),
            null,
            null,
            placement,
            productDef,
            null,
            IFC4.IfcBuildingElementPartTypeEnum[
              (predefinedType as keyof IFC4.IfcBuildingElementPartTypeEnum) ?? 'NOTDEFINED'
            ]
          )
        )

      case 'IfcElementAssembly':
        return this.writeEntity(
          new IFC4.IfcElementAssembly(
            this.globalId(),
            this.ownerHistory,
            this.label(elementId),
            null,
            null,
            placement,
            productDef,
            null,
            null,
            IFC4.IfcElementAssemblyTypeEnum[(predefinedType as keyof IFC4.IfcElementAssemblyTypeEnum) ?? 'NOTDEFINED']
          )
        )

      default: // IfcBuildingElementProxy
        return this.writeEntity(
          new IFC4.IfcBuildingElementProxy(
            this.globalId(),
            this.ownerHistory,
            this.label(elementId),
            null,
            null,
            placement,
            productDef,
            null,
            IFC4.IfcBuildingElementProxyTypeEnum[
              (predefinedType as keyof IFC4.IfcBuildingElementProxyTypeEnum) ?? 'NOTDEFINED'
            ]
          )
        )
    }
  }

  // --- Opening Processing ---

  private processOpenings(model: ConstructionModel): void {
    const openingAreas = model.areas.filter(
      a => ['window', 'door', 'passage'].includes(a.areaType) && a.type === 'cuboid'
    ) as HighlightedCuboid[]

    for (const opening of openingAreas) {
      this.processOpening(opening)
    }
  }

  private processOpening(opening: HighlightedCuboid): void {
    if (!opening.sourceId) {
      console.warn('Opening without sourceId, skipping:', opening.label)
      return
    }

    if (!isOpeningId(opening.sourceId)) {
      console.warn('Opening with invalid sourceId, skipping:', opening.sourceId)
      return
    }

    const { getWallByOpeningId } = getModelActions()
    const wallInfo = getWallByOpeningId(opening.sourceId)

    if (!wallInfo) {
      console.warn('No wall found for opening:', opening.sourceId)
      return
    }

    const parentWall = this.sourceIdToElementMap.get(wallInfo.wallId)

    if (!parentWall) {
      console.warn('No IFC wall element found for:', wallInfo.wallId)
      return
    }

    const openingElement = this.createOpeningElement(opening)

    this.writeEntity(
      new IFC4.IfcRelVoidsElement(this.globalId(), this.ownerHistory, null, null, parentWall, openingElement)
    )
  }

  private createOpeningElement(opening: HighlightedCuboid): Handle<IFC4.IfcOpeningElement> {
    const placement = this.createPlacementFromTransform(opening.transform)

    const size = opening.size
    const profile = this.createRectangleProfile(size[0], size[1])
    const solidPlacement = this.createAxisPlacement([0, 0, 0])
    const solid = this.writeEntity(
      new IFC4.IfcExtrudedAreaSolid(profile, solidPlacement, this.zAxis, this.positiveLengthMeasure(size[2]))
    )

    const representation = this.writeEntity(
      new IFC4.IfcShapeRepresentation(this.bodyContext, this.label('Body'), this.label('SweptSolid'), [solid])
    )

    const productDef = this.writeEntity(new IFC4.IfcProductDefinitionShape(null, null, [representation]))

    return this.writeEntity(
      new IFC4.IfcOpeningElement(
        this.globalId(),
        this.ownerHistory,
        this.label(opening.label ?? `${opening.areaType}-${opening.sourceId}`),
        null,
        null,
        placement,
        productDef,
        null,
        null
      )
    )
  }

  private createRectangleProfile(width: number, depth: number): Handle<IFC4.IfcArbitraryClosedProfileDef> {
    const points: [number, number][] = [
      [0, 0],
      [width, 0],
      [width, depth],
      [0, depth]
    ]
    const pointHandles = points.map(p => this.createCartesianPoint([p[0], p[1]]))
    const vertices = [...pointHandles, pointHandles[0]]
    const polyline = this.writeEntity(new IFC4.IfcPolyline(vertices))
    return this.writeEntity(new IFC4.IfcArbitraryClosedProfileDef(IFC4.IfcProfileTypeEnum.AREA, null, polyline))
  }

  // --- Materials ---

  private associateMaterial(element: Handle<IFC4.IfcElement>, materialId: MaterialId): void {
    const material = this.getOrCreateMaterial(materialId)

    this.writeEntity(
      new IFC4.IfcRelAssociatesMaterial(this.globalId(), this.ownerHistory, null, null, [element], material)
    )
  }

  private getOrCreateMaterial(materialId: MaterialId): Handle<IFC4.IfcMaterial> {
    const cached = this.materialCache.get(materialId)
    if (cached) return cached

    // Use material ID as name for now
    const material = this.writeEntity(new IFC4.IfcMaterial(this.label(materialId), null, null))

    this.materialCache.set(materialId, material)
    return material
  }

  // --- Properties ---

  private addElementProperties(element: Handle<IFC4.IfcElement>, constructionElement: ConstructionElement): void {
    const properties: Handle<IFC4.IfcProperty>[] = []

    // Volume
    const volume = constructionElement.shape.manifold.volume()
    properties.push(
      this.writeEntity(
        new IFC4.IfcPropertySingleValue(
          this.identifier('Volume'),
          this.label('Volume of the element'),
          this.volumeMeasure(volume / (1000 * 1000 * 1000), true),
          this.volumeUnit
        )
      )
    )

    // Dimensions
    const bounds = constructionElement.bounds
    properties.push(
      this.writeEntity(
        new IFC4.IfcPropertySingleValue(
          this.identifier('Width'),
          null,
          this.lengthMeasure(bounds.max[0] - bounds.min[0], true),
          this.lengthUnit
        )
      )
    )
    properties.push(
      this.writeEntity(
        new IFC4.IfcPropertySingleValue(
          this.identifier('Height'),
          null,
          this.lengthMeasure(bounds.max[2] - bounds.min[2], true),
          this.lengthUnit
        )
      )
    )
    properties.push(
      this.writeEntity(
        new IFC4.IfcPropertySingleValue(
          this.identifier('Depth'),
          null,
          this.lengthMeasure(bounds.max[1] - bounds.min[1], true),
          this.lengthUnit
        )
      )
    )

    // Part info
    if (constructionElement.partInfo) {
      if ('type' in constructionElement.partInfo && constructionElement.partInfo.type) {
        properties.push(
          this.writeEntity(
            new IFC4.IfcPropertySingleValue(
              this.identifier('PartType'),
              null,
              this.label(constructionElement.partInfo.type),
              null
            )
          )
        )
      }
    }

    // Tags
    if (constructionElement.tags) {
      if (constructionElement.tags.length > 0) {
        const tagLabels = constructionElement.tags.map(t => t.label).join(', ')
        properties.push(
          this.writeEntity(new IFC4.IfcPropertySingleValue(this.identifier('Tags'), null, this.label(tagLabels), null))
        )
      }
    }

    const pset = this.writeEntity(
      new IFC4.IfcPropertySet(this.globalId(), this.ownerHistory, this.label('Strawbaler_Properties'), null, properties)
    )

    this.writeEntity(
      new IFC4.IfcRelDefinesByProperties(this.globalId(), this.ownerHistory, null, null, [element], pset)
    )
  }

  // --- Helpers ---

  writeEntity<T extends IfcLineObject>(entity: T): Handle<T> {
    this.api.WriteLine(this.modelID, entity)
    return new Handle(entity.expressID)
  }

  createCartesianPoint(coordinates: [number, number] | [number, number, number]): Handle<IFC4.IfcCartesianPoint> {
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

  private createPlacementFromTransform(
    transform: Transform,
    parentPlacement: Handle<IFC4.IfcLocalPlacement> | null = null
  ): Handle<IFC4.IfcLocalPlacement> {
    // Extract translation from transform matrix
    const position = getPosition(transform)
    const translation: [number, number, number] = [position[0], position[1], position[2]]

    // Extract rotation axes from transform matrix
    const xAxis = getXAxis(transform)
    const zAxis = getZAxis(transform)

    // Create IFC direction vectors
    const location = this.createCartesianPoint(translation)
    const ifcZAxis = this.createDirection([zAxis[0], zAxis[1], zAxis[2]])
    const ifcXAxis = this.createDirection([xAxis[0], xAxis[1], xAxis[2]])

    const axisPlacement = this.writeEntity(new IFC4.IfcAxis2Placement3D(location, ifcZAxis, ifcXAxis))

    return this.writeEntity(new IFC4.IfcLocalPlacement(parentPlacement, axisPlacement))
  }

  private createAxisPlacement(location: [number, number, number]): Handle<IFC4.IfcAxis2Placement3D> {
    const point = this.createCartesianPoint(location)
    return this.writeEntity(new IFC4.IfcAxis2Placement3D(point, this.zAxis, this.xAxis))
  }

  private label(value: string): IFC4.IfcLabel {
    return new IFC4.IfcLabel(value)
  }

  private identifier(value: string): IFC4.IfcIdentifier {
    return new IFC4.IfcIdentifier(value)
  }

  private real(value: number, force = false): IFC4.IfcReal {
    if (force) {
      // To actually get a value like IFCPOSITIVELENGTHMEASURE(42.0) we need to do this:
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { type: 2, label: 'IFCREAL', valueType: 4, internalValue: value } as any
    }
    return new IFC4.IfcReal(value)
  }

  private volumeMeasure(value: number, force = false): IFC4.IfcVolumeMeasure {
    if (force) {
      // To actually get a value like IFCVOLUMEMEASURE(42.0) we need to do this:
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { type: 2, label: 'IFCVOLUMEMEASURE', valueType: 4, internalValue: value } as any
    }
    return new IFC4.IfcVolumeMeasure(value)
  }

  private lengthMeasure(value: number, force = false): IFC4.IfcLengthMeasure {
    if (force) {
      // To actually get a value like IFCLENGTHMEASURE(42.0) we need to do this:
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { type: 2, label: 'IFCLENGTHMEASURE', valueType: 4, internalValue: value } as any
    }
    return new IFC4.IfcLengthMeasure(value)
  }

  private positiveLengthMeasure(value: number, force = false): IFC4.IfcPositiveLengthMeasure {
    if (force) {
      // To actually get a value like IFCPOSITIVELENGTHMEASURE(42.0) we need to do this:
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { type: 2, label: 'IFCPOSITIVELENGTHMEASURE', valueType: 4, internalValue: Math.max(value, 0.01) } as any
    }
    return new IFC4.IfcPositiveLengthMeasure(Math.max(value, 1e-6))
  }

  private timestampValue(value: number): IFC4.IfcTimeStamp {
    return new IFC4.IfcTimeStamp(value)
  }

  private globalId(): IFC4.IfcGloballyUniqueId {
    return this.api.CreateIFCGloballyUniqueId(this.modelID)
  }
}
