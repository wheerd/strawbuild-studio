import { describe, expect, it } from 'vitest'

import { strawbale, wood } from './material'
import { generateMaterialCSS, getMaterialCSSString } from './materialCSS'

describe('Material CSS Generation', () => {
  it('generates correct CSS for materials', () => {
    const materials = [strawbale, wood]
    const css = generateMaterialCSS(materials)

    expect(css).toContain('Construction Material Styles')
    expect(css).toContain(`.${strawbale.id} .apply-material`)
    expect(css).toContain(`fill: ${strawbale.color}`)
    expect(css).toContain(`.${wood.id} .apply-material`)
    expect(css).toContain(`fill: ${wood.color}`)
    expect(css).toContain('stroke: #000')
    expect(css).toContain('stroke-width: 5')
  })

  it('getMaterialCSSString returns same result as generateMaterialCSS', () => {
    const materials = [strawbale, wood]
    const css1 = generateMaterialCSS(materials)
    const css2 = getMaterialCSSString(materials)

    expect(css1).toBe(css2)
  })
})
