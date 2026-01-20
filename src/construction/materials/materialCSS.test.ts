import { describe, expect, it } from 'vitest'

import { roughWood, strawbale } from './material'
import { generateMaterialCSS, getMaterialCSSString } from './materialCSS'

describe('Material CSS Generation', () => {
  it('generates correct CSS for materials', () => {
    const materials = [strawbale, roughWood]
    const css = generateMaterialCSS(materials)

    expect(css).toContain('Construction Material Styles')
    expect(css).toContain(`.${strawbale.id} .apply-material`)
    expect(css).toContain(`fill: ${strawbale.color}`)
    expect(css).toContain(`.${roughWood.id} .apply-material`)
    expect(css).toContain(`fill: ${roughWood.color}`)
    expect(css).toContain('stroke: var(--color-border-contrast)')
    expect(css).toContain('stroke-width: 5')
  })

  it('getMaterialCSSString returns same result as generateMaterialCSS', () => {
    const materials = [strawbale, roughWood]
    const css1 = generateMaterialCSS(materials)
    const css2 = getMaterialCSSString(materials)

    expect(css1).toBe(css2)
  })
})
