/*
  floorplan-extract.ts — browser-friendly TypeScript module (DXF-first)

  Minimal, deterministic extraction for:
  - Exterior perimeter interior polygon
  - Per-segment perimeter wall thickness
  - Openings on the outer wall: position (offsetFromStart), width, sillHeight?, height
  - Storey height

  Designed to run fully client-side. No OCR.
  Dependencies (pass them in):
  - dxf-parser (browser build)
  - Your clipper2-wasm wrapper (union/offset, etc.)

  Notes
  -----
  • This is a starter skeleton with production-shaped function boundaries.
  • Fill in TODOs (layer heuristics, PDF path extraction, DWG→DXF pre-conversion choice).
  • Geometry is handled in *drawing units* → convert to mm using inferred scale.
  • For PDFs, add a sibling file (pdf-extract.ts) that produces the same Entity[] shape as DXF.
*/
import type {
  IDimensionEntity as DxfDimensionEntity,
  ITextEntity as DxfTextEntity,
  IArcEntity,
  IDxf,
  IEntity,
  IInsertEntity,
  ILineEntity,
  ILwpolylineEntity,
  IMtextEntity,
  IPoint,
  IPolylineEntity
} from 'dxf-parser'
import { vec2 } from 'gl-matrix'

import {
  type LineSegment2D,
  type Polygon2D,
  calculatePolygonArea,
  offsetPolygon,
  polygonIsClockwise,
  unionPolygons
} from '@/shared/geometry'

// ---------- Public Types matching your model shape ----------

export type OpeningType = 'window' | 'door' | 'unknown'

export interface OpeningOut {
  type: OpeningType
  /** mm along the interior face, measured from the start corner of the façade run */
  offsetFromStart: number
  /** clear opening width in mm */
  width: number
  /** clear opening height in mm */
  height?: number
  /** sill height above finished floor level in mm */
  sillHeight?: number
}

export interface WallOut {
  /** exterior wall thickness in mm (mean for this run) */
  thickness: number
  openings: OpeningOut[]
}

export interface CornerOut {
  insideX: number // mm
  insideY: number // mm
}

export interface PerimeterOut {
  corners: CornerOut[] // ordered loop of interior face vertices
  walls: WallOut[] // one per façade run (corners[i]→corners[i+1])
}

export interface StoreyOut {
  name: string // e.g., "EG"
  height: number // wall/ceiling height in mm
  perimeters: PerimeterOut[]
}

// ---------- Minimal DXF entity abstraction ----------

export type DxfLike = IDxf

export interface ExtractorDeps {
  // Lightweight spatial index (optional). If omitted, naive scans will be used.
  indexFactory?: <T>(
    items: T[],
    bbox: (t: T) => [number, number, number, number]
  ) => {
    search: (box: [number, number, number, number]) => T[]
  }
}

// ---------- Public API ----------

export interface ParseOptions {
  // How to detect wall layers. Provide your own function to accept/reject entity by layer/name.
  isWallLayer?: (layerName: string) => boolean
  isOpeningBlock?: (blockName: string, layer: string) => OpeningType | null // classify blocks
  defaultStoreyName?: string // default 'EG'
  defaultStoreyHeightMm?: number // e.g., 2650
  // Units override (if DXF header lacks INSUNITS or dims missing). mm by default.
  drawingUnitsPerMm?: number // e.g., 1 means drawing is already mm; else units/mm
  // If true, try dimensions first for scale; otherwise use header/override
  preferDimensionsForScale?: boolean
}

interface NormalizedParseOptions {
  isWallLayer: (layerName: string) => boolean
  isOpeningBlock: (blockName: string, layer: string) => OpeningType | null
  defaultStoreyName: string
  defaultStoreyHeightMm: number
  drawingUnitsPerMm?: number
  preferDimensionsForScale: boolean
}

export async function extractFromDxf(
  dxfContent: string | ArrayBuffer,
  deps: ExtractorDeps,
  opts: ParseOptions = {}
): Promise<StoreyOut[]> {
  const options = withDefaults(opts)
  const dxf = await parseDxf(dxfContent)
  const entities = dxf.entities ?? []

  const { wallCurves, hatchPolys, inserts, dimensions, texts, leaders } = collectEntities(entities, options)

  // 1) Scale (drawing units → mm)
  const scale = inferGlobalScale(dxf, dimensions, options) // units per mm (e.g., 1 if drawing already mm)

  // 2) Build exterior wall ribbon & perimeter faces
  const ribbon = buildWallRibbon(wallCurves, hatchPolys)
  if (!ribbon || ribbon.length === 0) {
    throw new Error('Could not derive wall ribbon / perimeter')
  }
  const outer = pickLargestPolygon(ribbon) // outside face
  // Estimate thickness per façade run later; for inside face, we’ll use an inward offset using local thickness

  // 3) Segment the outer polygon into façade runs
  const facadeRuns = polygonToRuns(outer)

  // 4) Estimate wall thickness per run (prefer DIMENSION spans between outlines -> TODO; here geometry-based)
  const thicknessByRun = estimateThicknessByRun(facadeRuns, wallCurves) // in drawing units
    .map(t => t / scale) // mm

  // 5) Construct interior polygon by inward offset of outer by per-run thickness
  const inside = offsetPolygonPiecewise(outer, facadeRuns, thicknessByRun)

  // 6) Detect openings on the outer wall
  const openingsByRun = detectOpeningsOnPerimeter(facadeRuns, inserts, dimensions, leaders, texts, deps, scale, options)

  // 7) Compose PerimeterOut
  const corners: CornerOut[] = inside.points.map(p => ({ insideX: p[0] / scale, insideY: p[1] / scale }))
  const walls: WallOut[] = facadeRuns.map((run, i) => ({
    thickness: Math.round(thicknessByRun[i]),
    openings: openingsByRun[i] ?? []
  }))

  // 8) Storey height (from notes or default)
  const inferredHeight = inferStoreyHeightFromText(texts) ?? options.defaultStoreyHeightMm

  const perimeter: PerimeterOut = { corners, walls }
  const storey: StoreyOut = {
    name: options.defaultStoreyName,
    height: inferredHeight,
    perimeters: [perimeter]
  }

  return [storey]
}

// ---------- DXF parsing (browser) ----------

async function parseDxf(dxfContent: string | ArrayBuffer): Promise<DxfLike> {
  // dxf-parser works with string input; ensure we pass text.
  const text = typeof dxfContent === 'string' ? dxfContent : new TextDecoder('utf-8').decode(dxfContent as ArrayBuffer)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { default: DxfParser } = await import('dxf-parser')
  const parser = new DxfParser()
  const dxf = parser.parseSync(text)
  if (!dxf) {
    throw new Error('Failed to parse DXF content')
  }
  return dxf
}

// ---------- Entity collection & filtering ----------

interface Collected {
  wallCurves: CurveEntity[] // lines/arcs/polylines likely forming walls
  hatchPolys: Polygon2D[] // closed paths from solid hatches (if any)
  inserts: InsertEntity[] // block refs (for doors/windows)
  dimensions: DimensionEntity[] // explicit dimensions
  texts: TextEntity[] // TEXT/MTEXT for notes & sizes
  leaders: LeaderEntity[] // LEADER/MLEADER for sill/head callouts
}

function collectEntities(entities: IEntity[], opts: NormalizedParseOptions): Collected {
  const wallCurves: CurveEntity[] = []
  const hatchPolys: Polygon2D[] = []
  const inserts: InsertEntity[] = []
  const dimensions: DimensionEntity[] = []
  const texts: TextEntity[] = []
  const leaders: LeaderEntity[] = []

  for (const entity of entities) {
    const layer = (entity.layer ?? '').toString()
    switch (entity.type) {
      case 'LINE':
      case 'LWPOLYLINE':
      case 'POLYLINE':
      case 'ARC': {
        if (!opts.isWallLayer(layer)) break
        {
          const curve = asCurve(entity)
          if (curve) {
            wallCurves.push(curve)
          }
        }
        break
      }
      case 'HATCH': {
        if (opts.isWallLayer(layer)) {
          const polys = hatchToPaths(entity)
          hatchPolys.push(...polys)
        }
        break
      }
      case 'INSERT': {
        inserts.push(asInsert(entity as IInsertEntity, opts))
        break
      }
      case 'DIMENSION': {
        dimensions.push(asDimension(entity as DxfDimensionEntity))
        break
      }
      case 'MTEXT': {
        texts.push(asText(entity as IMtextEntity))
        break
      }
      case 'TEXT': {
        texts.push(asText(entity as DxfTextEntity))
        break
      }
      case 'LEADER':
      case 'MLEADER': {
        leaders.push(asLeader(entity))
        break
      }
      default:
        break
    }
  }

  return { wallCurves, hatchPolys, inserts, dimensions, texts, leaders }
}

// ---------- Geometry primitives ----------

export type CurveEntity =
  | { kind: 'line'; p1: vec2; p2: vec2; layer?: string }
  | { kind: 'poly'; points: vec2[]; closed: boolean; layer?: string }
  | { kind: 'arc'; center: vec2; radius: number; startAngle: number; endAngle: number; layer?: string }

interface InsertEntity {
  name: string
  layer: string
  position: vec2
  rotation: number
  scaleX: number
  scaleY: number
  raw: IInsertEntity
  classify?: OpeningType | null
}
interface DimensionEntity {
  value: number | null // explicit value (mm after scaling later). null if unknown
  p1?: vec2
  p2?: vec2
  angle?: number
  text?: string
  raw: DxfDimensionEntity
}
interface TextEntity {
  text: string
  position: vec2
  rotation?: number
  raw: DxfTextEntity | IMtextEntity
}
interface LeaderEntity {
  points: vec2[]
  text?: string
  raw: unknown
}

function asCurve(entity: IEntity): CurveEntity | null {
  switch (entity.type) {
    case 'LINE': {
      const line = entity as ILineEntity
      if (!line.vertices || line.vertices.length < 2) return null
      return {
        kind: 'line',
        p1: toVec2(line.vertices[0]),
        p2: toVec2(line.vertices[1]),
        layer: entity.layer
      }
    }
    case 'LWPOLYLINE': {
      const poly = entity as ILwpolylineEntity
      if (!poly.vertices || poly.vertices.length === 0) return null
      return {
        kind: 'poly',
        points: poly.vertices.map(vertex => toVec2(vertex)),
        closed: !!poly.shape,
        layer: entity.layer
      }
    }
    case 'POLYLINE': {
      const poly = entity as IPolylineEntity
      if (!poly.vertices || poly.vertices.length === 0) return null
      return {
        kind: 'poly',
        points: poly.vertices.map(vertex => toVec2(vertex)),
        closed: !!poly.shape,
        layer: entity.layer
      }
    }
    case 'ARC': {
      const arc = entity as unknown as IArcEntity
      if (!arc.center || typeof arc.radius !== 'number') return null
      return {
        kind: 'arc',
        center: toVec2(arc.center),
        radius: arc.radius,
        startAngle: arc.startAngle ?? 0,
        endAngle: arc.endAngle ?? 0,
        layer: entity.layer
      }
    }
    default:
      return null
  }
}

function hatchToPaths(entity: unknown): Polygon2D[] {
  if (!entity || typeof entity !== 'object') return []
  const raw = entity as { boundaryPaths?: unknown[]; boundary?: unknown[] }
  const loops = raw.boundaryPaths ?? raw.boundary ?? []
  const polygons: Polygon2D[] = []

  for (const loop of loops) {
    const edges = (loop as { edges?: unknown[] }).edges ?? (loop as unknown[])
    const points: vec2[] = []
    for (const edge of edges) {
      const e = edge as {
        type?: string
        start?: [number, number]
        end?: [number, number]
        center?: [number, number]
        radius?: number
        startAngle?: number
        endAngle?: number
      }
      if (e.type === 'Line' && Array.isArray(e.start)) {
        points.push(vec2.fromValues(e.start[0] ?? 0, e.start[1] ?? 0))
      } else if (e.type === 'Arc' && e.center) {
        const segments = arcToPolyline(
          {
            center: vec2.fromValues(e.center[0] ?? 0, e.center[1] ?? 0),
            radius: e.radius ?? 0,
            startAngle: e.startAngle ?? 0,
            endAngle: e.endAngle ?? 0
          },
          (5 * Math.PI) / 180
        )
        if (segments.length > 1) {
          points.push(...segments.slice(0, -1))
        }
      }
    }
    if (points.length > 2) {
      polygons.push({ points: ensureClosedPoints(points) })
    }
  }

  return polygons
}

function asInsert(entity: IInsertEntity, opts: NormalizedParseOptions): InsertEntity {
  const name = (entity.name || '').toString()
  const layer = (entity.layer || '').toString()
  return {
    name,
    layer,
    position: toVec2(entity.position ?? (entity as unknown as { insert?: IPoint }).insert),
    rotation: entity.rotation ?? 0,
    scaleX: entity.xScale ?? 1,
    scaleY: entity.yScale ?? 1,
    raw: entity,
    classify: opts.isOpeningBlock(name, layer)
  }
}

function asDimension(entity: DxfDimensionEntity): DimensionEntity {
  const value = typeof entity.actualMeasurement === 'number' ? entity.actualMeasurement : null
  return {
    value,
    p1: entity.linearOrAngularPoint1 ? toVec2(entity.linearOrAngularPoint1) : undefined,
    p2: entity.linearOrAngularPoint2 ? toVec2(entity.linearOrAngularPoint2) : undefined,
    angle: entity.angle,
    text: entity.text,
    raw: entity
  }
}

function asText(entity: IMtextEntity | DxfTextEntity): TextEntity {
  const textContent = normaliseTextContent(entity.text ?? '')
  const position = 'position' in entity ? entity.position : entity.startPoint
  return {
    text: textContent,
    position: toVec2(position),
    rotation: entity.rotation ?? 0,
    raw: entity
  }
}

function asLeader(entity: unknown): LeaderEntity {
  if (!entity || typeof entity !== 'object') {
    return { points: [], text: undefined, raw: entity }
  }
  const raw = entity as { vertices?: unknown[]; points?: unknown[]; text?: unknown; mtext?: unknown }
  const rawPoints = raw.vertices ?? raw.points ?? []
  const points: vec2[] = []
  for (const point of rawPoints) {
    if (Array.isArray(point)) {
      points.push(vec2.fromValues((point[0] as number) ?? 0, (point[1] as number) ?? 0))
    } else if (point && typeof point === 'object') {
      const pObj = point as { x?: number; y?: number }
      points.push(vec2.fromValues(pObj.x ?? 0, pObj.y ?? 0))
    }
  }
  const text = raw.text ?? raw.mtext
  return { points, text: text?.toString(), raw }
}

// ---------- Scale inference ----------

function inferGlobalScale(dxf: DxfLike, dims: DimensionEntity[], opts: NormalizedParseOptions): number {
  // Base on user override or INSUNITS
  if (typeof opts.drawingUnitsPerMm === 'number') return opts.drawingUnitsPerMm
  const ins = dxf.header?.$INSUNITS // 4=inches, 6=meters, 1=mm, etc.
  if (ins === 1) return 1 // drawing is already mm
  if (ins === 4) return 25.4 // inch → mm
  if (ins === 2) return 10 // cm → mm
  if (ins === 6) return 1000 // m → mm

  if (opts.preferDimensionsForScale && dims.length >= 2) {
    // Heuristic: find two linear dimensions with definition points; compute scale so that measured (geom) matches text value
    // TODO: implement using def points; for now, fall back to 1
  }
  return 1 // default assume drawing mm
}

// ---------- Wall ribbon & perimeter ----------

function buildWallRibbon(curves: CurveEntity[], hatches: Polygon2D[]): Polygon2D[] {
  // Preferred: if hatches exist, union them → that’s the built wall mass
  if (hatches.length) {
    const U = unionPolygons(hatches)
    return U
  }

  console.log(curves, hatches)

  const ribbonFromPairs = buildRibbonFromParallelSegments(curves)
  console.log(ribbonFromPairs)
  if (ribbonFromPairs.length) {
    return unionPolygons(ribbonFromPairs)
  }

  // Fallback: thicken candidate wall centerlines a little and union (starter heuristic)
  const bands: Polygon2D[] = []
  const defaultHalf = 50 // drawing units; tweak if your drawings are in mm this is 50mm half-thickness
  for (const curve of curves) {
    const polyline = curveToPolylinePoints(curve)
    for (let i = 0; i < polyline.length - 1; i++) {
      const band = rectangleAroundSegment(polyline[i], polyline[i + 1], defaultHalf)
      if (band) {
        bands.push(band)
      }
    }
  }
  return unionPolygons(bands)
}

const MIN_SEGMENT_LENGTH = 200
const MIN_WALL_THICKNESS = 80
const MAX_WALL_THICKNESS = 1200
const ANGLE_TOLERANCE_RAD = (5 * Math.PI) / 180
const COS_PARALLEL_THRESHOLD = Math.cos(ANGLE_TOLERANCE_RAD)
const MAX_OFFSET_VARIATION_RATIO = 0.25
const MIN_OVERLAP_RATIO = 0.35

function buildRibbonFromParallelSegments(curves: CurveEntity[]): Polygon2D[] {
  const segments = curves.flatMap(curveToSegments)
  if (segments.length < 2) return []

  const polygons: Polygon2D[] = []

  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      const band = segmentPairToBand(segments[i], segments[j])
      if (band) {
        polygons.push(band)
      }
    }
  }

  return polygons
}

function segmentPairToBand(a: LineSegment2D, b: LineSegment2D): Polygon2D | null {
  const dirA = segmentDirection(a)
  const dirB = segmentDirection(b)
  if (!dirA || !dirB) return null

  const alignment = vec2.dot(dirA, dirB)
  if (Math.abs(alignment) < COS_PARALLEL_THRESHOLD) return null

  const sameOrientation = alignment >= 0
  const normal = createLeftNormal(dirA)
  const midpointA = segmentMidpoint(a)
  const midpointB = segmentMidpoint(b)
  const offsetSigned = vec2.dot(vec2.subtract(vec2.create(), midpointB, midpointA), normal)
  const thickness = Math.abs(offsetSigned)
  if (thickness < MIN_WALL_THICKNESS || thickness > MAX_WALL_THICKNESS) return null

  const distStart = Math.abs(signedDistanceToLine(b.start, a.start, dirA))
  const distEnd = Math.abs(signedDistanceToLine(b.end, a.start, dirA))
  const distVariation = Math.abs(distStart - distEnd)
  if (
    distVariation > thickness * MAX_OFFSET_VARIATION_RATIO ||
    distStart < MIN_WALL_THICKNESS * 0.5 ||
    distEnd < MIN_WALL_THICKNESS * 0.5
  ) {
    return null
  }

  const lenA = segmentLength(a)
  const lenB = segmentLength(b)
  if (lenA < MIN_SEGMENT_LENGTH || lenB < MIN_SEGMENT_LENGTH) return null

  const toStartB = vec2.subtract(vec2.create(), b.start, a.start)
  const toEndB = vec2.subtract(vec2.create(), b.end, a.start)
  const projStart = vec2.dot(toStartB, dirA)
  const projEnd = vec2.dot(toEndB, dirA)

  const rangeStart = Math.min(projStart, projEnd)
  const rangeEnd = Math.max(projStart, projEnd)
  const overlapStart = Math.max(0, rangeStart)
  const overlapEnd = Math.min(lenA, rangeEnd)
  const overlapLength = overlapEnd - overlapStart
  const minRequiredOverlap = Math.min(lenA, lenB) * MIN_OVERLAP_RATIO

  if (!Number.isFinite(overlapLength) || overlapLength < minRequiredOverlap) return null

  const aStartPoint = vec2.scaleAndAdd(vec2.create(), a.start, dirA, overlapStart)
  const aEndPoint = vec2.scaleAndAdd(vec2.create(), a.start, dirA, overlapEnd)

  const offsetVector = vec2.scale(vec2.create(), normal, offsetSigned)
  const bStartPoint = vec2.add(vec2.create(), aStartPoint, offsetVector)
  const bEndPoint = vec2.add(vec2.create(), aEndPoint, offsetVector)

  if (!sameOrientation) {
    const temp = vec2.clone(bStartPoint)
    vec2.copy(bStartPoint, bEndPoint)
    vec2.copy(bEndPoint, temp)
  }

  const points = ensureClosedPoints([aStartPoint, aEndPoint, bEndPoint, bStartPoint])
  return { points }
}

function pickLargestPolygon(polys: Polygon2D[]): Polygon2D {
  let best: Polygon2D | null = null
  let bestA = -Infinity
  for (const p of polys) {
    const a = Math.abs(calculatePolygonArea(p))
    if (a > bestA) {
      bestA = a
      best = p
    }
  }
  if (!best) throw new Error('No polygon found')
  // Ensure CCW for exterior
  return ensureCCW(best)
}

function polygonToRuns(poly: Polygon2D): LineSegment2D[] {
  const runs: LineSegment2D[] = []
  const points = poly.points
  if (points.length < 2) {
    return runs
  }
  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i]
    const end = points[i + 1]
    if (vec2.distance(start, end) < 1e-6) continue
    runs.push({ start, end })
  }
  return runs
}

function estimateThicknessByRun(runs: LineSegment2D[], _curves: CurveEntity[]): number[] {
  // Starter: constant default thickness if we can’t estimate yet.
  // TODO: implement parallel matching between outer/inner outlines for better per-run thickness.
  const DEFAULT_THICKNESS = 400 // drawing units (assume mm). Adjust or compute via dims.
  return runs.map(() => DEFAULT_THICKNESS)
}

function offsetPolygonPiecewise(outer: Polygon2D, runs: LineSegment2D[], tByRun: number[]): Polygon2D {
  // Simple approach: single inward offset by mean thickness
  const mean = tByRun.reduce((a, b) => a + b, 0) / (tByRun.length || 1)
  const inside = offsetPolygon(outer, -mean)
  return ensureClosedPolygon(inside)
}

// ---------- Openings detection ----------

function detectOpeningsOnPerimeter(
  runs: LineSegment2D[],
  inserts: InsertEntity[],
  _dims: DimensionEntity[],
  _leaders: LeaderEntity[],
  _texts: TextEntity[],
  _deps: ExtractorDeps,
  scale: number,
  _opts: NormalizedParseOptions
): OpeningOut[][] {
  // 1) From INSERT blocks classified as doors/windows
  const blkOpenings = detectFromBlocks(runs, inserts, scale)

  // 2) Widths from DIMENSIONs crossing gaps (TODO: associate to runs, detect perpendicular/aligned dims)
  // 3) Sill/height from LEADER/TEXT near block/gap (regex parse)

  // For now, return block-based only; stub others for incremental build.
  return blkOpenings
}

function detectFromBlocks(runs: LineSegment2D[], inserts: InsertEntity[], scale: number): OpeningOut[][] {
  const result: OpeningOut[][] = runs.map(() => [])

  for (const ins of inserts) {
    if (!ins.classify || ins.classify === 'unknown') continue

    // Project block position onto the closest run
    let bestI = -1
    let bestD = Infinity
    let bestT = 0
    for (let i = 0; i < runs.length; i++) {
      const { dist, t } = pointToSegmentDistanceT(ins.position, runs[i].start, runs[i].end)
      if (dist < bestD) {
        bestD = dist
        bestI = i
        bestT = t
      }
    }
    if (bestI < 0) continue

    // Initial width guess: 900 for door, 1200 for window; refine later via dims or block extents
    const widthGuess = ins.classify === 'door' ? 900 : 1200
    const opening: OpeningOut = {
      type: ins.classify,
      offsetFromStart: (bestT * segmentLength(runs[bestI])) / scale,
      width: widthGuess
    }
    result[bestI].push(opening)
  }
  return result
}

// ---------- Text parsing for heights (sill/head) ----------

const NUM = /(?:\d+[\.,]?\d*)/
const UNIT = /\s*(mm|cm|m|\'|\"|)/i

function parseLengthToMm(s: string): number | null {
  const m = s.match(NUM)
  if (!m) return null
  const raw = m[0].replace(',', '.')
  const val = parseFloat(raw)
  const unitMatch = s.match(UNIT)
  const unit = unitMatch?.[1]?.toLowerCase() ?? ''
  if (unit === 'm') return Math.round(val * 1000)
  if (unit === 'cm') return Math.round(val * 10)
  if (unit === "'") return Math.round(val * 304.8) // very rough if used alone
  if (unit === '"') return Math.round(val * 25.4)
  return Math.round(val) // assume mm
}

function inferStoreyHeightFromText(texts: TextEntity[]): number | null {
  // Look for patterns like: CEILING HEIGHT 2700, WALL HEIGHT 2.7m, FFL to CL 2.60
  const patterns = [
    /CEILING\s+HEIGHT\s*[:=]?\s*(.*)/i,
    /WALL\s+HEIGHT\s*[:=]?\s*(.*)/i,
    /FFL\s*to\s*(?:CL|ceiling)\s*[:=]?\s*(.*)/i
  ]
  for (const t of texts) {
    for (const re of patterns) {
      const m = t.text.match(re)
      if (m && m[1]) {
        const mm = parseLengthToMm(m[1])
        if (mm) return mm
      }
    }
  }
  return null
}

// ---------- Utilities ----------

function withDefaults(opts: ParseOptions): NormalizedParseOptions {
  return {
    isWallLayer: opts.isWallLayer ?? (layer => /WALL|EXT|ARCH|MUR|BAUTEIL/i.test(layer)),
    isOpeningBlock:
      opts.isOpeningBlock ??
      ((name, layer) => {
        if (/DOOR|TÜR|D\d/i.test(name) || /DOOR/i.test(layer)) return 'door'
        if (/WIN|WND|W\d|FENSTER/i.test(name) || /WINDOW/i.test(layer)) return 'window'
        return null
      }),
    defaultStoreyName: opts.defaultStoreyName ?? 'EG',
    defaultStoreyHeightMm: opts.defaultStoreyHeightMm ?? 2650,
    drawingUnitsPerMm: opts.drawingUnitsPerMm,
    preferDimensionsForScale: opts.preferDimensionsForScale ?? false
  }
}

function arcToPolyline(
  arc: { center: vec2; radius: number; startAngle: number; endAngle: number },
  maxAngle: number
): vec2[] {
  const { center, radius, startAngle, endAngle } = arc
  let a0 = startAngle
  let a1 = endAngle
  while (a1 < a0) a1 += Math.PI * 2
  const n = Math.max(2, Math.ceil((a1 - a0) / maxAngle))
  const pts: vec2[] = []
  for (let i = 0; i <= n; i++) {
    const a = a0 + (i / n) * (a1 - a0)
    pts.push(vec2.fromValues(center[0] + radius * Math.cos(a), center[1] + radius * Math.sin(a)))
  }
  return pts
}

function curveToPolylinePoints(curve: CurveEntity): vec2[] {
  switch (curve.kind) {
    case 'line':
      return [vec2.fromValues(curve.p1[0], curve.p1[1]), vec2.fromValues(curve.p2[0], curve.p2[1])]
    case 'poly': {
      const points = curve.points.map(point => vec2.fromValues(point[0], point[1]))
      return curve.closed ? ensureClosedPoints(points) : points
    }
    case 'arc':
      return arcToPolyline(curve, (5 * Math.PI) / 180)
    default:
      return []
  }
}

function ensureClosedPoints(points: vec2[]): vec2[] {
  const cloned = points.map(point => vec2.fromValues(point[0], point[1]))
  if (cloned.length === 0) return cloned
  const first = cloned[0]
  const last = cloned[cloned.length - 1]
  if (!vec2.equals(first, last)) {
    cloned.push(vec2.fromValues(first[0], first[1]))
  }
  return cloned
}

function curveToSegments(curve: CurveEntity): LineSegment2D[] {
  const polyline = curveToPolylinePoints(curve)
  const segments: LineSegment2D[] = []
  for (let i = 0; i < polyline.length - 1; i++) {
    const start = polyline[i]
    const end = polyline[i + 1]
    if (vec2.distance(start, end) < MIN_SEGMENT_LENGTH * 0.25) continue
    segments.push({
      start: vec2.clone(start),
      end: vec2.clone(end)
    })
  }
  return segments
}

function segmentDirection(segment: LineSegment2D): vec2 | null {
  const dir = vec2.subtract(vec2.create(), segment.end, segment.start)
  const len = vec2.length(dir)
  if (len < 1e-6) return null
  return vec2.scale(dir, dir, 1 / len)
}

function createLeftNormal(direction: vec2): vec2 {
  return vec2.fromValues(-direction[1], direction[0])
}

function segmentMidpoint(segment: LineSegment2D): vec2 {
  const midpoint = vec2.create()
  vec2.add(midpoint, segment.start, segment.end)
  vec2.scale(midpoint, midpoint, 0.5)
  return midpoint
}

function signedDistanceToLine(point: vec2, origin: vec2, direction: vec2): number {
  const toPoint = vec2.subtract(vec2.create(), point, origin)
  return direction[0] * toPoint[1] - direction[1] * toPoint[0]
}

function ensureClosedPolygon(polygon: Polygon2D): Polygon2D {
  if (polygon.points.length === 0) return polygon
  return { points: ensureClosedPoints(polygon.points) }
}

function ensureCCW(polygon: Polygon2D): Polygon2D {
  if (polygon.points.length < 3) return polygon
  if (polygonIsClockwise(polygon)) {
    const reversed = ensureClosedPoints(polygon.points.slice().reverse())
    return { points: reversed }
  }
  return polygon
}

function rectangleAroundSegment(start: vec2, end: vec2, halfWidth: number): Polygon2D | null {
  const direction = vec2.subtract(vec2.create(), end, start)
  const length = vec2.length(direction)
  if (length < 1e-6) return null
  vec2.scale(direction, direction, 1 / length)
  const normal = vec2.fromValues(-direction[1], direction[0])
  const p1 = vec2.scaleAndAdd(vec2.create(), start, normal, halfWidth)
  const p2 = vec2.scaleAndAdd(vec2.create(), end, normal, halfWidth)
  const p3 = vec2.scaleAndAdd(vec2.create(), end, normal, -halfWidth)
  const p4 = vec2.scaleAndAdd(vec2.create(), start, normal, -halfWidth)
  return { points: ensureClosedPoints([p1, p2, p3, p4]) }
}

function segmentLength(segment: LineSegment2D): number {
  return vec2.distance(segment.start, segment.end)
}

function pointToSegmentDistanceT(point: vec2, start: vec2, end: vec2): { dist: number; t: number } {
  const ab = vec2.subtract(vec2.create(), end, start)
  const ap = vec2.subtract(vec2.create(), point, start)
  const denom = vec2.dot(ab, ab)
  const rawT = denom > 0 ? vec2.dot(ap, ab) / denom : 0
  const t = Math.max(0, Math.min(1, rawT))
  const closest = vec2.scaleAndAdd(vec2.create(), start, ab, t)
  return { dist: vec2.distance(point, closest), t }
}

function toVec2(point?: IPoint | vec2 | { x?: number; y?: number } | null): vec2 {
  if (!point) return vec2.fromValues(0, 0)
  if (Array.isArray(point)) {
    return vec2.fromValues(point[0] ?? 0, point[1] ?? 0)
  }
  const obj = point as { x?: number; y?: number }
  return vec2.fromValues(obj.x ?? 0, obj.y ?? 0)
}

function normaliseTextContent(text: string): string {
  if (!text) return ''
  return text.replace(/\\P/gi, '\n').replace(/\r\n?/g, '\n').trim()
}

// ---------- Usage example (in your app) ----------
/*
import { extractFromDxf } from './floorplan-extract';
import { clipper2 } from 'your-clipper2-wrapper';

const file = input.files[0];
const storeys = await extractFromDxf(await file.text(), { clip: clipper2 }, {
  isWallLayer: (layer) => /WALL|EXT|ARCH/i.test(layer),
  isOpeningBlock: (name, layer) => /DOOR/i.test(name) ? 'door' : (/WIN/i.test(name) ? 'window' : null),
  defaultStoreyName: 'EG',
  defaultStoreyHeightMm: 2650
});

// storeys[0].perimeters[0].corners -> feed to Konva for preview
*/
