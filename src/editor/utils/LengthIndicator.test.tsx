import { render } from '@testing-library/react'

import { ZERO_VEC2, newVec2 } from '@/shared/geometry'

import { LengthIndicator } from './LengthIndicator'

describe('LengthIndicator', () => {
  const startPoint = ZERO_VEC2
  const endPoint = newVec2(1000, 0)

  it('renders without crashing', () => {
    const { container } = render(<LengthIndicator startPoint={startPoint} endPoint={endPoint} />)

    expect(container).toBeTruthy()
  })

  it('renders all expected elements', () => {
    const { container } = render(<LengthIndicator startPoint={startPoint} endPoint={endPoint} />)

    // Should have 2 group (1 for text), 6 lines (2 main dimension, 2 connection lines, 2 end markers), and 1 text
    expect(container.querySelectorAll('g')).toHaveLength(2)
    expect(container.querySelectorAll('line')).toHaveLength(6)
    expect(container.querySelectorAll('text')).toHaveLength(1)
  })

  it('displays custom label when provided', () => {
    const customLabel = '5.5m'
    const { container } = render(<LengthIndicator startPoint={startPoint} endPoint={endPoint} label={customLabel} />)

    const textElement = container.querySelector('text')
    expect(textElement).toHaveTextContent(customLabel)
  })

  it('auto-generates label when none provided', () => {
    const { container } = render(<LengthIndicator startPoint={startPoint} endPoint={endPoint} />)

    const textElement = container.querySelector('text')
    expect(textElement).toHaveTextContent('1m') // formatLength(1000) returns "1m"
  })

  it('applies custom color', () => {
    const customColor = '#ff0000'
    const { container } = render(<LengthIndicator startPoint={startPoint} endPoint={endPoint} color={customColor} />)

    const lines = container.querySelectorAll('line')
    const text = container.querySelectorAll('text')[0]

    // Check that lines and text use the custom color
    lines.forEach(line => {
      expect(line).toHaveAttribute('stroke', customColor)
    })
    expect(text).toHaveAttribute('fill', customColor)
  })

  it('renders with custom font size', () => {
    const customFontSize = 60
    const { container } = render(
      <LengthIndicator startPoint={startPoint} endPoint={endPoint} fontSize={customFontSize} />
    )

    expect(container).toBeTruthy()
  })

  it('handles zero-length measurements', () => {
    const samePoint = newVec2(100, 100)
    const { container } = render(<LengthIndicator startPoint={samePoint} endPoint={samePoint} />)

    expect(container).toBeTruthy()
  })
})
