import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { describe, it, vi } from 'vitest'

import type { ConstructionElement, ConstructionGroup } from '@/construction/elements'
import { WallConstructionArea, transformBounds } from '@/construction/geometry'
import type { MaterialId, PrefabMaterial } from '@/construction/materials/material'
import { getMaterialsActions } from '@/construction/materials/store'
import { aggregateResults } from '@/construction/results'
import type { PrefabModulesWallConfig } from '@/construction/walls'
import { newVec3 } from '@/shared/geometry'

import { PrefabModulesWallAssembly } from './prefab-modules'

class TestPrefabModulesWallAssembly extends PrefabModulesWallAssembly {
  public moduleWallArea(
    area: WallConstructionArea,
    _startsWithStand = false,
    _endsWithStand = false,
    startAtEnd = false
  ) {
    return super.moduleWallArea(area, false, false, startAtEnd)
  }

  public moduleOpeningSubWallArea(area: WallConstructionArea, type: 'lintel' | 'sill') {
    return super.moduleOpeningSubWallArea(area, type)
  }
}

vi.mock('@/construction/materials/store', () => ({
  getMaterialsActions: vi.fn()
}))

const mockGetMaterialById = vi.fn()
vi.mocked(getMaterialsActions).mockReturnValue({
  getMaterialById: mockGetMaterialById
} as any)

const standardMaterial: PrefabMaterial = {
  id: 'material_standard' as any,
  type: 'prefab',
  name: 'Standard Module',
  color: '#BBBBBB',
  minHeight: 400,
  maxHeight: 3000,
  minThickness: 300,
  maxThickness: 400,
  minWidth: 400,
  maxWidth: 850,
  isFlipped: false
}

const fallbackMaterial: PrefabMaterial = {
  id: 'material_fallback' as any,
  type: 'prefab',
  name: 'Fallback Module',
  color: '#FF8888',
  minHeight: 119,
  maxHeight: 532,
  minThickness: 300,
  maxThickness: 400,
  minWidth: 400,
  maxWidth: 6000,
  isFlipped: true
}

const lintelMaterial: PrefabMaterial = {
  id: 'material_lintel' as any,
  type: 'prefab',
  name: 'Lintel Module',
  color: '#BBFFFF',
  minHeight: 400,
  maxHeight: 850,
  minThickness: 300,
  maxThickness: 400,
  minWidth: 850,
  maxWidth: 3000,
  isFlipped: true
}

const inclinedMaterial: PrefabMaterial = {
  id: 'material_inclined' as any,
  type: 'prefab',
  name: 'Inclined Module',
  color: '#FFFFBB',
  minHeight: 200,
  maxHeight: 3000,
  minThickness: 300,
  maxThickness: 400,
  minWidth: 400,
  maxWidth: 800,
  isFlipped: false,
  sloped: {
    minAngleDegrees: 1,
    maxAngleDegrees: 50
  }
}

const sillMaterial: PrefabMaterial = {
  id: 'material_sill' as any,
  type: 'prefab',
  name: 'Sill Module',
  color: '#BBBBFF',
  minHeight: 400,
  maxHeight: 850,
  minThickness: 300,
  maxThickness: 400,
  minWidth: 850,
  maxWidth: 3000,
  isFlipped: true
}

mockGetMaterialById.mockImplementation((id: string) => {
  if (id === 'material_standard') return standardMaterial
  if (id === 'material_fallback') return fallbackMaterial
  if (id === 'material_lintel') return lintelMaterial
  if (id === 'material_inclined') return inclinedMaterial
  if (id === 'material_sill') return sillMaterial
  return undefined
})

const UPDATE_SNAPSHOTS = process.env.UPDATE_PREFAB_VISUALS === '1' || process.env.UPDATE_VISUAL_SNAPSHOTS === '1'

const fixturesDir = path.resolve(
  process.cwd(),
  'src',
  'construction',
  'walls',
  'modules',
  '__fixtures__',
  'prefab-modules'
)

const widths = [100, 300, 400, 800, 850, 900, 1500, 1700, 1800, 3000, 3100]
const heights = [100, 300, 400, 800, 850, 900, 2000, 3000, 3500]
const sillHeights = [100, 300, 400, 800, 850, 900, 1000]
const lintelHeights = [100]

const standardScenarios = widths.flatMap(width => heights.map(height => ({ width, height })))

const RUN_PREFAB_VISUAL_TESTS = process.env.RUN_PREFAB_VISUAL_TESTS === '1'

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '')
}

interface RectangleWithMaterial {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
  width: number
  height: number
  material: MaterialId
}

function renderPrefabLayoutSvg(
  elements: (ConstructionElement | ConstructionGroup)[],
  options?: { padding?: number; strokeWidth?: number }
) {
  if (elements.length === 0) {
    const size = 100
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" />`
  }

  const strokeWidth = options?.strokeWidth ?? 5
  const strokeColor = '#333333'

  const rawRectangles = elements.map((element): RectangleWithMaterial => {
    const material = 'material' in element ? element.material : ('unknown' as MaterialId)
    const transformedBounds = transformBounds(element.bounds, element.transform)

    return {
      minX: transformedBounds.min[0],
      maxX: transformedBounds.max[0],
      minZ: transformedBounds.min[2],
      maxZ: transformedBounds.max[2],
      width: transformedBounds.size[0],
      height: transformedBounds.size[2],
      material
    }
  })

  const minX = Math.min(...rawRectangles.map(r => r.minX))
  const minZ = Math.min(...rawRectangles.map(r => r.minZ))
  const totalWidth = Math.max(...rawRectangles.map(r => r.maxX)) - minX
  const totalHeight = Math.max(...rawRectangles.map(r => r.maxZ)) - minZ

  const rectangles = rawRectangles
    .sort((a, b) => a.minX - b.minX || a.minZ - b.minZ)
    .map(rect => {
      const x = rect.minX - minX
      const y = rect.minZ - minZ

      const cx = x + rect.width / 2
      const cy = y + rect.height / 2

      const colorMap: Record<string, string> = {
        material_standard: '#BBBBBB',
        material_fallback: '#FF8888',
        material_lintel: '#BBFFFF',
        material_inclined: '#FFFFBB',
        material_sill: '#BBBBFF'
      }
      const materialKey = typeof rect.material === 'string' ? rect.material : 'unknown'
      const color = colorMap[materialKey] || '#CCCCCC'

      return [
        `<rect x="${formatNumber(x)}" y="${formatNumber(-y - rect.height)}"`,
        `width="${formatNumber(rect.width)}" height="${formatNumber(rect.height)}"`,
        `fill="${color}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />`,
        `<g transform="translate(${formatNumber(cx)} ${formatNumber(-cy)})">`,
        `<text x="0" y="0" style="text-anchor: middle; dominant-baseline: middle; font-size: 20">`,
        `${rect.width}x${rect.height}`,
        `</text></g>`
      ].join(' ')
    })

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${formatNumber(-totalHeight)} ${formatNumber(totalWidth)} ${formatNumber(totalHeight)}" width="${formatNumber(totalWidth)}" height="${formatNumber(totalHeight)}">`,
    ...rectangles,
    '</svg>'
  ].join('\n')
}

describe.runIf(RUN_PREFAB_VISUAL_TESTS)('Prefab Modules visual regression', () => {
  it.each(standardScenarios)('$width x $height', async ({ width, height }) => {
    const config: PrefabModulesWallConfig = {
      type: 'prefab-modules',
      defaultMaterial: 'material_standard' as MaterialId,
      fallbackMaterial: 'material_fallback' as MaterialId,
      inclinedMaterial: 'material_inclined' as MaterialId,
      lintelMaterial: 'material_lintel' as MaterialId,
      sillMaterial: 'material_sill' as MaterialId,
      maxWidth: 850,
      targetWidth: 600,
      preferEqualWidths: false,
      tallReinforceThreshold: 3000,
      tallReinforceThickness: 15,
      tallReinforceStagger: 400,
      tallReinforceMaterial: 'material_reinforce' as MaterialId,
      layers: {
        insideThickness: 0,
        insideLayers: [],
        outsideThickness: 0,
        outsideLayers: []
      }
    }

    const assembly = new TestPrefabModulesWallAssembly(config)

    const position = newVec3(0, 0, 0)
    const size = newVec3(width, 360, height)
    const area = new WallConstructionArea(position, size)

    const results = Array.from(assembly.moduleWallArea(area))
    const { elements } = aggregateResults(results)

    const svg = renderPrefabLayoutSvg(elements)

    expect(svg).toBeTruthy()
    expect(svg).toMatch(/<svg\s/)

    const baselinePath = path.join(fixturesDir, `prefab${width}x${height}.svg`)
    await fs.mkdir(path.dirname(baselinePath), { recursive: true })

    if (UPDATE_SNAPSHOTS) {
      await fs.writeFile(baselinePath, svg, 'utf-8')
      return
    }

    if (!existsSync(baselinePath)) {
      throw new Error(
        `Missing baseline SVG for scenario "${width}x${height}". Run with UPDATE_PREFAB_VISUALS=1 to create it.`
      )
    }

    const expected = await fs.readFile(baselinePath, 'utf-8')

    if (expected !== svg) {
      const actualPath = baselinePath.replace(/\.svg$/, '.actual.svg')
      await fs.writeFile(actualPath, svg, 'utf-8')
      throw new Error(
        `Visual mismatch for scenario "${width}x${height}". Inspect ${path.basename(actualPath)} and update the baseline if the change is intentional.`
      )
    }
  })
})

const equalWidthsConfig: PrefabModulesWallConfig = {
  type: 'prefab-modules',
  defaultMaterial: 'material_standard' as MaterialId,
  fallbackMaterial: 'material_fallback' as MaterialId,
  inclinedMaterial: 'material_inclined' as MaterialId,
  lintelMaterial: 'material_lintel' as MaterialId,
  sillMaterial: 'material_sill' as MaterialId,
  maxWidth: 800,
  targetWidth: 550,
  preferEqualWidths: true,
  tallReinforceThreshold: 3000,
  tallReinforceThickness: 15,
  tallReinforceStagger: 400,
  tallReinforceMaterial: 'material_reinforce' as MaterialId,
  layers: {
    insideThickness: 0,
    insideLayers: [],
    outsideThickness: 0,
    outsideLayers: []
  }
}

const equalWidthsScenarios = widths.flatMap(width => heights.map(height => ({ width, height })))

describe.runIf(RUN_PREFAB_VISUAL_TESTS)('Prefab Modules equal widths visual regression', () => {
  it.each(equalWidthsScenarios)('$width x $height', async ({ width, height }) => {
    const assembly = new TestPrefabModulesWallAssembly(equalWidthsConfig)

    const position = newVec3(0, 0, 0)
    const size = newVec3(width, 360, height)
    const area = new WallConstructionArea(position, size)

    const results = Array.from(assembly.moduleWallArea(area))
    const { elements } = aggregateResults(results)

    const svg = renderPrefabLayoutSvg(elements)

    expect(svg).toBeTruthy()
    expect(svg).toMatch(/<svg\s/)

    const baselinePath = path.join(fixturesDir, `prefab-equal-${width}x${height}.svg`)
    await fs.mkdir(path.dirname(baselinePath), { recursive: true })

    if (UPDATE_SNAPSHOTS) {
      await fs.writeFile(baselinePath, svg, 'utf-8')
      return
    }

    if (!existsSync(baselinePath)) {
      throw new Error(
        `Missing baseline SVG for scenario "equal-${width}x${height}". Run with UPDATE_PREFAB_VISUALS=1 to create it.`
      )
    }

    const expected = await fs.readFile(baselinePath, 'utf-8')

    if (expected !== svg) {
      const actualPath = baselinePath.replace(/\.svg$/, '.actual.svg')
      await fs.writeFile(actualPath, svg, 'utf-8')
      throw new Error(
        `Visual mismatch for scenario "equal-${width}x${height}". Inspect ${path.basename(actualPath)} and update the baseline if the change is intentional.`
      )
    }
  })
})

// Lintel specific widths: include 850 (min), 1000, 1200, 1600, 2000 (max), transitions
const lintelWidths = [850, 1000, 1200, 1600, 2000]
const lintelScenarios = lintelWidths.flatMap(width => lintelHeights.map(height => ({ width, height })))

describe.runIf(RUN_PREFAB_VISUAL_TESTS)('Prefab Modules lintel visual regression', () => {
  it.each(lintelScenarios)('$width x $height', async ({ width, height }) => {
    const config: PrefabModulesWallConfig = {
      type: 'prefab-modules',
      defaultMaterial: 'material_standard' as MaterialId,
      fallbackMaterial: 'material_fallback' as MaterialId,
      inclinedMaterial: 'material_inclined' as MaterialId,
      lintelMaterial: 'material_lintel' as MaterialId,
      sillMaterial: 'material_sill' as MaterialId,
      maxWidth: 850,
      targetWidth: 600,
      preferEqualWidths: false,
      tallReinforceThreshold: 3000,
      tallReinforceThickness: 15,
      tallReinforceStagger: 400,
      tallReinforceMaterial: 'material_reinforce' as MaterialId,
      layers: {
        insideThickness: 0,
        insideLayers: [],
        outsideThickness: 0,
        outsideLayers: []
      }
    }

    const assembly = new TestPrefabModulesWallAssembly(config)

    const position = newVec3(0, 0, 0)
    const size = newVec3(width, 360, height)
    const area = new WallConstructionArea(position, size)

    const results = Array.from(assembly.moduleOpeningSubWallArea(area, 'lintel'))
    const { elements } = aggregateResults(results)

    const svg = renderPrefabLayoutSvg(elements)

    expect(svg).toBeTruthy()
    expect(svg).toMatch(/<svg\s/)

    const baselinePath = path.join(fixturesDir, `prefab-lintel${width}x${height}.svg`)
    await fs.mkdir(path.dirname(baselinePath), { recursive: true })

    if (UPDATE_SNAPSHOTS) {
      await fs.writeFile(baselinePath, svg, 'utf-8')
      return
    }

    if (!existsSync(baselinePath)) {
      throw new Error(
        `Missing baseline SVG for scenario "lintel${width}x${height}". Run with UPDATE_PREFAB_VISUALS=1 to create it.`
      )
    }

    const expected = await fs.readFile(baselinePath, 'utf-8')

    if (expected !== svg) {
      const actualPath = baselinePath.replace(/\.svg$/, '.actual.svg')
      await fs.writeFile(actualPath, svg, 'utf-8')
      throw new Error(
        `Visual mismatch for scenario "lintel${width}x${height}". Inspect ${path.basename(actualPath)} and update the baseline if the change is intentional.`
      )
    }
  })
})

const sillScenarios = widths.flatMap(width => sillHeights.map(height => ({ width, height })))

describe.runIf(RUN_PREFAB_VISUAL_TESTS)('Prefab Modules sill visual regression', () => {
  it.each(sillScenarios)('$width x $height', async ({ width, height }) => {
    const config: PrefabModulesWallConfig = {
      type: 'prefab-modules',
      defaultMaterial: 'material_standard' as MaterialId,
      fallbackMaterial: 'material_fallback' as MaterialId,
      inclinedMaterial: 'material_inclined' as MaterialId,
      lintelMaterial: 'material_lintel' as MaterialId,
      sillMaterial: 'material_sill' as MaterialId,
      maxWidth: 850,
      targetWidth: 600,
      preferEqualWidths: false,
      tallReinforceThreshold: 3000,
      tallReinforceThickness: 15,
      tallReinforceStagger: 400,
      tallReinforceMaterial: 'material_reinforce' as MaterialId,
      layers: {
        insideThickness: 0,
        insideLayers: [],
        outsideThickness: 0,
        outsideLayers: []
      }
    }

    const assembly = new TestPrefabModulesWallAssembly(config)

    const position = newVec3(0, 0, 0)
    const size = newVec3(width, 360, height)
    const area = new WallConstructionArea(position, size)

    const results = Array.from(assembly.moduleOpeningSubWallArea(area, 'sill'))
    const { elements } = aggregateResults(results)

    const svg = renderPrefabLayoutSvg(elements)

    expect(svg).toBeTruthy()
    expect(svg).toMatch(/<svg\s/)

    const baselinePath = path.join(fixturesDir, `prefab-sill${width}x${height}.svg`)
    await fs.mkdir(path.dirname(baselinePath), { recursive: true })

    if (UPDATE_SNAPSHOTS) {
      await fs.writeFile(baselinePath, svg, 'utf-8')
      return
    }

    if (!existsSync(baselinePath)) {
      throw new Error(
        `Missing baseline SVG for scenario "sill${width}x${height}". Run with UPDATE_PREFAB_VISUALS=1 to create it.`
      )
    }

    const expected = await fs.readFile(baselinePath, 'utf-8')

    if (expected !== svg) {
      const actualPath = baselinePath.replace(/\.svg$/, '.actual.svg')
      await fs.writeFile(actualPath, svg, 'utf-8')
      throw new Error(
        `Visual mismatch for scenario "sill${width}x${height}". Inspect ${path.basename(actualPath)} and update the baseline if the change is intentional.`
      )
    }
  })
})
