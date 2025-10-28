import { mat4, vec2, vec3 } from 'gl-matrix'
import path from 'node:path'
import {
  IFC4,
  IFCARBITRARYCLOSEDPROFILEDEF,
  IFCARBITRARYPROFILEDEFWITHVOIDS,
  IFCAXIS2PLACEMENT2D,
  IFCAXIS2PLACEMENT3D,
  IFCBUILDINGSTOREY,
  IFCDOOR,
  IFCEXTRUDEDAREASOLID,
  IFCLOCALPLACEMENT,
  IFCOPENINGELEMENT,
  IFCPOLYLINE,
  IFCRECTANGLEPROFILEDEF,
  IFCRELCONTAINEDINSPATIALSTRUCTURE,
  IFCRELFILLSELEMENT,
  IFCRELVOIDSELEMENT,
  IFCSHAPEREPRESENTATION,
  IFCSIUNIT,
  IFCSLAB,
  IFCUNITASSIGNMENT,
  IFCWALL,
  IFCWALLSTANDARDCASE,
  IFCWINDOW,
  IfcAPI,
  type IfcLineObject,
  type Vector
} from 'web-ifc'
import wasmNodeUrl from 'web-ifc/web-ifc-node.wasm?url'
import wasmUrl from 'web-ifc/web-ifc.wasm?url'

import type {
  ExtrudedProfile,
  ImportedOpening,
  ImportedOpeningType,
  ImportedPerimeterCandidate,
  ImportedSlab,
  ImportedStorey,
  ImportedWall,
  ParsedIfcModel,
  RawIfcStorey
} from '@/importers/ifc/types'
import { createIdentityMatrix } from '@/importers/ifc/utils'
import type { Polygon2D, PolygonWithHoles2D } from '@/shared/geometry'
import { offsetPolygon, unionPolygons } from '@/shared/geometry/polygon'

interface CachedModelContext {
  readonly modelID: number
  readonly unitScale: number
}

type DisposableVector<T> = Vector<T> & { delete?: () => void }

export class IfcImporter {
  private readonly api = new IfcAPI()
  private initialised = false

  async importFromArrayBuffer(buffer: ArrayBuffer): Promise<ParsedIfcModel> {
    await this.ensureInitialised()

    const uint8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
    const modelID = this.api.OpenModel(uint8)

    try {
      const context = this.buildContext(modelID)
      const rawStoreys = this.extractStoreys(context)
      const storeys = rawStoreys.map((raw, index) => this.buildStorey(context, raw, rawStoreys[index + 1] ?? null))

      return {
        unitScale: context.unitScale,
        storeys
      }
    } finally {
      this.api.CloseModel(modelID)
    }
  }

  private async ensureInitialised(): Promise<void> {
    if (this.initialised) return

    const isNode = this.isNodeEnvironment()

    await this.api.Init((path: string, prefix: string) => {
      if (path.endsWith('.wasm')) {
        const asset = isNode ? wasmNodeUrl : wasmUrl
        const resolved = this.resolveWasmAssetPath(asset, isNode)
        return resolved
      }
      return prefix + path
    })

    this.initialised = true
  }

  private buildContext(modelID: number): CachedModelContext {
    const unitScale = this.extractModelLengthUnit(modelID)
    return { modelID, unitScale }
  }

  private buildStorey(context: CachedModelContext, raw: RawIfcStorey, nextStorey: RawIfcStorey | null): ImportedStorey {
    const walls = this.extractWalls(context, raw.line)
    const slabs = this.extractSlabs(context, raw.line)
    const height = this.estimateStoreyHeight(raw, nextStorey)
    const perimeterCandidates = this.generatePerimeterCandidates(context, walls, slabs)

    return {
      expressId: raw.expressId,
      guid: raw.guid,
      name: raw.name,
      elevation: raw.elevation,
      height,
      placement: raw.placement,
      walls,
      slabs,
      perimeterCandidates
    }
  }

  private estimateStoreyHeight(current: RawIfcStorey, nextStorey: RawIfcStorey | null): number | null {
    if (!nextStorey) {
      return null
    }

    const delta = nextStorey.elevation - current.elevation
    return delta > 0 ? delta : null
  }

  private generatePerimeterCandidates(
    context: CachedModelContext,
    walls: ImportedWall[],
    slabs: ImportedSlab[]
  ): ImportedPerimeterCandidate[] {
    const slabCandidates = this.buildSlabPerimeterCandidates(slabs)
    if (slabCandidates.length > 0) {
      return slabCandidates
    }

    return this.buildWallPerimeterCandidates(walls)
  }

  private buildSlabPerimeterCandidates(slabs: ImportedSlab[]): ImportedPerimeterCandidate[] {
    const candidates: ImportedPerimeterCandidate[] = []
    const seen = new Set<string>()

    for (const slab of slabs) {
      const footprint = slab.profile?.footprint
      if (!footprint) continue
      if (footprint.outer.points.length < 3) continue

      const key = this.serialisePolygon(footprint.outer)
      if (seen.has(key)) continue
      seen.add(key)

      candidates.push({
        source: 'slab',
        boundary: footprint
      })
    }

    return candidates
  }

  private buildWallPerimeterCandidates(walls: ImportedWall[]): ImportedPerimeterCandidate[] {
    const wallProfiles = walls
      .map(wall => wall.profile?.footprint.outer)
      .filter((polygon): polygon is Polygon2D => polygon != null)

    if (wallProfiles.length === 0) {
      return []
    }

    const union = unionPolygons(wallProfiles)
    if (union.length === 0) {
      return []
    }

    const thicknessValues = walls
      .map(wall => wall.thickness)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0)

    const averageThickness =
      thicknessValues.length > 0 ? thicknessValues.reduce((sum, value) => sum + value, 0) / thicknessValues.length : 0

    const candidates: ImportedPerimeterCandidate[] = []
    for (const polygon of union) {
      let boundary: Polygon2D | null = null
      if (averageThickness > 0) {
        const offset = offsetPolygon(polygon, -averageThickness)
        if (offset.points.length >= 3) {
          boundary = offset
        }
      }

      if (!boundary && polygon.points.length >= 3) {
        boundary = polygon
      }

      if (!boundary) continue

      const boundaryWithHoles: PolygonWithHoles2D = {
        outer: boundary,
        holes: []
      }

      candidates.push({
        source: 'walls',
        boundary: boundaryWithHoles
      })
    }

    return candidates
  }

  private serialisePolygon(polygon: Polygon2D): string {
    return polygon.points
      .map(point => `${Math.round(point[0])}:${Math.round(point[1])}`)
      .join('|')
  }

  private extractWalls(context: CachedModelContext, storey: IFC4.IfcBuildingStorey): ImportedWall[] {
    const walls: ImportedWall[] = []

    for (const relationRef of this.toArray(storey.ContainsElements)) {
      const relation = this.dereferenceLine(context, relationRef)
      if (!this.isRelContainedInSpatialStructure(relation)) continue

      for (const elementRef of this.toArray(relation.RelatedElements)) {
        const element = this.dereferenceLine(context, elementRef)
        if (!this.isWallElement(element)) continue

        const wall = element as IFC4.IfcWall
        const placement = this.resolveObjectPlacement(context, wall)
        const profile = this.extractPrimaryExtrudedProfile(context, wall, placement)
        const openings = this.extractOpenings(context, wall)
        const height = profile?.extrusionDepth ?? null
        const thickness = profile != null ? this.estimateWallThickness(profile) : null

        walls.push({
          expressId: wall.expressID,
          guid: this.getStringValue(wall.GlobalId),
          name: this.getStringValue(wall.Name),
          placement,
          height,
          thickness,
          profile,
          path: null,
          openings
        })
      }
    }

    return walls
  }

  private extractSlabs(context: CachedModelContext, storey: IFC4.IfcBuildingStorey): ImportedSlab[] {
    const slabs: ImportedSlab[] = []

    for (const relationRef of this.toArray(storey.ContainsElements)) {
      const relation = this.dereferenceLine(context, relationRef)
      if (!this.isRelContainedInSpatialStructure(relation)) continue

      for (const elementRef of this.toArray(relation.RelatedElements)) {
        const element = this.dereferenceLine(context, elementRef)
        if (!this.isSlabElement(element)) continue

        const slab = element as IFC4.IfcSlab
        const placement = this.resolveObjectPlacement(context, slab)
        const profile = this.extractPrimaryExtrudedProfile(context, slab, placement)
        const thickness = profile?.extrusionDepth ?? null

        slabs.push({
          expressId: slab.expressID,
          guid: this.getStringValue(slab.GlobalId),
          name: this.getStringValue(slab.Name),
          placement,
          profile,
          thickness
        })
      }
    }

    return slabs
  }

  private extractOpenings(context: CachedModelContext, wall: IFC4.IfcWall): ImportedOpening[] {
    const openings: ImportedOpening[] = []

    for (const openingRelRef of this.toArray(wall.HasOpenings)) {
      const relation = this.dereferenceLine(context, openingRelRef)
      if (!this.isRelVoidsElement(relation)) continue

      const openingElement = this.dereferenceLine(context, relation.RelatedOpeningElement)
      if (!this.isOpeningElement(openingElement)) continue

      const openingPlacement = this.resolveObjectPlacement(context, openingElement)
      const profile = this.extractPrimaryExtrudedProfile(context, openingElement, openingPlacement)
      const type = this.detectOpeningType(context, openingElement)

      openings.push({
        expressId: openingElement.expressID,
        guid: this.getStringValue(openingElement.GlobalId),
        type,
        profile,
        placement: openingPlacement
      })
    }

    return openings
  }

  private detectOpeningType(context: CachedModelContext, opening: IFC4.IfcOpeningElement): ImportedOpeningType {
    let detected: ImportedOpeningType = 'void'

    for (const fillingRef of this.toArray(opening.HasFillings)) {
      const fillingRelation = this.dereferenceLine(context, fillingRef)
      if (!this.isRelFillsElement(fillingRelation)) continue

      const relatedElement = this.dereferenceLine(context, fillingRelation.RelatedBuildingElement)
      if (this.isDoorElement(relatedElement)) {
        return 'door'
      }
      if (this.isWindowElement(relatedElement)) {
        detected = 'window'
      }
    }

    return detected
  }

  private extractPrimaryExtrudedProfile(
    context: CachedModelContext,
    product: IFC4.IfcProduct,
    productPlacement: mat4
  ): ExtrudedProfile | null {
    const representationRef = product.Representation
    const representation = this.dereferenceLine(context, representationRef)
    if (!representation) {
      return null
    }

    let fallbackShape: IFC4.IfcShapeRepresentation | null = null

    for (const shapeRef of this.toArray((representation as IFC4.IfcProductRepresentation).Representations)) {
      const shape = this.dereferenceLine(context, shapeRef)
      if (!this.isShapeRepresentation(shape)) continue

      const identifier = this.getStringValue(shape.RepresentationIdentifier)?.toLowerCase()
      if (identifier === 'body') {
        const profile = this.extractExtrudedProfileFromShape(context, shape, productPlacement)
        if (profile) {
          return profile
        }
      }

      if (!fallbackShape) {
        fallbackShape = shape
      }
    }

    if (fallbackShape) {
      return this.extractExtrudedProfileFromShape(context, fallbackShape, productPlacement)
    }

    return null
  }

  private extractExtrudedProfileFromShape(
    context: CachedModelContext,
    shape: IFC4.IfcShapeRepresentation,
    productPlacement: mat4
  ): ExtrudedProfile | null {
    for (const itemRef of this.toArray(shape.Items)) {
      const item = this.dereferenceLine(context, itemRef)
      if (!this.isExtrudedAreaSolid(item)) continue

      return this.buildExtrudedProfile(context, item as IFC4.IfcExtrudedAreaSolid, productPlacement)
    }

    return null
  }

  private buildExtrudedProfile(
    context: CachedModelContext,
    solid: IFC4.IfcExtrudedAreaSolid,
    productPlacement: mat4
  ): ExtrudedProfile | null {
    const profilePolygon = this.extractProfilePolygon(context, solid.SweptArea)
    if (!profilePolygon) {
      return null
    }

    const positionMatrix = solid.Position
      ? this.resolveAxis2Placement3D(context, solid.Position)
      : createIdentityMatrix()
    const localToWorld = mat4.mul(mat4.create(), productPlacement, positionMatrix)
    const footprint = this.transformPolygonWithMatrix(localToWorld, profilePolygon)

    const extrusionDirectionLocal = this.getDirection3(context, solid.ExtrudedDirection) ?? vec3.fromValues(0, 0, 1)
    const extrusionDirection = this.transformDirection(localToWorld, extrusionDirectionLocal)
    const extrusionDepth = Math.abs(this.getNumberValue(solid.Depth)) * context.unitScale

    return {
      footprint,
      localOutline: profilePolygon.outer,
      localToWorld,
      extrusionDirection,
      extrusionDepth
    }
  }

  private transformPolygonWithMatrix(matrix: mat4, polygon: PolygonWithHoles2D): PolygonWithHoles2D {
    return {
      outer: this.transformPolygon(matrix, polygon.outer),
      holes: polygon.holes.map(hole => this.transformPolygon(matrix, hole))
    }
  }

  private transformPolygon(matrix: mat4, polygon: Polygon2D): Polygon2D {
    const points = polygon.points.map(point => this.transformPoint(matrix, point))
    return { points }
  }

  private transformPoint(matrix: mat4, point: vec2): vec2 {
    const vector = vec3.fromValues(point[0], point[1], 0)
    const transformed = vec3.transformMat4(vec3.create(), vector, matrix)
    return vec2.fromValues(transformed[0], transformed[1])
  }

  private transformDirection(matrix: mat4, direction: vec3): vec3 {
    const result = vec3.fromValues(
      matrix[0] * direction[0] + matrix[4] * direction[1] + matrix[8] * direction[2],
      matrix[1] * direction[0] + matrix[5] * direction[1] + matrix[9] * direction[2],
      matrix[2] * direction[0] + matrix[6] * direction[1] + matrix[10] * direction[2]
    )
    return vec3.normalize(result, result)
  }

  private extractProfilePolygon(context: CachedModelContext, profileRef: unknown): PolygonWithHoles2D | null {
    const profile = this.dereferenceLine(context, profileRef)
    if (!profile) {
      return null
    }

    if (this.isArbitraryProfileWithVoids(profile)) {
      const outer = this.extractCurvePolygon(context, profile.OuterCurve)
      if (!outer) return null
      const holes = this.toArray(profile.InnerCurves)
        .map(curve => this.extractCurvePolygon(context, curve))
        .filter((hole): hole is Polygon2D => hole != null)
      return { outer, holes }
    }

    if (this.isArbitraryClosedProfile(profile)) {
      const outer = this.extractCurvePolygon(context, profile.OuterCurve)
      if (!outer) return null
      return { outer, holes: [] }
    }

    if (this.isRectangleProfile(profile)) {
      const rectangle = this.createRectanglePolygon(context, profile)
      return rectangle ? { outer: rectangle, holes: [] } : null
    }

    return null
  }

  private extractCurvePolygon(context: CachedModelContext, curveRef: unknown): Polygon2D | null {
    const curve = this.dereferenceLine(context, curveRef)
    if (this.isPolyline(curve)) {
      const points = this.convertPolylineToPoints(context, curve)
      return points.length >= 3 ? { points } : null
    }

    return null
  }

  private convertPolylineToPoints(context: CachedModelContext, polyline: IFC4.IfcPolyline): vec2[] {
    const rawPoints: vec2[] = []

    for (const pointRef of this.toArray(polyline.Points)) {
      const point = this.dereferenceLine(context, pointRef)
      if (!this.isCartesianPoint(point)) continue

      const coords = point.Coordinates ?? []
      const x = this.getNumberValue(coords[0]) * context.unitScale
      const y = this.getNumberValue(coords[1]) * context.unitScale
      rawPoints.push(vec2.fromValues(x, y))
    }

    return this.sanitizePolygonPoints(rawPoints)
  }

  private createRectanglePolygon(context: CachedModelContext, profile: IFC4.IfcRectangleProfileDef): Polygon2D | null {
    const xDim = this.getNumberValue(profile.XDim) * context.unitScale
    const yDim = this.getNumberValue(profile.YDim) * context.unitScale

    if (xDim === 0 || yDim === 0) {
      return null
    }

    const halfX = xDim / 2
    const halfY = yDim / 2

    const points = [
      vec2.fromValues(-halfX, -halfY),
      vec2.fromValues(halfX, -halfY),
      vec2.fromValues(halfX, halfY),
      vec2.fromValues(-halfX, halfY)
    ]

    if (profile.Position) {
      return {
        points: points.map(point => this.applyAxis2Placement2D(context, profile.Position as unknown, point))
      }
    }

    return { points }
  }

  private applyAxis2Placement2D(context: CachedModelContext, placementRef: unknown, point: vec2): vec2 {
    const placement = this.dereferenceLine(context, placementRef)
    if (!this.isAxis2Placement2D(placement)) {
      return vec2.clone(point)
    }

    const origin3 = this.getPoint3(context, placement.Location)
    const origin = vec2.fromValues(origin3[0], origin3[1])

    let xDir = vec2.fromValues(1, 0)
    if (placement.RefDirection) {
      const refDir = this.dereferenceLine(context, placement.RefDirection)
      if (this.isDirection(refDir)) {
        const ratios = refDir.DirectionRatios ?? []
        xDir = vec2.fromValues(this.getNumberValue(ratios[0]), this.getNumberValue(ratios[1]))
      }
    }

    if (vec2.length(xDir) === 0) {
      xDir = vec2.fromValues(1, 0)
    } else {
      vec2.normalize(xDir, xDir)
    }

    const yDir = vec2.fromValues(-xDir[1], xDir[0])

    const transformed = vec2.create()
    vec2.scaleAndAdd(transformed, transformed, xDir, point[0])
    vec2.scaleAndAdd(transformed, transformed, yDir, point[1])
    vec2.add(transformed, transformed, origin)
    return transformed
  }

  private estimateWallThickness(profile: ExtrudedProfile): number | null {
    const xs = profile.localOutline.points.map(p => p[0])
    const ys = profile.localOutline.points.map(p => p[1])

    if (xs.length === 0 || ys.length === 0) {
      return null
    }

    const width = Math.max(...xs) - Math.min(...xs)
    const depth = Math.max(...ys) - Math.min(...ys)
    const thickness = Math.min(Math.abs(width), Math.abs(depth))
    return thickness > 0 ? thickness : null
  }

  private sanitizePolygonPoints(points: vec2[]): vec2[] {
    if (points.length < 2) {
      return points
    }

    const first = points[0]
    const last = points[points.length - 1]
    if (Math.abs(first[0] - last[0]) < 1e-6 && Math.abs(first[1] - last[1]) < 1e-6) {
      return points.slice(0, -1)
    }

    return points
  }

  private resolveWasmAssetPath(assetUrl: string, isNode: boolean): string {
    if (!isNode) {
      return assetUrl
    }

    if (assetUrl.startsWith('http://') || assetUrl.startsWith('https://')) {
      return assetUrl
    }

    if (assetUrl.startsWith('file://')) {
      return decodeURIComponent(new URL(assetUrl).pathname)
    }

    if (assetUrl.startsWith('/')) {
      return path.join(process.cwd(), assetUrl.slice(1))
    }

    try {
      const resolved = new URL(assetUrl, import.meta.url)
      return decodeURIComponent(resolved.pathname)
    } catch {
      return assetUrl
    }
  }

  private isNodeEnvironment(): boolean {
    const proc = globalThis.process as NodeJS.Process | undefined
    return typeof proc === 'object' && proc?.release?.name === 'node'
  }

  private extractStoreys(context: CachedModelContext): RawIfcStorey[] {
    const ids = this.api.GetLineIDsWithType(context.modelID, IFCBUILDINGSTOREY) as DisposableVector<number>
    const storeys: RawIfcStorey[] = []

    for (let i = 0; i < ids.size(); i++) {
      const expressId = ids.get(i)
      const storey = this.api.GetLine(context.modelID, expressId, false, true) as IFC4.IfcBuildingStorey

      const guid = this.getStringValue(storey.GlobalId)
      const name = this.getStringValue(storey.Name)

      const elevationRaw = this.getNumberValue(storey.Elevation)
      const elevation = elevationRaw * context.unitScale

      const placement = this.resolveObjectPlacement(context, storey)

      storeys.push({
        expressId,
        guid,
        name,
        elevation,
        placement,
        line: storey
      })
    }

    storeys.sort((a, b) => a.elevation - b.elevation)
    this.disposeVector(ids)
    return storeys
  }

  private extractModelLengthUnit(modelID: number): number {
    const assignments = this.api.GetLineIDsWithType(modelID, IFCUNITASSIGNMENT) as DisposableVector<number>
    try {
      if (assignments.size() === 0) {
        return 1
      }

      const assignment = this.api.GetLine(modelID, assignments.get(0)) as IFC4.IfcUnitAssignment
      const context: CachedModelContext = { modelID, unitScale: 1 }

      for (const unitRef of this.toArray(assignment.Units)) {
        const unitLine = this.dereferenceLine(context, unitRef)
        if (!this.isSiUnit(unitLine)) continue

        if (this.enumEquals(unitLine.UnitType, IFC4.IfcUnitEnum.LENGTHUNIT)) {
          return this.computeSiPrefixScale(unitLine.Prefix, unitLine.Name)
        }
      }
    } finally {
      this.disposeVector(assignments)
    }

    return 1
  }

  private computeSiPrefixScale(prefix: IFC4.IfcSIPrefix | null, name: IFC4.IfcSIUnitName): number {
    const metreScale = 1000

    if (this.enumEquals(prefix, IFC4.IfcSIPrefix.MILLI)) {
      return 1
    }

    if (this.enumEquals(name, IFC4.IfcSIUnitName.METRE)) {
      return metreScale
    }

    return metreScale
  }

  private resolveObjectPlacement(context: CachedModelContext, product: IFC4.IfcProduct): mat4 {
    const placementReference = product.ObjectPlacement ?? null
    if (placementReference == null) {
      return createIdentityMatrix()
    }

    return this.resolvePlacementRecursive(context, placementReference)
  }

  private resolvePlacementRecursive(context: CachedModelContext, reference: unknown): mat4 {
    const placement = this.dereferenceLine(context, reference)
    if (!this.isLocalPlacement(placement)) {
      return createIdentityMatrix()
    }

    const relativeReference = placement.RelativePlacement ?? null
    const parentReference = placement.PlacementRelTo ?? null

    const relativeMatrix =
      relativeReference != null ? this.resolveAxis2Placement3D(context, relativeReference) : createIdentityMatrix()
    const parentMatrix =
      parentReference != null ? this.resolvePlacementRecursive(context, parentReference) : createIdentityMatrix()

    return mat4.mul(mat4.create(), parentMatrix, relativeMatrix)
  }

  private resolveAxis2Placement3D(context: CachedModelContext, reference: unknown): mat4 {
    const placement = this.dereferenceLine(context, reference)
    if (!this.isAxis2Placement3D(placement)) {
      return createIdentityMatrix()
    }

    const matrix = mat4.create()
    mat4.identity(matrix)

    const location = this.getPoint3(context, placement.Location)
    const axis = this.getDirection3(context, placement.Axis) ?? vec3.fromValues(0, 0, 1)
    const refDirection = this.getDirection3(context, placement.RefDirection) ?? vec3.fromValues(1, 0, 0)

    const localX = vec3.normalize(vec3.create(), refDirection)
    const localZ = vec3.normalize(vec3.create(), axis)
    const localY = vec3.cross(vec3.create(), localZ, localX)
    vec3.normalize(localY, localY)

    matrix[0] = localX[0]
    matrix[1] = localX[1]
    matrix[2] = localX[2]

    matrix[4] = localY[0]
    matrix[5] = localY[1]
    matrix[6] = localY[2]

    matrix[8] = localZ[0]
    matrix[9] = localZ[1]
    matrix[10] = localZ[2]

    matrix[12] = location[0]
    matrix[13] = location[1]
    matrix[14] = location[2]

    return matrix
  }

  private getPoint3(context: CachedModelContext, reference: unknown): vec3 {
    const pointLine = this.dereferenceLine(context, reference)
    if (!this.isCartesianPoint(pointLine)) {
      return vec3.fromValues(0, 0, 0)
    }

    const coords = pointLine.Coordinates ?? []
    return vec3.fromValues(
      this.getNumberValue(coords[0]) * context.unitScale,
      this.getNumberValue(coords[1]) * context.unitScale,
      this.getNumberValue(coords[2] ?? 0) * context.unitScale
    )
  }

  private getDirection3(context: CachedModelContext, reference: unknown): vec3 | null {
    const directionLine = this.dereferenceLine(context, reference)
    if (!this.isDirection(directionLine)) {
      return null
    }

    const ratios = directionLine.DirectionRatios ?? []
    return vec3.fromValues(
      this.getNumberValue(ratios[0]),
      this.getNumberValue(ratios[1]),
      this.getNumberValue(ratios[2] ?? 0)
    )
  }

  private isRelContainedInSpatialStructure(
    value: IfcLineObject | null
  ): value is IFC4.IfcRelContainedInSpatialStructure {
    return value != null && value.type === IFCRELCONTAINEDINSPATIALSTRUCTURE
  }

  private isRelVoidsElement(value: IfcLineObject | null): value is IFC4.IfcRelVoidsElement {
    return value != null && value.type === IFCRELVOIDSELEMENT
  }

  private isRelFillsElement(value: IfcLineObject | null): value is IFC4.IfcRelFillsElement {
    return value != null && value.type === IFCRELFILLSELEMENT
  }

  private isWallElement(value: IfcLineObject | null): value is IFC4.IfcWall {
    return value != null && (value.type === IFCWALL || value.type === IFCWALLSTANDARDCASE)
  }

  private isSlabElement(value: IfcLineObject | null): value is IFC4.IfcSlab {
    return value != null && value.type === IFCSLAB
  }

  private isOpeningElement(value: IfcLineObject | null): value is IFC4.IfcOpeningElement {
    return value != null && value.type === IFCOPENINGELEMENT
  }

  private isDoorElement(value: IfcLineObject | null): value is IFC4.IfcDoor {
    return value != null && value.type === IFCDOOR
  }

  private isWindowElement(value: IfcLineObject | null): value is IFC4.IfcWindow {
    return value != null && value.type === IFCWINDOW
  }

  private isShapeRepresentation(value: IfcLineObject | null): value is IFC4.IfcShapeRepresentation {
    return value != null && value.type === IFCSHAPEREPRESENTATION
  }

  private isExtrudedAreaSolid(value: IfcLineObject | null): value is IFC4.IfcExtrudedAreaSolid {
    return value != null && value.type === IFCEXTRUDEDAREASOLID
  }

  private isArbitraryClosedProfile(value: IfcLineObject | null): value is IFC4.IfcArbitraryClosedProfileDef {
    return value != null && value.type === IFCARBITRARYCLOSEDPROFILEDEF
  }

  private isArbitraryProfileWithVoids(value: IfcLineObject | null): value is IFC4.IfcArbitraryProfileDefWithVoids {
    return value != null && value.type === IFCARBITRARYPROFILEDEFWITHVOIDS
  }

  private isRectangleProfile(value: IfcLineObject | null): value is IFC4.IfcRectangleProfileDef {
    return value != null && value.type === IFCRECTANGLEPROFILEDEF
  }

  private isPolyline(value: IfcLineObject | null): value is IFC4.IfcPolyline {
    return value != null && value.type === IFCPOLYLINE
  }

  private toArray<T>(value: T | Iterable<T> | Vector<T> | null | undefined): T[] {
    if (value == null) {
      return []
    }

    if (Array.isArray(value)) {
      return value
    }

    if (typeof value === 'object') {
      const vectorCandidate = value as Vector<T>
      if (typeof vectorCandidate.size === 'function' && typeof vectorCandidate.get === 'function') {
        const result: T[] = []
        const length = vectorCandidate.size()
        for (let i = 0; i < length; i++) {
          result.push(vectorCandidate.get(i))
        }
        return result
      }

      if (Symbol.iterator in value) {
        return Array.from(value as Iterable<T>)
      }
    }

    return [value as T]
  }

  private getStringValue(value: unknown): string | null {
    if (typeof value === 'string') {
      return value
    }

    if (typeof value === 'object' && value != null && 'value' in value) {
      const raw = (value as { value: unknown }).value
      if (typeof raw === 'string') {
        return raw
      }
    }

    return null
  }

  private getNumberValue(value: unknown): number {
    if (typeof value === 'number') {
      return value
    }

    if (typeof value === 'object' && value != null && 'value' in value) {
      const raw = (value as { value: unknown }).value
      if (typeof raw === 'number') {
        return raw
      }
      if (typeof raw === 'string') {
        const parsed = Number(raw)
        return Number.isFinite(parsed) ? parsed : 0
      }
    }

    return 0
  }

  private disposeVector<T>(vector: DisposableVector<T> | null | undefined): void {
    if (vector && typeof vector.delete === 'function') {
      vector.delete()
    }
  }

  private dereferenceLine(context: CachedModelContext, reference: unknown): IfcLineObject | null {
    if (this.isLineObject(reference)) {
      return reference
    }

    const expressId = this.getExpressId(reference)
    if (expressId != null) {
      return this.api.GetLine(context.modelID, expressId, false, true) as IfcLineObject
    }

    return null
  }

  private isLineObject(value: unknown): value is IfcLineObject {
    return (
      typeof value === 'object' &&
      value != null &&
      'expressID' in value &&
      typeof (value as { expressID: unknown }).expressID === 'number'
    )
  }

  private getExpressId(reference: unknown): number | null {
    if (typeof reference === 'number') {
      return reference
    }

    if (typeof reference === 'object' && reference != null) {
      if ('value' in reference && typeof (reference as { value: unknown }).value === 'number') {
        return (reference as { value: number }).value
      }

      if ('ExpressID' in reference && typeof (reference as { ExpressID: unknown }).ExpressID === 'number') {
        return (reference as { ExpressID: number }).ExpressID
      }
    }

    return null
  }

  private enumEquals(value: unknown, expected: unknown): boolean {
    const actualValue = this.extractEnumValue(value)
    const expectedValue = this.extractEnumValue(expected)
    return actualValue != null && actualValue === expectedValue
  }

  private extractEnumValue(value: unknown): string | number | null {
    if (value == null) {
      return null
    }

    if (typeof value === 'string' || typeof value === 'number') {
      return value
    }

    if (typeof value === 'object' && 'value' in value) {
      const raw = (value as { value: unknown }).value
      if (typeof raw === 'string' || typeof raw === 'number') {
        return raw
      }
    }

    return null
  }

  private isLocalPlacement(value: IfcLineObject | null): value is IFC4.IfcLocalPlacement {
    return value != null && value.type === IFCLOCALPLACEMENT
  }

  private isAxis2Placement3D(value: IfcLineObject | null): value is IFC4.IfcAxis2Placement3D {
    return value != null && value.type === IFCAXIS2PLACEMENT3D
  }

  private isAxis2Placement2D(value: IfcLineObject | null): value is IFC4.IfcAxis2Placement2D {
    return value != null && value.type === IFCAXIS2PLACEMENT2D
  }

  private isCartesianPoint(value: IfcLineObject | null): value is IFC4.IfcCartesianPoint {
    return value != null && Array.isArray((value as IFC4.IfcCartesianPoint).Coordinates)
  }

  private isDirection(value: IfcLineObject | null): value is IFC4.IfcDirection {
    return value != null && Array.isArray((value as IFC4.IfcDirection).DirectionRatios)
  }

  private isSiUnit(value: IfcLineObject | null): value is IFC4.IfcSIUnit {
    return value != null && value.type === IFCSIUNIT
  }
}
