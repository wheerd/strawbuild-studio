import clipperWasmUrl from 'clipper2-wasm/dist/es/clipper2z.wasm?url'
import fs from 'node:fs/promises'
import path from 'node:path'
import { beforeAll, describe, expect, test, vi } from 'vitest'

import { IfcImporter } from '@/importers/ifc'
import type {
  ExtrudedProfile,
  ImportedOpening,
  ImportedPerimeterOpening,
  ImportedPerimeterSegment,
  ImportedSlab,
  ImportedStorey,
  ImportedWall
} from '@/importers/ifc/types'
import {
  type Polygon2D,
  type PolygonWithHoles2D,
  type Vec2,
  lenVec2,
  newVec2,
  scaleAddVec2,
  scaleVec2,
  subVec2
} from '@/shared/geometry'
import { ensureClipperModule } from '@/shared/geometry/clipperInstance'

const ROUNDING_PRECISION = 4

vi.unmock('@/shared/geometry/clipperInstance')

const testFiles = [
  {
    name: 'strawbaler export',
    fileName: 'strawbaler-export.ifc',
    key: 'export'
  },
  {
    name: 'IFC Builder',
    fileName: 'testsb.ifc',
    key: 'testsb'
  },
  {
    name: 'FZK House',
    fileName: 'AC20-FZK-Haus.ifc',
    key: 'fzk'
  },
  {
    name: 'wellness center',
    fileName: '2022020320211122Wellness center Sama.ifc',
    key: 'wellness'
  },
  {
    name: 'Digital Hub',
    fileName: 'DigitalHub_FM-ARC_v2.ifc',
    key: 'DigitalHub'
  },
  {
    name: 'Strawbale House',
    fileName: 'Strawbale House.ifc',
    key: 'strawbale-house'
  }
]

describe.runIf('IFCIMPORTER' in process.env)('IFC importer integration', () => {
  beforeAll(async () => {
    const clipperPath = resolveBundledAssetPath(clipperWasmUrl)
    const clipperBinary = await fs.readFile(clipperPath)
    await ensureClipperModule({ wasmBinary: clipperBinary })
  })

  test.each(testFiles)(
    'parses $name sample',
    async ({ key, fileName }) => {
      const importer = new IfcImporter()
      const filePath = path.resolve(process.cwd(), 'src', 'test', fileName)
      const file = await fs.readFile(filePath)

      let model
      try {
        model = await importer.importFromArrayBuffer(file.buffer)
      } catch (error) {
        console.error('IFC import failed', error)
        throw error
      }

      await generateDebugSvgs(model, key)

      const summary = summarizeModel(model)

      expect(summary).toMatchSnapshot()
    },
    15000
  )
})

function summarizeModel(model: { unitScale: number; storeys: ImportedStorey[] }): unknown {
  return {
    unitScale: round(model.unitScale),
    storeys: model.storeys.map(summarizeStorey)
  }
}

function summarizeStorey(storey: ImportedStorey): unknown {
  return {
    name: storey.name,
    elevation: round(storey.elevation),
    height: storey.height != null ? round(storey.height) : null,
    placement: Array.from(storey.placement),
    walls: storey.walls.map(summarizeWall),
    slabs: storey.slabs.map(summarizeSlab),
    perimeterCandidates: storey.perimeterCandidates.map(candidate => ({
      source: candidate.source,
      boundary: summarizePolygonWithHoles(candidate.boundary),
      segments: summarizeSegments(candidate.segments)
    }))
  }
}

function summarizeWall(wall: ImportedWall): unknown {
  return {
    name: wall.name,
    height: wall.height != null ? round(wall.height) : null,
    thickness: wall.thickness != null ? round(wall.thickness) : null,
    profile: summarizeProfile(wall.profile),
    placement: Array.from(wall.placement),
    openings: wall.openings.map(summarizeOpening)
  }
}

function summarizeSlab(slab: ImportedSlab): unknown {
  return {
    name: slab.name,
    thickness: slab.thickness != null ? round(slab.thickness) : null,
    placement: Array.from(slab.placement),
    profile: summarizeProfile(slab.profile)
  }
}

function summarizeOpening(opening: ImportedOpening): unknown {
  return {
    type: opening.type,
    profile: summarizeProfile(opening.profile),
    placement: Array.from(opening.placement)
  }
}

function summarizeSegments(segments: ImportedPerimeterSegment[]): any {
  return segments.map(s => ({ openings: s.openings, thickness: s.thickness }))
}

function summarizeProfile(profile: ExtrudedProfile | null): unknown {
  if (!profile) return null
  return {
    extrusionDepth: round(profile.extrusionDepth),
    localOutline: summarizePolygon(profile.localOutline),
    footprint: summarizePolygonWithHoles(profile.footprint),
    localToWorld: Array.from(profile.localToWorld),
    extrusionDirection: Array.from(profile.extrusionDirection)
  }
}

function summarizePolygon(polygon: Polygon2D): number[][] {
  return polygon.points.map(point => [round(point[0]), round(point[1])])
}

function summarizePolygonWithHoles(polygon: PolygonWithHoles2D): unknown {
  return {
    outer: summarizePolygon(polygon.outer),
    holes: polygon.holes.map(summarizePolygon)
  }
}

function round(value: number): number {
  const factor = 10 ** ROUNDING_PRECISION
  return Math.round(value * factor) / factor
}

async function generateDebugSvgs(model: { storeys: ImportedStorey[] }, prefix: string): Promise<void> {
  if (model.storeys.length === 0) return

  const outputDir = path.resolve(process.cwd(), 'src', 'importers', 'ifc', '__fixtures__', 'debug')
  await fs.mkdir(outputDir, { recursive: true })

  await Promise.all(
    model.storeys.map(async (storey, index) => {
      const svg = renderStoreyDebugSvg(storey)
      const slug = sanitizeFileComponent(storey.name ?? `storey-${index}`)
      const filename = path.join(outputDir, `${prefix}-${String(index).padStart(2, '0')}-${slug}.svg`)
      await fs.writeFile(filename, svg, 'utf-8')
    })
  )
}

function renderStoreyDebugSvg(storey: ImportedStorey): string {
  const polygons: { type: 'wall' | 'slab' | 'perimeter' | 'hole' | 'opening'; polygon: Polygon2D }[] = []
  const openingLines: { start: Vec2; end: Vec2; opening: ImportedPerimeterOpening }[] = []

  for (const wall of storey.walls) {
    const footprint = wall.profile?.footprint.outer
    if (footprint && footprint.points.length >= 3) {
      polygons.push({ type: 'wall', polygon: footprint })
    }
    for (const opening of wall.openings) {
      if (opening.profile && opening.profile.footprint.outer.points.length >= 3) {
        polygons.push({ type: 'opening', polygon: opening.profile.footprint.outer })
      }
    }
  }

  for (const slab of storey.slabs) {
    const profile = slab.profile?.footprint
    if (!profile) continue
    if (profile.outer.points.length >= 3) {
      polygons.push({ type: 'slab', polygon: profile.outer })
    }
    for (const hole of profile.holes) {
      if (hole.points.length >= 3) {
        polygons.push({ type: 'hole', polygon: hole })
      }
    }
  }

  for (const candidate of storey.perimeterCandidates) {
    if (candidate.boundary.outer.points.length >= 3) {
      polygons.push({ type: 'perimeter', polygon: candidate.boundary.outer })
    }
    for (const hole of candidate.boundary.holes) {
      if (hole.points.length >= 3) {
        polygons.push({ type: 'hole', polygon: hole })
      }
    }

    for (const segment of candidate.segments) {
      const start = newVec2(segment.start[0], segment.start[1])
      const end = newVec2(segment.end[0], segment.end[1])
      const segmentVector = subVec2(end, start)
      const length = lenVec2(segmentVector)
      if (length < 1e-3) continue
      const dir = scaleVec2(segmentVector, 1 / length)

      for (const opening of segment.openings) {
        if (opening.width <= 0) continue
        const openingStart = scaleAddVec2(start, dir, opening.offset)
        const openingEnd = scaleAddVec2(openingStart, dir, opening.width)
        openingLines.push({ start: openingStart, end: openingEnd, opening })
      }
    }
  }

  const allPoints: Vec2[] = []
  polygons.forEach(entry => {
    entry.polygon.points.forEach(point => allPoints.push(point))
  })
  openingLines.forEach(line => {
    allPoints.push(line.start)
    allPoints.push(line.end)
  })

  if (allPoints.length === 0) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200" />'
  }

  const xs = allPoints.map(point => point[0])
  const ys = allPoints.map(point => point[1])
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  const padding = 500
  const width = maxX - minX + padding * 2
  const height = maxY - minY + padding * 2

  const transformPoint = (point: Vec2): { x: number; y: number } => {
    const x = point[0] - minX + padding
    const y = maxY - point[1] + padding
    return { x, y }
  }

  const polygonElements = polygons.map(entry => {
    const pointsAttr = entry.polygon.points
      .map(point => {
        const { x, y } = transformPoint(point)
        return `${formatNumber(x)},${formatNumber(y)}`
      })
      .join(' ')

    const stroke =
      entry.type === 'perimeter'
        ? '#ff1744'
        : entry.type === 'hole'
          ? '#ff9100'
          : entry.type === 'opening'
            ? 'white'
            : '#2979ff'
    const fill =
      entry.type === 'slab'
        ? 'rgba(0,200,83,0.18)'
        : entry.type === 'hole'
          ? 'rgba(255,193,7,0.25)'
          : entry.type === 'opening'
            ? '#FFFFFF55'
            : 'none'
    const strokeWidth = entry.type === 'perimeter' ? 40 : 20

    return `<polygon points="${pointsAttr}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`
  })

  const openingElements = openingLines.map(({ start, end, opening }) => {
    const startPoint = transformPoint(start)
    const endPoint = transformPoint(end)
    const stroke = opening.type === 'door' ? '#d84315' : opening.type === 'window' ? '#00b0ff' : '#8e24aa'
    return `<line x1="${formatNumber(startPoint.x)}" y1="${formatNumber(startPoint.y)}" x2="${formatNumber(endPoint.x)}" y2="${formatNumber(endPoint.y)}" stroke="${stroke}" stroke-width="40" stroke-linecap="round" />`
  })

  const label = `<text x="${formatNumber(padding)}" y="${formatNumber(padding)}" fill="#222" font-size="200" font-family="monospace">${escapeHtml(storey.name ?? 'Storey')}</text>`

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${formatNumber(width)}" height="${formatNumber(height)}" viewBox="0 0 ${formatNumber(width)} ${formatNumber(height)}">`,
    label,
    ...polygonElements,
    ...openingElements,
    '</svg>'
  ].join('\n')
}

function sanitizeFileComponent(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'storey'
  )
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '')
}

function resolveBundledAssetPath(assetUrl: string): string {
  const normalized = assetUrl.startsWith('/') ? assetUrl.slice(1) : assetUrl
  return path.resolve(process.cwd(), normalized)
}
