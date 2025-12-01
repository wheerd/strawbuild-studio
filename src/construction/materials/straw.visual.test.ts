import { vec3 } from 'gl-matrix'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { type ConfigActions, getConfigActions } from '@/construction/config'
import type { ConstructionElement } from '@/construction/elements'
import { WallConstructionArea } from '@/construction/geometry'
import type { StrawbaleMaterial } from '@/construction/materials/material'
import { strawbale } from '@/construction/materials/material'
import { getMaterialsActions } from '@/construction/materials/store'
import { aggregateResults } from '@/construction/results'
import { TAG_FULL_BALE, TAG_PARTIAL_BALE, TAG_STRAW_FLAKES, TAG_STRAW_STUFFED } from '@/construction/tags'

import { constructStraw } from './straw'

vi.mock('@/construction/config', () => ({
  getConfigActions: vi.fn()
}))
vi.mock('@/construction/materials/store', () => ({
  getMaterialsActions: vi.fn()
}))

const mockGetDefaultStrawMaterial = vi.fn()
const mockGetMaterialById = vi.fn()
vi.mocked(getConfigActions).mockReturnValue({
  getDefaultStrawMaterial: mockGetDefaultStrawMaterial
} as unknown as ConfigActions)
vi.mocked(getMaterialsActions).mockReturnValue({
  getMaterialById: mockGetMaterialById
} as any)

const defaultMaterial: StrawbaleMaterial = { ...strawbale }

beforeEach(() => {
  mockGetDefaultStrawMaterial.mockReturnValue(defaultMaterial.id)
  mockGetMaterialById.mockReturnValue(defaultMaterial)
})

const heights = [
  defaultMaterial.flakeSize - 1,
  defaultMaterial.flakeSize,
  defaultMaterial.baleHeight - defaultMaterial.tolerance - 1,
  defaultMaterial.baleHeight - defaultMaterial.tolerance,
  defaultMaterial.baleHeight + defaultMaterial.flakeSize - 1,
  defaultMaterial.baleHeight + defaultMaterial.flakeSize,
  defaultMaterial.baleMinLength,
  defaultMaterial.baleMaxLength,
  2 * defaultMaterial.baleHeight - defaultMaterial.tolerance - 1,
  2 * defaultMaterial.baleHeight - defaultMaterial.tolerance
].sort()

const lengths = [
  defaultMaterial.flakeSize - 1,
  defaultMaterial.flakeSize,
  defaultMaterial.baleHeight - defaultMaterial.tolerance - 1,
  defaultMaterial.baleHeight,
  defaultMaterial.baleHeight + defaultMaterial.tolerance + 1,
  defaultMaterial.baleMinLength - 1,
  defaultMaterial.baleMinLength,
  defaultMaterial.baleMaxLength,
  defaultMaterial.baleMaxLength + 1,
  defaultMaterial.baleMaxLength + defaultMaterial.baleMinLength - 1,
  2 * defaultMaterial.baleMaxLength - defaultMaterial.tolerance
].sort()

const scenarios = lengths.flatMap(length => heights.map(height => ({ length, height })))

const UPDATE_SNAPSHOTS = process.env.UPDATE_STRAW_VISUALS === '1' || process.env.UPDATE_VISUAL_SNAPSHOTS === '1'

const fixturesDir = path.resolve(process.cwd(), 'src', 'construction', 'materials', '__fixtures__', 'straw')

describe.each(scenarios)('constructStraw visual regression - $length x $height', ({ length, height }) => {
  it('matches the expected SVG snapshot', async () => {
    const position = vec3.fromValues(0, 0, 0)
    const size = vec3.fromValues(length, defaultMaterial.baleWidth, height)

    const results = [...constructStraw(new WallConstructionArea(position, size))]
    const { elements, errors } = aggregateResults(results)

    expect(errors, 'constructStraw should not emit errors for this scenario').toHaveLength(0)

    const svg = renderStrawLayoutSvg(elements as ConstructionElement[])

    const baselinePath = path.join(fixturesDir, `straw${length}x${height}.svg`)
    await fs.mkdir(path.dirname(baselinePath), { recursive: true })

    if (UPDATE_SNAPSHOTS) {
      await fs.writeFile(baselinePath, svg, 'utf-8')
      return
    }

    if (!existsSync(baselinePath)) {
      throw new Error(
        `Missing baseline SVG for scenario "${length}x${height}". Run with UPDATE_STRAW_VISUALS=1 to create it.`
      )
    }

    const expected = await fs.readFile(baselinePath, 'utf-8')

    if (expected !== svg) {
      const actualPath = baselinePath.replace(/\.svg$/, '.actual.svg')
      await fs.writeFile(actualPath, svg, 'utf-8')
      throw new Error(
        `Visual mismatch for scenario "${length}x${height}". Inspect ${path.basename(actualPath)} and update the baseline if the change is intentional.`
      )
    }
  })
})

function renderStrawLayoutSvg(elements: ConstructionElement[], options?: { padding?: number; strokeWidth?: number }) {
  if (elements.length === 0) {
    const size = 100
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" />`
  }

  const padding = options?.padding ?? 0
  const strokeWidth = options?.strokeWidth ?? 5
  const strokeColor = '#333333'

  const bounds = elements.filter(element => element.shape.base?.type === 'cuboid').map(element => element.bounds)

  const minX = Math.min(...bounds.map(b => b.min[0]))
  const maxX = Math.max(...bounds.map(b => b.max[0]))
  const minZ = Math.min(...bounds.map(b => b.min[2]))
  const maxZ = Math.max(...bounds.map(b => b.max[2]))

  const width = maxX - minX
  const height = maxZ - minZ

  const totalWidth = width + padding * 2
  const totalHeight = height + padding * 2

  const rectangles = elements
    .filter(element => element.shape.base?.type === 'cuboid')
    .map(element => ({
      minX: element.bounds.min[0],
      maxX: element.bounds.max[0],
      minZ: element.bounds.min[2],
      maxZ: element.bounds.max[2],
      type: element.tags?.[0]?.id
    }))
    .sort((a, b) => a.minX - b.minX || a.minZ - b.minZ)
    .map(rect => {
      const x = rect.minX - minX + padding
      const y = rect.minZ - minZ + padding
      const rectWidth = rect.maxX - rect.minX
      const rectHeight = rect.maxZ - rect.minZ

      const cx = (rect.minX + rect.maxX) / 2
      const cy = (rect.minZ + rect.maxZ) / 2

      const color =
        rect.type === TAG_FULL_BALE.id
          ? 'green'
          : rect.type === TAG_PARTIAL_BALE.id
            ? 'blue'
            : rect.type === TAG_STRAW_FLAKES.id
              ? 'orange'
              : rect.type === TAG_STRAW_STUFFED.id
                ? 'red'
                : 'white'

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

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '')
}
