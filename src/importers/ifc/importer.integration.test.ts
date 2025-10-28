import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, test } from 'vitest'

import { IfcImporter } from '@/importers/ifc'
import type {
  ExtrudedProfile,
  ImportedOpening,
  ImportedSlab,
  ImportedStorey,
  ImportedWall
} from '@/importers/ifc/types'
import type { Polygon2D, PolygonWithHoles2D } from '@/shared/geometry'

const ROUNDING_PRECISION = 4

describe('IFC importer integration', () => {
  test('parses strawbaler export sample', async () => {
    const importer = new IfcImporter()
    const filePath = path.resolve(process.cwd(), 'src', 'test', 'strawbaler-export.ifc')
    const file = await readFile(filePath)

    let model
    try {
      model = await importer.importFromArrayBuffer(file.buffer)
    } catch (error) {
      console.error('IFC import failed', error)
      throw error
    }

    const summary = summarizeModel(model)

    expect(summary).toMatchSnapshot()
  })
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
      boundary: summarizePolygonWithHoles(candidate.boundary)
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
