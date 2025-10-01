import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { SVGMaterialStyles } from './SVGMaterialStyles'

describe('SVGMaterialStyles', () => {
  it('renders style element with material CSS', () => {
    const { container } = render(
      <svg>
        <SVGMaterialStyles />
      </svg>
    )

    const styleElement = container.querySelector('style')
    expect(styleElement).toBeInTheDocument()

    const cssContent = styleElement?.innerHTML || ''
    expect(cssContent).toContain('Construction Material Styles')
    expect(cssContent).toContain('.material_')
    expect(cssContent).toContain('fill:')
    expect(cssContent).toContain('stroke:')
  })
})
