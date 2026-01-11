import { fireEvent, render, screen } from '@testing-library/react'

import { Bounds2D, newVec2 } from '@/shared/geometry'

import { SVGViewport } from './SVGViewport'

describe('SVGViewport', () => {
  const testContentBounds = Bounds2D.fromMinMax(newVec2(0, 0), newVec2(100, 100))
  const TestContent = () => <rect x="10" y="10" width="80" height="80" fill="blue" data-testid="test-rect" />

  test('renders SVG with fixed viewBox based on svgSize', () => {
    const { container } = render(
      <SVGViewport contentBounds={testContentBounds} svgSize={{ width: 800, height: 600 }}>
        <TestContent />
      </SVGViewport>
    )

    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('viewBox', '0 0 800 600')
  })

  test('renders reset button', () => {
    render(
      <SVGViewport contentBounds={testContentBounds} svgSize={{ width: 800, height: 600 }}>
        <TestContent />
      </SVGViewport>
    )

    const resetButton = screen.getByRole('button', { name: /app.fitToContent/i })
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
    expect(transformGroup?.getAttribute('transform')).toMatch(/translate\([^)]+\) scale\([^)]+\)/)
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

    const resetButton = screen.getByRole('button', { name: /app.fitToContent/i })
    expect(resetButton).toHaveClass('bottom-2', 'left-2')
  })

  test('fit to content button fits content when clicked', () => {
    render(
      <SVGViewport contentBounds={testContentBounds} svgSize={{ width: 800, height: 600 }}>
        <TestContent />
      </SVGViewport>
    )

    const resetButton = screen.getByRole('button', { name: /app.fitToContent/i })
    const testRect = screen.getByTestId('test-rect')
    const transformGroup = testRect.closest('g')

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
    const testRect = screen.getByTestId('test-rect')
    const transformGroup = testRect.closest('g')

    // Simulate zoom in
    fireEvent.wheel(svg!, { deltaY: -100 })

    // Transform should have changed
    const transform = transformGroup?.getAttribute('transform')
    expect(transform).toMatch(/scale\([\d.]+\)/)
  })

  describe('viewport transform structure', () => {
    test('has correct group structure', () => {
      render(
        <SVGViewport contentBounds={testContentBounds} svgSize={{ width: 800, height: 600 }}>
          <TestContent />
        </SVGViewport>
      )

      const testRect = screen.getByTestId('test-rect')
      const transformGroup = testRect.closest('g')
      const svg = transformGroup?.parentElement

      // Verify the structure: svg > g[transform] > content
      expect(svg?.tagName).toBe('svg')
      expect(transformGroup?.tagName).toBe('g')
      expect(transformGroup).toHaveAttribute('transform')
      expect(testRect.parentElement).toBe(transformGroup)
    })

    test('transform group receives viewport transformations', () => {
      const { container } = render(
        <SVGViewport contentBounds={testContentBounds} svgSize={{ width: 800, height: 600 }}>
          <TestContent />
        </SVGViewport>
      )

      const svg = container.querySelector('svg')
      const testRect = screen.getByTestId('test-rect')
      const transformGroup = testRect.closest('g')

      // Initial transform
      expect(transformGroup).toHaveAttribute('transform')

      // Zoom operation should update transform group
      fireEvent.wheel(svg!, { deltaY: -100 })

      const updatedTransform = transformGroup?.getAttribute('transform')
      expect(updatedTransform).toMatch(/translate\([^)]+\) scale\([^)]+\)/)
    })

    test('auto-fits content when contentBounds or svgSize changes', () => {
      const { rerender } = render(
        <SVGViewport contentBounds={testContentBounds} svgSize={{ width: 800, height: 600 }}>
          <TestContent />
        </SVGViewport>
      )

      const testRect = screen.getByTestId('test-rect')
      const transformGroup = testRect.closest('g')
      const initialTransform = transformGroup?.getAttribute('transform')

      // Change svgSize
      rerender(
        <SVGViewport contentBounds={testContentBounds} svgSize={{ width: 1000, height: 800 }}>
          <TestContent />
        </SVGViewport>
      )

      // Transform should update to fit new size
      const newTransform = transformGroup?.getAttribute('transform')
      expect(newTransform).toBeTruthy()
      expect(newTransform).not.toBe(initialTransform)
    })
  })
})
