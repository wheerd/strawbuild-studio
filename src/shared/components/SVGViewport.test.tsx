import { fireEvent, render, screen } from '@testing-library/react'
import { vec2 } from 'gl-matrix'

import { Bounds2D } from '@/shared/geometry'

import { SVGViewport } from './SVGViewport'

describe('SVGViewport', () => {
  const testContentBounds = Bounds2D.fromMinMax(vec2.fromValues(0, 0), vec2.fromValues(100, 100))
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

  test('renders children inside nested transform groups', () => {
    render(
      <SVGViewport contentBounds={testContentBounds} svgSize={{ width: 800, height: 600 }}>
        <TestContent />
      </SVGViewport>
    )

    const testRect = screen.getByTestId('test-rect')
    expect(testRect).toBeInTheDocument()

    // Check that it's inside nested transform groups
    const flipGroup = testRect.closest('g')
    expect(flipGroup).toHaveClass('flipY', 'normalX') // Default flip settings

    const transformGroup = flipGroup?.parentElement
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
    const testRect = screen.getByTestId('test-rect')
    const transformGroup = testRect.closest('g')?.parentElement

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
    const transformGroup = testRect.closest('g')?.parentElement

    // Simulate zoom in
    fireEvent.wheel(svg!, { deltaY: -100 })

    // Transform should have changed
    const transform = transformGroup?.getAttribute('transform')
    expect(transform).toMatch(/scale\([\d.]+\)/)
  })

  describe('flip functionality', () => {
    test('applies default flip settings (flipY=true, flipX=false)', () => {
      render(
        <SVGViewport contentBounds={testContentBounds} svgSize={{ width: 800, height: 600 }}>
          <TestContent />
        </SVGViewport>
      )

      const testRect = screen.getByTestId('test-rect')
      const flipGroup = testRect.closest('g')

      expect(flipGroup).toHaveClass('flipY', 'normalX')
    })

    test('applies flipX=true setting', () => {
      render(
        <SVGViewport contentBounds={testContentBounds} svgSize={{ width: 800, height: 600 }} flipX flipY={false}>
          <TestContent />
        </SVGViewport>
      )

      const testRect = screen.getByTestId('test-rect')
      const flipGroup = testRect.closest('g')

      expect(flipGroup).toHaveClass('normalY', 'flipX')
    })

    test('applies both flipX=true and flipY=true', () => {
      render(
        <SVGViewport contentBounds={testContentBounds} svgSize={{ width: 800, height: 600 }} flipX flipY>
          <TestContent />
        </SVGViewport>
      )

      const testRect = screen.getByTestId('test-rect')
      const flipGroup = testRect.closest('g')

      expect(flipGroup).toHaveClass('flipY', 'flipX')
    })

    test('applies no flip when both are false', () => {
      render(
        <SVGViewport
          contentBounds={testContentBounds}
          svgSize={{ width: 800, height: 600 }}
          flipX={false}
          flipY={false}
        >
          <TestContent />
        </SVGViewport>
      )

      const testRect = screen.getByTestId('test-rect')
      const flipGroup = testRect.closest('g')

      expect(flipGroup).toHaveClass('normalY', 'normalX')
    })

    test('flip group is inside transform group', () => {
      render(
        <SVGViewport contentBounds={testContentBounds} svgSize={{ width: 800, height: 600 }} flipX flipY={false}>
          <TestContent />
        </SVGViewport>
      )

      const testRect = screen.getByTestId('test-rect')
      const flipGroup = testRect.closest('g')
      const transformGroup = flipGroup?.parentElement

      // Flip group should be inside transform group
      expect(flipGroup).toHaveClass('normalY', 'flipX')
      expect(transformGroup).toHaveAttribute('transform')
      expect(transformGroup?.tagName).toBe('g')
    })

    test('maintains flip settings after zoom and pan operations', () => {
      const { container } = render(
        <SVGViewport contentBounds={testContentBounds} svgSize={{ width: 800, height: 600 }} flipX flipY>
          <TestContent />
        </SVGViewport>
      )

      const svg = container.querySelector('svg')
      const testRect = screen.getByTestId('test-rect')
      const flipGroup = testRect.closest('g')

      // Perform zoom operation
      fireEvent.wheel(svg!, { deltaY: -100 })

      // Flip classes should remain unchanged
      expect(flipGroup).toHaveClass('flipY', 'flipX')
    })

    test('maintains flip settings after fit to content', () => {
      render(
        <SVGViewport contentBounds={testContentBounds} svgSize={{ width: 800, height: 600 }} flipX flipY={false}>
          <TestContent />
        </SVGViewport>
      )

      const resetButton = screen.getByRole('button', { name: /fit to content/i })
      const testRect = screen.getByTestId('test-rect')
      const flipGroup = testRect.closest('g')

      // Click fit to content
      fireEvent.click(resetButton)

      // Flip classes should remain unchanged
      expect(flipGroup).toHaveClass('normalY', 'flipX')
    })
  })

  describe('viewport transform structure', () => {
    test('has correct nested group structure', () => {
      render(
        <SVGViewport contentBounds={testContentBounds} svgSize={{ width: 800, height: 600 }}>
          <TestContent />
        </SVGViewport>
      )

      const testRect = screen.getByTestId('test-rect')
      const flipGroup = testRect.closest('g')
      const transformGroup = flipGroup?.parentElement
      const svg = transformGroup?.parentElement

      // Verify the structure: svg > g[transform] > g[flip-classes] > content
      expect(svg?.tagName).toBe('svg')
      expect(transformGroup?.tagName).toBe('g')
      expect(transformGroup).toHaveAttribute('transform')
      expect(flipGroup?.tagName).toBe('g')
      expect(flipGroup).toHaveClass('flipY', 'normalX') // Should have flip classes
      expect(testRect.parentElement).toBe(flipGroup)
    })

    test('transform group receives viewport transformations', () => {
      const { container } = render(
        <SVGViewport contentBounds={testContentBounds} svgSize={{ width: 800, height: 600 }}>
          <TestContent />
        </SVGViewport>
      )

      const svg = container.querySelector('svg')
      const testRect = screen.getByTestId('test-rect')
      const transformGroup = testRect.closest('g')?.parentElement

      // Initial transform
      expect(transformGroup).toHaveAttribute('transform')

      // Zoom operation should update transform group
      fireEvent.wheel(svg!, { deltaY: -100 })

      const updatedTransform = transformGroup?.getAttribute('transform')
      expect(updatedTransform).toMatch(/translate\([^)]+\) scale\([^)]+\)/)
    })

    test('flip group does not receive viewport transformations', () => {
      const { container } = render(
        <SVGViewport contentBounds={testContentBounds} svgSize={{ width: 800, height: 600 }} flipX flipY={false}>
          <TestContent />
        </SVGViewport>
      )

      const svg = container.querySelector('svg')
      const testRect = screen.getByTestId('test-rect')
      const flipGroup = testRect.closest('g')

      // Flip group should only have class attributes, not transform
      expect(flipGroup).not.toHaveAttribute('transform')
      expect(flipGroup).toHaveClass('normalY', 'flipX')

      // After zoom, flip group should still not have transform attribute
      fireEvent.wheel(svg!, { deltaY: -100 })

      expect(flipGroup).not.toHaveAttribute('transform')
      expect(flipGroup).toHaveClass('normalY', 'flipX')
    })
  })
})
