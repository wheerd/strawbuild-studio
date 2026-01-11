import {
  Handle,
  IFC4,
  IFCARBITRARYCLOSEDPROFILEDEF,
  IFCARBITRARYPROFILEDEFWITHVOIDS,
  IFCAXIS2PLACEMENT2D,
  IFCAXIS2PLACEMENT3D,
  IFCBUILDINGSTOREY,
  IFCCARTESIANPOINTLIST3D,
  IFCCONVERSIONBASEDUNIT,
  IFCDOOR,
  IFCEXTRUDEDAREASOLID,
  IFCEXTRUDEDAREASOLIDTAPERED,
  IFCINDEXEDPOLYGONALFACE,
  IFCINDEXEDPOLYGONALFACEWITHVOIDS,
  IFCLOCALPLACEMENT,
  IFCOPENINGELEMENT,
  IFCPOLYGONALFACESET,
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
  ImportedPerimeterSegment,
  ImportedSlab,
  ImportedStorey,
  ImportedWall,
  ParsedIfcModel,
  RawIfcStorey
} from '@/importers/ifc/types'
import {
  Bounds2D,
  Bounds3D,
  IDENTITY,
  type LineSegment2D,
  type Polygon2D,
  type PolygonWithHoles2D,
  type Transform,
  type Vec2,
  type Vec3,
  ZERO_VEC2,
  addVec2,
  composeTransform,
  copyVec2,
  crossVec3,
  direction,
  distVec2,
  distanceToInfiniteLine,
  distanceToLineSegment,
  dotAbsVec2,
  dotVec2,
  lenVec2,
  newVec2,
  newVec3,
  normVec2,
  normVec3,
  roundVec2,
  scaleAddVec2,
  scaleAddVec3,
  scaleVec2,
  scaleVec3,
  subVec2,
  transform,
  transformFromArray,
  transformFromValues,
  vec3To2
} from '@/shared/geometry'
import {
  type Polygon3D,
  type PolygonWithHoles3D,
  arePolygonsIntersecting,
  calculatePolygonArea,
  ensurePolygonIsClockwise,
  isPointInPolygon,
  minimumAreaBoundingBox,
  offsetPolygon,
  polygonEdgeOffset,
  polygonPerimeter,
  simplifyPolygon,
  unionPolygons,
  unionPolygonsWithHoles,
  wouldClosingPolygonSelfIntersect
} from '@/shared/geometry/polygon'

interface CachedModelContext {
  readonly modelID: number
  readonly unitScale: number
}

type DisposableVector<T> = Vector<T> & { delete?: () => void }

interface OpeningProjection {
  readonly type: ImportedOpeningType
  readonly polygon: Polygon2D
  readonly height: number
  readonly sill?: number
}

interface WallEdgeInfo {
  readonly start: Vec2
  readonly end: Vec2
  readonly direction: Vec2
  readonly length: number
  readonly thickness: number
}

const EDGE_ALIGNMENT_DOT_THRESHOLD = 0.98
const EDGE_DISTANCE_TOLERANCE = 10
const MINIMUM_THICKNESS = 50
const DEFAULT_WALL_THICKNESS = 300
const SHELL_THRESHOLD = 1000
const MERGE_SLAB_TOLERANCE = 5
const MERGE_WALL_TOLERANCE = 2
const SIMPLIFY_TOLERANCE = 3

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
    const perimeterCandidates = this.generatePerimeterCandidates(walls, slabs, raw.elevation)

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
    walls: ImportedWall[],
    slabs: ImportedSlab[],
    elevation: number
  ): ImportedPerimeterCandidate[] {
    const slabHoles = this.collectSlabOpenings(slabs)
    const wallOpenings = this.collectWallOpenings(walls, elevation)

    const wallCandidates = this.buildWallPerimeterCandidates(walls, slabHoles, wallOpenings)
    if (wallCandidates.length > 0) {
      return wallCandidates
    }

    return this.buildSlabPerimeterCandidates(slabs, walls, slabHoles, wallOpenings)
  }

  private buildWallPerimeterCandidates(
    walls: ImportedWall[],
    slabHoles: Polygon2D[],
    wallOpenings: OpeningProjection[]
  ): ImportedPerimeterCandidate[] {
    const wallFootprints = walls
      .filter(w => !w.thickness || w.thickness > MINIMUM_THICKNESS)
      .map(wall => wall.profile?.footprint.outer)
      .filter((polygon): polygon is Polygon2D => polygon != null && polygon.points.length >= 3)
      .map(p => offsetPolygon(ensurePolygonIsClockwise(simplifyPolygon(p, SIMPLIFY_TOLERANCE)), MERGE_WALL_TOLERANCE))
      .map(p => ({
        points: p.points.map(p => roundVec2(p))
      }))

    if (wallFootprints.length === 0) {
      return []
    }

    const unionShells = unionPolygonsWithHoles(wallFootprints).map(s => simplifyPolygon(s.outer, SIMPLIFY_TOLERANCE))
    const outerShells = unionShells.filter((shell, i) =>
      shell.points.every(point => unionShells.every((other, j) => i === j || !isPointInPolygon(point, other)))
    )
    const sizableShells = outerShells.filter(s => this.areaToPerimeterRatio(s) > SHELL_THRESHOLD)

    if (sizableShells.length === 0) {
      return []
    }

    const remainingSlabHoles = [...slabHoles]
    const candidates: ImportedPerimeterCandidate[] = []

    const wallEdges = this.collectWallEdges(walls)
    const averageThickness = this.computeAverageWallThickness(walls)

    for (const shell of sizableShells) {
      const outer = simplifyPolygon(
        offsetPolygon(ensurePolygonIsClockwise(shell), -MERGE_WALL_TOLERANCE),
        SIMPLIFY_TOLERANCE
      )
      const edgeThicknesses = this.deriveEdgeThicknesses(outer, wallEdges, -averageThickness)
      const innerPolygon = this.offsetPolygonWithThickness(outer, edgeThicknesses)
      if (!innerPolygon || wouldClosingPolygonSelfIntersect(innerPolygon)) continue

      const segments = this.createPerimeterSegments(innerPolygon, edgeThicknesses)
      this.assignOpeningsToSegments(outer, segments, wallOpenings)

      const holes = this.extractHolesForShell(outer, remainingSlabHoles)

      candidates.push({
        source: 'walls',
        boundary: {
          outer: clonePolygon2D(innerPolygon),
          holes: holes.map(clonePolygon2D)
        },
        segments
      })
    }

    return candidates
  }

  private areaToPerimeterRatio(polygon: Polygon2D) {
    const area = calculatePolygonArea(polygon)
    const perimeter = polygonPerimeter(polygon)
    return perimeter > 0 ? (2 * area) / perimeter : 0
  }

  private buildSlabPerimeterCandidates(
    slabs: ImportedSlab[],
    walls: ImportedWall[],
    slabHoles: Polygon2D[],
    wallOpenings: OpeningProjection[]
  ): ImportedPerimeterCandidate[] {
    const allSlabOuter = slabs
      .map(slab => slab.profile?.footprint.outer)
      .filter((polygon): polygon is Polygon2D => polygon != null && polygon.points.length >= 3)
      .map(p => offsetPolygon(simplifyPolygon(ensurePolygonIsClockwise(p)), MERGE_SLAB_TOLERANCE))

    if (allSlabOuter.length === 0) return []

    const averageThickness = this.computeAverageWallThickness(walls)

    const mergedOuter = unionPolygons(allSlabOuter)

    return mergedOuter.map(outer => {
      const simplified = offsetPolygon(
        ensurePolygonIsClockwise(simplifyPolygon(outer, SIMPLIFY_TOLERANCE)),
        -MERGE_SLAB_TOLERANCE
      )
      const inner =
        this.offsetPolygonWithThickness(
          simplified,
          simplified.points.map(_ => -averageThickness)
        ) ?? simplified
      const relevantHoles = slabHoles.filter(h => arePolygonsIntersecting(h, inner))

      const segments = this.createPerimeterSegments(
        inner,
        inner.points.map(() => averageThickness)
      )
      this.assignOpeningsToSegments(simplified, segments, wallOpenings)

      return {
        source: 'slab',
        boundary: {
          outer: clonePolygon2D(inner),
          holes: relevantHoles.map(clonePolygon2D)
        },
        segments
      }
    })
  }

  private projectGeometry(
    context: CachedModelContext,
    element: IFC4.IfcProduct
  ): { bounds: Bounds3D; polygons: Polygon2D[] }[] {
    const mesh = this.api.GetFlatMesh(context.modelID, element.expressID)
    const results: { bounds: Bounds3D; polygons: Polygon2D[] }[] = []
    for (let j = 0; j < mesh.geometries.size(); j++) {
      const placedGeometry = mesh.geometries.get(j)
      const matrix = transformFromArray(placedGeometry.flatTransformation)
      const geometry = this.api.GetGeometry(context.modelID, placedGeometry.geometryExpressID)

      const idx = this.api.GetIndexArray(geometry.GetIndexData(), geometry.GetIndexDataSize())
      const v = this.api.GetVertexArray(geometry.GetVertexData(), geometry.GetVertexDataSize())
      const posArray = this.ifcGeometryToPosArray(v)
      const rawPoints = this.posArrayToVec2(posArray)
      const indices = Array.from(idx)
      geometry.delete()

      const points = rawPoints.map(p => scaleVec3(transform(p, matrix), 1000))

      // --- Project triangles to XY and collect as polygons ---
      const usedPoints: Vec3[] = []
      const triPolys: Polygon2D[] = []
      for (let t = 0; t < indices.length; t += 3) {
        const i0 = indices[t]
        const i1 = indices[t + 1]
        const i2 = indices[t + 2]

        usedPoints.push(points[i0], points[i1], points[i2])

        const p0: Vec2 = newVec2(points[i0][0], -points[i0][2])
        const p1: Vec2 = newVec2(points[i1][0], -points[i1][2])
        const p2: Vec2 = newVec2(points[i2][0], -points[i2][2])

        const a2 = this.signedArea2([p0, p1, p2])
        if (Math.abs(a2) <= 1e-10) continue // drop degenerate/flat

        // Ensure CCW winding (many union libs expect outer rings CCW)
        triPolys.push({ points: a2 > 0 ? [p0, p1, p2] : [p0, p2, p1] })
      }

      const bounds = Bounds3D.fromPoints(usedPoints)
      if (bounds.isEmpty) continue

      const polygons = unionPolygons(triPolys).map(simplifyPolygon)

      results.push({ bounds, polygons })
    }
    if ('delete' in mesh) mesh.delete()

    return results
  }

  private ifcGeometryToPosArray(vertexData: Float32Array): Float32Array {
    const posFloats = new Float32Array(vertexData.length / 2)

    for (let i = 0; i < vertexData.length; i += 6) {
      posFloats[i / 2] = vertexData[i]
      posFloats[i / 2 + 1] = vertexData[i + 1]
      posFloats[i / 2 + 2] = vertexData[i + 2]
    }

    return posFloats
  }

  private posArrayToVec2(posFloats: Float32Array): Vec3[] {
    const points: Vec3[] = []
    for (let i = 0; i < posFloats.length; i += 3) {
      points.push(newVec3(posFloats[i], posFloats[i + 1], posFloats[i + 2]))
    }
    return points
  }

  private signedArea2(pts: Vec2[]): number {
    let a = 0
    for (let i = 0, n = pts.length; i < n; i++) {
      const [x0, y0] = pts[i]
      const [x1, y1] = pts[(i + 1) % n]
      a += x0 * y1 - y0 * x1
    }
    return 0.5 * a
  }

  private collectSlabOpenings(slabs: ImportedSlab[]): Polygon2D[] {
    const holes: Polygon2D[] = []
    for (const slab of slabs) {
      const profile = slab.profile
      if (profile) {
        for (const hole of profile.footprint.holes) {
          if (hole.points.length >= 3) {
            holes.push(clonePolygon2D(hole))
          }
        }
      }
      for (const opening of slab.openings) {
        if (opening.profile?.footprint) {
          holes.push(clonePolygon2D(opening.profile.footprint.outer))
        }
      }
    }
    return holes
  }

  private collectWallOpenings(walls: ImportedWall[], elevation: number): OpeningProjection[] {
    const openings: OpeningProjection[] = []
    const openingIds = new Set<number>()

    for (const wall of walls) {
      for (const opening of wall.openings) {
        if (openingIds.has(opening.expressId)) continue
        openingIds.add(opening.expressId)
        if (!opening.profile) continue
        const polygon = opening.profile.footprint.outer
        if (polygon.points.length < 3) continue
        const profileBounds = Bounds2D.fromPoints(opening.profile.localOutline.points)
        const sillHeight =
          opening.placement[14] - elevation + (opening.profile.extrusionDirection[2] === 0 ? profileBounds.min[1] : 0)
        const height =
          opening.profile.extrusionDirection[2] !== 0 ? opening.profile.extrusionDepth : profileBounds.height

        openings.push({
          type: opening.type,
          polygon: clonePolygon2D(polygon),
          height,
          sill: sillHeight
        })
      }
    }

    return openings
  }

  private collectWallEdges(walls: ImportedWall[]): WallEdgeInfo[] {
    const edges: WallEdgeInfo[] = []

    for (const wall of walls) {
      const footprint = wall.profile?.footprint.outer
      if (!footprint || footprint.points.length < 2) continue

      const points = footprint.points
      const thickness = wall.thickness ?? this.estimatePolygonThickness(footprint) ?? DEFAULT_WALL_THICKNESS

      if (thickness < MINIMUM_THICKNESS) continue

      const wallEdges: WallEdgeInfo[] = []
      for (let i = 0; i < points.length; i++) {
        const start = points[i]
        const end = points[(i + 1) % points.length]
        const length = distVec2(start, end)
        if (length < 1e-3) continue
        wallEdges.push({
          start: copyVec2(start),
          end: copyVec2(end),
          direction: direction(start, end),
          length,
          thickness
        })
      }

      const pairedEdges = wallEdges.filter((edge, i) => {
        return wallEdges.some((other, j) => {
          if (j === i) return false
          const alignment = dotAbsVec2(edge.direction, other.direction)
          if (alignment < EDGE_ALIGNMENT_DOT_THRESHOLD) {
            return false
          }
          const distance = distanceToInfiniteLine(edge.start, { point: other.start, direction: other.direction })
          if (distance < EDGE_DISTANCE_TOLERANCE) {
            return false
          }
          return Math.abs(distance - thickness) < thickness * 0.2
        })
      })

      edges.push(...pairedEdges)
    }

    return edges
  }

  private computeAverageWallThickness(walls: ImportedWall[]): number {
    const values: number[] = []
    for (const wall of walls) {
      if (wall.thickness && Number.isFinite(wall.thickness)) {
        values.push(wall.thickness)
      } else {
        const footprint = wall.profile?.footprint.outer
        const estimate = footprint ? this.estimatePolygonThickness(footprint) : null
        if (estimate && Number.isFinite(estimate)) {
          values.push(estimate)
        }
      }
    }

    if (values.length === 0) {
      return DEFAULT_WALL_THICKNESS
    }

    const sum = values.reduce((acc, value) => acc + value, 0)
    return Math.max(sum / values.length, MINIMUM_THICKNESS)
  }

  private deriveEdgeThicknesses(shell: Polygon2D, wallEdges: WallEdgeInfo[], fallback: number): number[] {
    const thicknesses: number[] = []

    for (let i = 0; i < shell.points.length; i++) {
      const start = shell.points[i]
      const end = shell.points[(i + 1) % shell.points.length]
      const segmentLength = distVec2(start, end)
      if (segmentLength < 1e-3) {
        thicknesses.push(fallback)
        continue
      }

      const dir = direction(start, end)
      let bestThickness = fallback
      let bestDistance = Number.POSITIVE_INFINITY

      for (const edge of wallEdges) {
        const alignment = dotAbsVec2(dir, edge.direction)
        if (alignment < EDGE_ALIGNMENT_DOT_THRESHOLD) continue
        if (!this.segmentsOverlap(start, end, edge)) continue

        const distStart = distanceToLineSegment(start, edge)
        const distEnd = distanceToLineSegment(end, edge)
        const distance = Math.max(distStart, distEnd)
        if (distance < bestDistance) {
          bestDistance = distance
          bestThickness = edge.thickness
        }
      }

      thicknesses.push(Math.max(bestThickness, MINIMUM_THICKNESS))
    }

    return thicknesses
  }

  private offsetPolygonWithThickness(shell: Polygon2D, thicknesses: number[]): Polygon2D | null {
    if (thicknesses.length !== shell.points.length) {
      return null
    }

    const offsets = thicknesses.map(value => -Math.max(value, MINIMUM_THICKNESS))
    const inner = polygonEdgeOffset(shell, offsets)
    if (inner.points.length !== shell.points.length) {
      return null
    }
    return inner
  }

  private createPerimeterSegments(polygon: Polygon2D, thicknesses: number[]): ImportedPerimeterSegment[] {
    const segments: ImportedPerimeterSegment[] = []
    const pointCount = polygon.points.length

    for (let i = 0; i < pointCount; i++) {
      const start = polygon.points[i]
      const end = polygon.points[(i + 1) % pointCount]
      const thickness = thicknesses[i]

      segments.push({
        start: copyVec2(start),
        end: copyVec2(end),
        thickness: Number.isFinite(thickness) ? Math.max(thickness, MINIMUM_THICKNESS) : undefined,
        openings: []
      })
    }

    return segments
  }

  private assignOpeningsToSegments(
    outer: Polygon2D,
    segments: ImportedPerimeterSegment[],
    openings: OpeningProjection[],
    inner?: Polygon2D
  ): void {
    for (const opening of openings) {
      if (opening.polygon.points.every(p => !isPointInPolygon(p, outer))) continue
      if (inner && opening.polygon.points.every(p => isPointInPolygon(p, inner))) continue

      let bestSegmentIndex = -1
      let bestDistance = Number.POSITIVE_INFINITY
      let bestOffset = 0
      let bestWidth = 0

      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i]
        const line: LineSegment2D = { start: segment.start, end: segment.end }
        const distances = opening.polygon.points.map(p => distanceToLineSegment(p, line))
        const minDistance = Math.min(...distances)
        const maxDistance = Math.max(...distances)
        const thickness = segment.thickness ?? DEFAULT_WALL_THICKNESS
        if (minDistance > thickness || maxDistance > 3 * thickness) {
          continue
        }

        const segmentDir = direction(segment.start, segment.end)
        let minProjection = Number.POSITIVE_INFINITY
        let maxProjection = Number.NEGATIVE_INFINITY
        for (const point of opening.polygon.points) {
          const toPoint = subVec2(point, segment.start)
          const value = dotVec2(toPoint, segmentDir)
          minProjection = Math.min(minProjection, value)
          maxProjection = Math.max(maxProjection, value)
        }

        const segmentLength = distVec2(segment.start, segment.end)
        const openingStart = Math.min(segmentLength, Math.max(0, minProjection))
        const openingEnd = Math.max(0, Math.min(segmentLength, maxProjection))
        const width = Math.max(0, openingEnd - openingStart)

        if (width <= 1) {
          continue
        }

        if (maxDistance < bestDistance) {
          bestDistance = maxDistance
          bestSegmentIndex = i
          bestOffset = openingStart
          bestWidth = width
        }
      }

      if (bestSegmentIndex !== -1) {
        const segment = segments[bestSegmentIndex]
        segment.openings.push({
          type: opening.type,
          offset: bestOffset,
          width: bestWidth,
          height: opening.height,
          sill: opening.sill
        })
      }
    }
  }

  private extractHolesForShell(shell: Polygon2D, holes: Polygon2D[]): Polygon2D[] {
    const matched: Polygon2D[] = []

    for (let i = holes.length - 1; i >= 0; i--) {
      const hole = holes[i]
      const centroid = this.calculatePolygonCentroid(hole)
      if (!centroid) continue
      if (isPointInPolygon(centroid, shell)) {
        matched.push(clonePolygon2D(hole))
        holes.splice(i, 1)
      }
    }

    return matched
  }

  private calculatePolygonCentroid(polygon: Polygon2D): Vec2 | null {
    const points = polygon.points
    if (points.length < 3) {
      return null
    }

    let areaSum = 0
    let cx = 0
    let cy = 0

    for (let i = 0; i < points.length; i++) {
      const [x1, y1] = points[i]
      const [x2, y2] = points[(i + 1) % points.length]
      const cross = x1 * y2 - x2 * y1
      areaSum += cross
      cx += (x1 + x2) * cross
      cy += (y1 + y2) * cross
    }

    const area = areaSum / 2
    if (Math.abs(area) < 1e-6) {
      const avg = points.reduce((acc, point) => addVec2(acc, point), ZERO_VEC2)
      return scaleVec2(avg, 1 / points.length)
    }

    return newVec2(cx / (6 * area), cy / (6 * area))
  }

  private estimatePolygonThickness(polygon: Polygon2D): number | null {
    return Math.min(...minimumAreaBoundingBox(polygon).size)
  }

  private segmentsOverlap(segmentStart: Vec2, segmentEnd: Vec2, edge: WallEdgeInfo): boolean {
    const lineSegment: LineSegment2D = { start: segmentStart, end: segmentEnd }

    return (
      Math.min(
        Math.max(distanceToLineSegment(segmentStart, edge), distanceToLineSegment(segmentEnd, edge)),
        Math.max(distanceToLineSegment(edge.start, lineSegment), distanceToLineSegment(edge.end, lineSegment))
      ) < EDGE_DISTANCE_TOLERANCE
    )
  }

  private extractWalls(context: CachedModelContext, storey: IFC4.IfcBuildingStorey): ImportedWall[] {
    const walls: ImportedWall[] = []

    for (const relationRef of this.toArray(storey.ContainsElements)) {
      const relation = this.dereferenceLine(context, relationRef)
      if (!this.isRelContainedInSpatialStructure(relation)) continue

      for (const elementRef of this.toArray(relation.RelatedElements)) {
        const element = this.dereferenceLine(context, elementRef)
        if (!this.isWallElement(element)) continue

        const wall = element
        const placement = this.resolveObjectPlacement(context, wall)
        const profiles = this.extractExtrudedProfiles(context, wall, placement)
        if (profiles.length === 0) {
          const geometries = this.projectGeometry(context, wall)
          geometries.forEach(geometry => {
            const height = geometry.bounds.height
            geometry.polygons.forEach(polygon => {
              profiles.push({
                footprint: { outer: polygon, holes: [] },
                extrusionDepth: height,
                extrusionDirection: newVec3(0, 0, 1),
                localOutline: polygon,
                localToWorld: IDENTITY
              })
            })
          })
        }
        const openings = this.extractOpenings(context, wall)

        profiles.forEach(profile => {
          return walls.push({
            expressId: wall.expressID,
            guid: this.getStringValue(wall.GlobalId),
            name: this.getStringValue(wall.Name),
            placement,
            height: profile.extrusionDepth,
            thickness: this.estimateWallThickness(profile),
            profile,
            path: null,
            openings
          })
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
        if (this.enumEquals(element.PredefinedType, IFC4.IfcSlabTypeEnum.ROOF)) continue

        const slab = element
        const placement = this.resolveObjectPlacement(context, slab)
        const profiles = this.extractExtrudedProfiles(context, slab, placement)
        const openings = this.extractOpenings(context, slab)

        slabs.push(
          ...profiles.map(profile => ({
            expressId: slab.expressID,
            guid: this.getStringValue(slab.GlobalId),
            name: this.getStringValue(slab.Name),
            placement,
            profile,
            thickness: profile.extrusionDepth,
            openings
          }))
        )
      }
    }

    return slabs
  }

  private extractOpenings(context: CachedModelContext, element: IFC4.IfcElement): ImportedOpening[] {
    const openings: ImportedOpening[] = []

    for (const openingRelRef of this.toArray(element.HasOpenings)) {
      const relation = this.dereferenceLine(context, openingRelRef)
      if (!this.isRelVoidsElement(relation)) continue

      const openingElement = this.dereferenceLine(context, relation.RelatedOpeningElement)
      if (!this.isOpeningElement(openingElement)) continue

      const openingPlacement = this.resolveObjectPlacement(context, openingElement)
      const profiles = this.extractExtrudedProfiles(context, openingElement, openingPlacement)
      const type = this.detectOpeningType(context, openingElement)

      profiles.forEach(profile =>
        openings.push({
          expressId: openingElement.expressID,
          guid: this.getStringValue(openingElement.GlobalId),
          type,
          profile,
          placement: openingPlacement
        })
      )
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

  private extractExtrudedProfiles(
    context: CachedModelContext,
    product: IFC4.IfcProduct,
    productPlacement: Transform
  ): ExtrudedProfile[] {
    const representationRef = product.Representation
    const representation = this.dereferenceLine(context, representationRef)
    if (!representation) {
      return []
    }

    let fallbackShape: IFC4.IfcShapeRepresentation | null = null

    for (const shapeRef of this.toArray((representation as IFC4.IfcProductRepresentation).Representations)) {
      const shape = this.dereferenceLine(context, shapeRef)
      if (!this.isShapeRepresentation(shape)) continue

      const identifier = this.getStringValue(shape.RepresentationIdentifier)?.toLowerCase()
      if (identifier === 'body') {
        const profiles = this.extractExtrudedProfilesFromShape(context, shape, productPlacement)
        if (profiles.length > 0) {
          return profiles
        }
      }

      fallbackShape ??= shape
    }

    if (fallbackShape) {
      return this.extractExtrudedProfilesFromShape(context, fallbackShape, productPlacement)
    }

    return []
  }

  private extractExtrudedProfilesFromShape(
    context: CachedModelContext,
    shape: IFC4.IfcShapeRepresentation,
    productPlacement: Transform
  ): ExtrudedProfile[] {
    const profiles = []
    for (const itemRef of this.toArray(shape.Items)) {
      const item = this.dereferenceLine(context, itemRef)
      let profile: ExtrudedProfile | null = null
      if (this.isExtrudedAreaSolid(item) || this.isExtrudedAreaSolidTapered(item)) {
        profile = this.buildExtrudedProfile(context, item, productPlacement)
      } else if (this.isPolygonalFaceSet(item)) {
        profile = this.buildProfileFromPolygonFaceset(context, item, productPlacement)
      }
      if (profile) {
        profiles.push(profile)
      }
    }

    return profiles
  }

  private buildExtrudedProfile(
    context: CachedModelContext,
    solid: IFC4.IfcExtrudedAreaSolid,
    productPlacement: Transform
  ): ExtrudedProfile | null {
    const profilePolygon = this.extractProfilePolygon(context, solid.SweptArea)
    const endPolygon =
      'EndSweptArea' in solid ? this.extractProfilePolygon(context, solid.EndSweptArea) : profilePolygon
    if (!profilePolygon || !endPolygon) {
      return null
    }

    const positionMatrix = solid.Position ? this.resolveAxis2Placement3D(context, solid.Position) : IDENTITY
    const localToWorld = composeTransform(productPlacement, positionMatrix)

    const extrusionDirectionLocal = this.getDirection3(context, solid.ExtrudedDirection) ?? newVec3(0, 0, 1)
    const extrusionDirection = this.transformDirection(localToWorld, extrusionDirectionLocal)
    const extrusionDepth = Math.abs(this.getNumberValue(solid.Depth)) * context.unitScale

    let footprint: PolygonWithHoles2D
    if (extrusionDirection[2] === 0) {
      const footprintPolygons: Polygon2D[] = []
      const pointCount = profilePolygon.outer.points.length
      profilePolygon.outer.points.forEach((start, index) => {
        const end = endPolygon.outer.points[index]
        const nextStart = profilePolygon.outer.points[(index + 1) % pointCount]
        const nextEnd = endPolygon.outer.points[(index + 1) % pointCount]
        const start3 = transform(newVec3(start[0], start[1], 0), localToWorld)
        const nextStart3 = transform(newVec3(nextStart[0], nextStart[1], 0), localToWorld)
        const end3 = transform(
          scaleAddVec3(newVec3(end[0], end[1], 0), extrusionDirectionLocal, extrusionDepth),
          localToWorld
        )
        const nextEnd3 = transform(
          scaleAddVec3(newVec3(nextEnd[0], nextEnd[1], 0), extrusionDirectionLocal, extrusionDepth),
          localToWorld
        )
        footprintPolygons.push(
          ensurePolygonIsClockwise({
            points: [vec3To2(start3), vec3To2(end3), vec3To2(nextEnd3), vec3To2(nextStart3)]
          })
        )
      })
      footprint = { outer: unionPolygons(footprintPolygons)[0], holes: [] }
    } else {
      footprint = this.transformPolygonWithMatrix(localToWorld, profilePolygon)
    }

    return {
      footprint,
      localOutline: profilePolygon.outer,
      localToWorld,
      extrusionDirection,
      extrusionDepth
    }
  }

  private buildProfileFromPolygonFaceset(
    context: CachedModelContext,
    set: IFC4.IfcPolygonalFaceSet,
    productPlacement: Transform
  ): ExtrudedProfile | null {
    const coordinates = this.dereferenceLine(context, set.Coordinates)
    if (!this.isCartesianPointList3D(coordinates)) return null

    const points = coordinates.CoordList.map(l => this.getPoint3(context, l)).map(p => transform(p, productPlacement))
    const pnIndex = set.PnIndex?.map(i => i.value as number)

    const bounds = Bounds3D.fromPoints(points)

    if (bounds.isEmpty) return null

    const faces = this.extractFaces(context, set.Faces, points, pnIndex)
    const faces2D: Polygon2D[] = faces
      .map(f => ({ points: f.outer.points.map(p => vec3To2(p)) }))
      .filter(f => Math.abs(this.signedArea2(f.points)) > 1)
      .map(ensurePolygonIsClockwise)

    // TODO: Proper union with holes
    const union = unionPolygons(faces2D)

    if (union.length !== 1) return null

    const footprint = { outer: union[0], holes: [] }
    const height = bounds.max[2] - bounds.min[2]

    return {
      footprint,
      localOutline: union[0],
      localToWorld: IDENTITY,
      extrusionDirection: newVec3(0, 0, 1),
      extrusionDepth: height
    }
  }

  extractFaces(
    context: CachedModelContext,
    faceRefs: (IFC4.IfcIndexedPolygonalFace | Handle<IFC4.IfcIndexedPolygonalFace>)[],
    points: Vec3[],
    pnIndex: number[] | undefined
  ): PolygonWithHoles3D[] {
    const faces = faceRefs
      .map(f => this.dereferenceLine(context, f))
      .filter(f => this.isIndexedPolygonalFace(f) || this.isIndexedPolygonalFaceWithVoids(f))
    return faces.map(f => {
      let holes: Polygon3D[] = []
      if (f.type === IFCINDEXEDPOLYGONALFACEWITHVOIDS) {
        const withVoids = f as IFC4.IfcIndexedPolygonalFaceWithVoids
        holes = withVoids.InnerCoordIndices.map(hole => ({
          points: hole
            .map(i => i.value as number)
            .map(i => pnIndex?.[i - 1] ?? i)
            .map(i => points[i - 1])
        }))
      }
      return {
        outer: {
          points: f.CoordIndex.map(i => i.value as number)
            .map(i => pnIndex?.[i - 1] ?? i)
            .map(i => points[i - 1])
        },
        holes
      }
    })
  }

  private transformPolygonWithMatrix(matrix: Transform, polygon: PolygonWithHoles2D): PolygonWithHoles2D {
    return {
      outer: this.transformPolygon(matrix, polygon.outer),
      holes: polygon.holes.map(hole => this.transformPolygon(matrix, hole))
    }
  }

  private transformPolygon(matrix: Transform, polygon: Polygon2D): Polygon2D {
    const points = polygon.points.map(point => this.transformPoint(matrix, point))
    return { points }
  }

  private transformPoint(matrix: Transform, point: Vec2): Vec2 {
    const vector = newVec3(point[0], point[1], 0)
    const transformed = transform(vector, matrix)
    return newVec2(transformed[0], transformed[1])
  }

  private transformDirection(matrix: Transform, direction: Vec3): Vec3 {
    const result = newVec3(
      matrix[0] * direction[0] + matrix[4] * direction[1] + matrix[8] * direction[2],
      matrix[1] * direction[0] + matrix[5] * direction[1] + matrix[9] * direction[2],
      matrix[2] * direction[0] + matrix[6] * direction[1] + matrix[10] * direction[2]
    )
    return normVec3(result)
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

  private convertPolylineToPoints(context: CachedModelContext, polyline: IFC4.IfcPolyline): Vec2[] {
    const rawPoints: Vec2[] = []

    for (const pointRef of this.toArray(polyline.Points)) {
      const point = this.dereferenceLine(context, pointRef)
      if (!this.isCartesianPoint(point)) continue

      const coords = point.Coordinates
      const x = this.getNumberValue(coords[0]) * context.unitScale
      const y = this.getNumberValue(coords[1]) * context.unitScale
      rawPoints.push(newVec2(x, y))
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

    const points = [newVec2(-halfX, -halfY), newVec2(halfX, -halfY), newVec2(halfX, halfY), newVec2(-halfX, halfY)]

    if (profile.Position) {
      return {
        points: points.map(point => this.applyAxis2Placement2D(context, profile.Position as unknown, point))
      }
    }

    return { points }
  }

  private applyAxis2Placement2D(context: CachedModelContext, placementRef: unknown, point: Vec2): Vec2 {
    const placement = this.dereferenceLine(context, placementRef)
    if (!this.isAxis2Placement2D(placement)) {
      return copyVec2(point)
    }

    const origin3 = this.getPoint3(context, placement.Location)
    const origin = newVec2(origin3[0], origin3[1])

    let xDir = newVec2(1, 0)
    if (placement.RefDirection) {
      const refDir = this.dereferenceLine(context, placement.RefDirection)
      if (this.isDirection(refDir)) {
        const ratios = refDir.DirectionRatios
        xDir = newVec2(this.getNumberValue(ratios[0]), this.getNumberValue(ratios[1]))
      }
    }

    if (lenVec2(xDir) === 0) {
      xDir = newVec2(1, 0)
    } else {
      xDir = normVec2(xDir)
    }

    const yDir = newVec2(-xDir[1], xDir[0])

    return addVec2(origin, scaleAddVec2(scaleVec2(xDir, point[0]), yDir, point[1]))
  }

  private estimateWallThickness(profile: ExtrudedProfile): number | null {
    return Math.min(...minimumAreaBoundingBox(profile.footprint.outer).size)
  }

  private sanitizePolygonPoints(points: Vec2[]): Vec2[] {
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
      return process.cwd() + assetUrl
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
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
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
        if (this.isSiUnit(unitLine)) {
          if (this.enumEquals(unitLine.UnitType, IFC4.IfcUnitEnum.LENGTHUNIT)) {
            return this.computeSiPrefixScale(unitLine.Prefix, unitLine.Name)
          }
        } else if (this.isConversionBasedUnit(unitLine)) {
          if (this.enumEquals(unitLine.UnitType, IFC4.IfcUnitEnum.LENGTHUNIT)) {
            const conversionFactor = this.dereferenceLine(context, unitLine.ConversionFactor) as IFC4.IfcMeasureWithUnit
            const baseUnit = this.dereferenceLine(context, conversionFactor.UnitComponent)
            if (this.isSiUnit(baseUnit)) {
              return (
                this.getNumberValue(conversionFactor.ValueComponent) *
                this.computeSiPrefixScale(baseUnit.Prefix, baseUnit.Name)
              )
            }
          }
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

  private resolveObjectPlacement(context: CachedModelContext, product: IFC4.IfcProduct): Transform {
    const placementReference = product.ObjectPlacement ?? null
    if (placementReference == null) {
      return IDENTITY
    }

    return this.resolvePlacementRecursive(context, placementReference)
  }

  private resolvePlacementRecursive(context: CachedModelContext, reference: unknown): Transform {
    const placement = this.dereferenceLine(context, reference)
    if (!this.isLocalPlacement(placement)) {
      return IDENTITY
    }

    const relativeReference = placement.RelativePlacement
    const parentReference = placement.PlacementRelTo ?? null

    const relativeMatrix = this.resolveAxis2Placement3D(context, relativeReference)
    const parentMatrix = parentReference != null ? this.resolvePlacementRecursive(context, parentReference) : IDENTITY

    return composeTransform(parentMatrix, relativeMatrix)
  }

  private resolveAxis2Placement3D(context: CachedModelContext, reference: unknown): Transform {
    const placement = this.dereferenceLine(context, reference)
    if (!this.isAxis2Placement3D(placement)) {
      return IDENTITY
    }

    const location = this.getPoint3(context, placement.Location)
    const axis = this.getDirection3(context, placement.Axis) ?? newVec3(0, 0, 1)
    const refDirection = this.getDirection3(context, placement.RefDirection) ?? newVec3(1, 0, 0)

    const localX = normVec3(refDirection)
    const localZ = normVec3(axis)
    const localY = normVec3(crossVec3(localZ, localX))

    // prettier-ignore
    return transformFromValues(
      localX[0],    localX[1],    localX[2],    0, 
      localY[0],    localY[1],    localY[2],    0, 
      localZ[0],    localZ[1],    localZ[2],    0, 
      location[0],  location[1],  location[2],  1
    )
  }

  private getPoint3(context: CachedModelContext, reference: unknown): Vec3 {
    let coords: IFC4.IfcLengthMeasure[]
    if (Array.isArray(reference)) {
      coords = reference as IFC4.IfcLengthMeasure[]
    } else {
      const pointLine = this.dereferenceLine(context, reference)
      if (!this.isCartesianPoint(pointLine)) {
        return newVec3(0, 0, 0)
      }

      coords = pointLine.Coordinates
    }
    return newVec3(
      this.getNumberValue(coords[0]) * context.unitScale,
      this.getNumberValue(coords[1]) * context.unitScale,
      this.getNumberValue(coords[2] ?? 0) * context.unitScale
    )
  }

  private getDirection3(context: CachedModelContext, reference: unknown): Vec3 | null {
    const directionLine = this.dereferenceLine(context, reference)
    if (!this.isDirection(directionLine)) {
      return null
    }

    const ratios = directionLine.DirectionRatios
    return newVec3(this.getNumberValue(ratios[0]), this.getNumberValue(ratios[1]), this.getNumberValue(ratios[2] ?? 0))
  }

  private isRelContainedInSpatialStructure(
    value: IfcLineObject | null
  ): value is IFC4.IfcRelContainedInSpatialStructure {
    return value?.type === IFCRELCONTAINEDINSPATIALSTRUCTURE
  }

  private isRelVoidsElement(value: IfcLineObject | null): value is IFC4.IfcRelVoidsElement {
    return value?.type === IFCRELVOIDSELEMENT
  }

  private isRelFillsElement(value: IfcLineObject | null): value is IFC4.IfcRelFillsElement {
    return value?.type === IFCRELFILLSELEMENT
  }

  private isWallElement(value: IfcLineObject | null): value is IFC4.IfcWall {
    return value != null && (value.type === IFCWALL || value.type === IFCWALLSTANDARDCASE)
  }

  private isSlabElement(value: IfcLineObject | null): value is IFC4.IfcSlab {
    return value?.type === IFCSLAB
  }

  private isOpeningElement(value: IfcLineObject | null): value is IFC4.IfcOpeningElement {
    return value?.type === IFCOPENINGELEMENT
  }

  private isDoorElement(value: IfcLineObject | null): value is IFC4.IfcDoor {
    return value?.type === IFCDOOR
  }

  private isWindowElement(value: IfcLineObject | null): value is IFC4.IfcWindow {
    return value?.type === IFCWINDOW
  }

  private isShapeRepresentation(value: IfcLineObject | null): value is IFC4.IfcShapeRepresentation {
    return value?.type === IFCSHAPEREPRESENTATION
  }

  private isExtrudedAreaSolid(value: IfcLineObject | null): value is IFC4.IfcExtrudedAreaSolid {
    return value?.type === IFCEXTRUDEDAREASOLID
  }

  private isExtrudedAreaSolidTapered(value: IfcLineObject | null): value is IFC4.IfcExtrudedAreaSolidTapered {
    return value?.type === IFCEXTRUDEDAREASOLIDTAPERED
  }

  private isPolygonalFaceSet(value: IfcLineObject | null): value is IFC4.IfcPolygonalFaceSet {
    return value?.type === IFCPOLYGONALFACESET
  }

  private isCartesianPointList3D(value: IfcLineObject | null): value is IFC4.IfcCartesianPointList3D {
    return value?.type === IFCCARTESIANPOINTLIST3D
  }

  private isIndexedPolygonalFace(value: IfcLineObject | null): value is IFC4.IfcIndexedPolygonalFace {
    return value?.type === IFCINDEXEDPOLYGONALFACE
  }

  private isIndexedPolygonalFaceWithVoids(value: IfcLineObject | null): value is IFC4.IfcIndexedPolygonalFaceWithVoids {
    return value?.type === IFCINDEXEDPOLYGONALFACEWITHVOIDS
  }

  private isArbitraryClosedProfile(value: IfcLineObject | null): value is IFC4.IfcArbitraryClosedProfileDef {
    return value?.type === IFCARBITRARYCLOSEDPROFILEDEF
  }

  private isArbitraryProfileWithVoids(value: IfcLineObject | null): value is IFC4.IfcArbitraryProfileDefWithVoids {
    return value?.type === IFCARBITRARYPROFILEDEFWITHVOIDS
  }

  private isRectangleProfile(value: IfcLineObject | null): value is IFC4.IfcRectangleProfileDef {
    return value?.type === IFCRECTANGLEPROFILEDEF
  }

  private isPolyline(value: IfcLineObject | null): value is IFC4.IfcPolyline {
    return value?.type === IFCPOLYLINE
  }

  private toArray<T>(value: T | Iterable<T> | Vector<T> | null | undefined): T[] {
    if (value == null) {
      return []
    }

    if (Array.isArray(value)) {
      return value as T[]
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
    return value?.type === IFCLOCALPLACEMENT
  }

  private isAxis2Placement3D(value: IfcLineObject | null): value is IFC4.IfcAxis2Placement3D {
    return value?.type === IFCAXIS2PLACEMENT3D
  }

  private isAxis2Placement2D(value: IfcLineObject | null): value is IFC4.IfcAxis2Placement2D {
    return value?.type === IFCAXIS2PLACEMENT2D
  }

  private isCartesianPoint(value: IfcLineObject | null): value is IFC4.IfcCartesianPoint {
    return value != null && Array.isArray((value as IFC4.IfcCartesianPoint).Coordinates)
  }

  private isDirection(value: IfcLineObject | null): value is IFC4.IfcDirection {
    return value != null && Array.isArray((value as IFC4.IfcDirection).DirectionRatios)
  }

  private isSiUnit(value: IfcLineObject | null): value is IFC4.IfcSIUnit {
    return value?.type === IFCSIUNIT
  }

  private isConversionBasedUnit(value: IfcLineObject | null): value is IFC4.IfcConversionBasedUnit {
    return value?.type === IFCCONVERSIONBASEDUNIT
  }
}

function clonePolygon2D(polygon: Polygon2D): Polygon2D {
  return {
    points: polygon.points.map(point => copyVec2(point))
  }
}
