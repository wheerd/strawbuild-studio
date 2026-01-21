import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { describe, it, vi } from 'vitest'

import type { ConstructionElement, ConstructionGroup } from '@/construction/elements'
import { WallConstructionArea } from '@/construction/geometry'
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

const widths = [400, 600, 800, 1000, 1200, 1600, 2000]
const heights = [400, 600, 800, 2000]

const standardScenarios = widths.flatMap(width => heights.map(height => ({ width, height })))

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
  material: string | MaterialId
}

function renderPrefabLayoutSvg(
  elements: (ConstructionElement | ConstructionGroup)[],
  options?: { padding?: number; strokeWidth?: number }
) {
  if (elements.length === 0) {
    const size = 100
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" />`
  }

  const padding = options?.padding ?? 0
  const strokeWidth = options?.strokeWidth ?? 5
  const strokeColor = '#333333'

  const rawRectangles = elements.map((element): RectangleWithMaterial => {
    const x = element.transform[12]
    const z = element.transform[14]
    const material = 'material' in element ? element.material : 'unknown'

    return {
      minX: x,
      maxX: x + element.bounds.size[0],
      minZ: z,
      maxZ: z + element.bounds.size[2],
      width: element.bounds.size[0],
      height: element.bounds.size[2],
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
      const x = rect.minX - minX + padding
      const y = rect.minZ - minZ + padding
      const rectWidth = rect.maxX - rect.minX
      const rectHeight = rect.maxZ - rect.minZ

      const cx = (rect.minX + rect.maxX) / 2
      const cy = (rect.minZ + rect.maxZ) / 2

      const color = rect.material === 'material_standard' ? '#BBBBBB' : '#CCCCCC'

      return [
        `<rect x="${formatNumber(x)}" y="${formatNumber(-y - rectHeight)}"`,
        `width="${formatNumber(rectWidth)}" height="${formatNumber(rectHeight)}"`,
        `fill="${color}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />`,
        `<g transform="translate(${formatNumber(cx)} ${formatNumber(-cy)})">`,
        `<text x="0" y="0" style="text-anchor: middle; dominant-baseline: middle; font-size: 20">`,
        `${rectWidth}x${rectHeight}`,
        `</text></g>`
      ].join(' ')
    })

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${formatNumber(-totalHeight)} ${formatNumber(totalWidth)} ${formatNumber(totalHeight)}" width="${formatNumber(totalWidth)}" height="${formatNumber(totalHeight)}">`,
    ...rectangles,
    '</svg>'
  ].join('\n')
}

describe.each(standardScenarios)('Prefab Modules visual regression - $width x $height', ({ width, height }) => {
  it('matches the expected SVG snapshot', async () => {
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
  layers: {
    insideThickness: 0,
    insideLayers: [],
    outsideThickness: 0,
    outsideLayers: []
  }
}

const equalWidthsScenarios = widths.flatMap(width => heights.map(height => ({ width, height })))

describe.each(equalWidthsScenarios)(
  'Prefab Modules equal widths visual regression - $width x $height',
  ({ width, height }) => {
    it('matches the expected SVG snapshot', async () => {
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
  }
)

const lintelWidths = [850, 1000, 1200, 1600, 2000]
const lintelHeights = [400, 600, 800, 1000, 1200]
const lintelScenarios = lintelWidths.flatMap(width => lintelHeights.map(height => ({ width, height })))

describe.each(lintelScenarios)('Prefab Modules lintel visual regression - $width x $height', ({ width, height }) => {
  it('matches the expected SVG snapshot', async () => {
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

const sillScenarios = widths.flatMap(width => heights.map(height => ({ width, height })))

describe.each(sillScenarios)('Prefab Modules sill visual regression - $width x $height', ({ width, height }) => {
  it('matches the expected SVG snapshot', async () => {
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
