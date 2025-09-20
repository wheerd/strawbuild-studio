import { render, screen, fireEvent } from '@testing-library/react'
import { SVGViewport } from './SVGViewport'

describe('SVGViewport', () => {
  const testViewBox = '0 0 100 100'
  const TestContent = () => <rect x="10" y="10" width="80" height="80" fill="blue" data-testid="test-rect" />

  test('renders SVG with correct viewBox', () => {
    const { container } = render(
      <SVGViewport baseViewBox={testViewBox}>
        <TestContent />
      </SVGViewport>
    )

    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('viewBox', testViewBox)
  })

  test('renders reset button', () => {
    render(
      <SVGViewport baseViewBox={testViewBox}>
        <TestContent />
      </SVGViewport>
    )

    const resetButton = screen.getByRole('button', { name: /reset view/i })
    expect(resetButton).toBeInTheDocument()
  })

  test('renders children inside transform group', () => {
    render(
      <SVGViewport baseViewBox={testViewBox}>
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
      <SVGViewport baseViewBox={testViewBox} className="custom-class">
        <TestContent />
      </SVGViewport>
    )

    expect(container.firstChild).toHaveClass('custom-class')
  })

  test('positions reset button based on resetButtonPosition prop', () => {
    render(
      <SVGViewport baseViewBox={testViewBox} resetButtonPosition="bottom-left">
        <TestContent />
      </SVGViewport>
    )

    const resetButton = screen.getByRole('button', { name: /reset view/i })
    expect(resetButton).toHaveClass('bottom-2', 'left-2')
  })

  test('reset button resets transform on click', () => {
    render(
      <SVGViewport baseViewBox={testViewBox}>
        <TestContent />
      </SVGViewport>
    )

    const resetButton = screen.getByRole('button', { name: /reset view/i })
    const transformGroup = screen.getByTestId('test-rect').closest('g')

    // Initial transform should be identity
    expect(transformGroup).toHaveAttribute('transform', 'translate(0, 0) scale(1)')

    // Click reset button (should maintain identity transform)
    fireEvent.click(resetButton)
    expect(transformGroup).toHaveAttribute('transform', 'translate(0, 0) scale(1)')
  })

  test('handles wheel events for zooming', () => {
    const { container } = render(
      <SVGViewport baseViewBox={testViewBox}>
        <TestContent />
      </SVGViewport>
    )

    const svg = container.querySelector('svg')
    const transformGroup = screen.getByTestId('test-rect').closest('g')

    // Simulate zoom in
    fireEvent.wheel(svg!, { deltaY: -100 })

    // Transform should have changed (zoom > 1)
    const transform = transformGroup?.getAttribute('transform')
    expect(transform).toMatch(/scale\([\d.]+\)/)
    expect(transform).not.toBe('translate(0, 0) scale(1)')
  })
})
