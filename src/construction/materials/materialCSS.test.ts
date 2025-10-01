import { describe, expect, it } from 'vitest'

import { strawbale, wood360x60 } from './material'
import { generateMaterialCSS, getMaterialCSSString } from './materialCSS'

describe('Material CSS Generation', () => {
  it('generates correct CSS for materials', () => {
    const materials = [strawbale, wood360x60]
    const css = generateMaterialCSS(materials)

    expect(css).toContain('Construction Material Styles')
    expect(css).toContain(`.${strawbale.id} rect`)
    expect(css).toContain(`.${strawbale.id} polygon`)
    expect(css).toContain(`fill: ${strawbale.color}`)
    expect(css).toContain(`.${wood360x60.id} rect`)
    expect(css).toContain(`fill: ${wood360x60.color}`)
    expect(css).toContain('stroke: #000')
    expect(css).toContain('stroke-width: 5')
  })

  it('getMaterialCSSString returns same result as generateMaterialCSS', () => {
    const materials = [strawbale, wood360x60]
    const css1 = generateMaterialCSS(materials)
    const css2 = getMaterialCSSString(materials)

    expect(css1).toBe(css2)
  })
})
