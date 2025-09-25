import { fireEvent, render, screen } from '@testing-library/react'

import { createVec2 } from '@/shared/geometry'

import { SVGViewport } from './SVGViewport'

describe('SVGViewport', () => {
  const testContentBounds = {
    min: createVec2(0, 0),
    max: createVec2(100, 100)
  }
  const TestContent = () => <rect x="10" y="10" width="80" height="80" fill="blue" data-testid="test-rect" />

  test('renders SVG with generated viewBox from content bounds', async () => {
    const { container } = render(
      <SVGViewport contentBounds={testContentBounds} svgSize={{ width: 800, height: 600 }}>
        <TestContent />
      </SVGViewport>
    )

    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('viewBox')

    // Initial viewBox might be fallback, but after container size is determined it should be calculated
    const viewBox = svg?.getAttribute('viewBox')
    expect(viewBox).toBeTruthy()
  })

  test('renders reset button', () => {
    render(
      <SVGViewport contentBounds={testContentBounds} svgSize={{ width: 800, height: 600 }}>
        <TestContent />
      </SVGViewport>
    )

    const resetButton = screen.getByRole('button', { name: /fit to content/i })
    expect(resetButton).toBeInTheDocument()
  })

  test('renders children inside transform group', () => {
    render(
      <SVGViewport contentBounds={testContentBounds} svgSize={{ width: 800, height: 600 }}>
        <TestContent />
      </SVGViewport>
    )

    const testRect = screen.getByTestId('test-rect')
    expect(testRect).toBeInTheDocument()

    // Check that it's inside a transform group
    const transformGroup = testRect.closest('g')
    expect(transformGroup).toHaveAttribute('transform')
  })

  test('applies custom className', () => {
    const { container } = render(
      <SVGViewport contentBounds={testContentBounds} className="custom-class" svgSize={{ width: 800, height: 600 }}>
        <TestContent />
      </SVGViewport>
    )

    expect(container.firstChild).toHaveClass('custom-class')
  })

  test('positions reset button based on resetButtonPosition prop', () => {
    render(
      <SVGViewport
        contentBounds={testContentBounds}
        resetButtonPosition="bottom-left"
        svgSize={{ width: 800, height: 600 }}
      >
        <TestContent />
      </SVGViewport>
    )

    const resetButton = screen.getByRole('button', { name: /fit to content/i })
    expect(resetButton).toHaveClass('bottom-2', 'left-2')
  })

  test('fit to content button fits content when clicked', () => {
    render(
      <SVGViewport contentBounds={testContentBounds} svgSize={{ width: 800, height: 600 }}>
        <TestContent />
      </SVGViewport>
    )

    const resetButton = screen.getByRole('button', { name: /fit to content/i })
    const transformGroup = screen.getByTestId('test-rect').closest('g')

    // Click fit to content button
    fireEvent.click(resetButton)

    // Transform should be applied to fit content
    const transform = transformGroup?.getAttribute('transform')
    expect(transform).toMatch(/translate\([^)]+\) scale\([^)]+\)/)
  })

  test('handles wheel events for zooming', () => {
    const { container } = render(
      <SVGViewport contentBounds={testContentBounds} svgSize={{ width: 800, height: 600 }}>
        <TestContent />
      </SVGViewport>
    )

    const svg = container.querySelector('svg')
    const transformGroup = screen.getByTestId('test-rect').closest('g')

    // Simulate zoom in
    fireEvent.wheel(svg!, { deltaY: -100 })

    // Transform should have changed
    const transform = transformGroup?.getAttribute('transform')
    expect(transform).toMatch(/scale\([\d.]+\)/)
  })
})
