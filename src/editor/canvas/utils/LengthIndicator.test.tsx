import { render } from '@testing-library/react'

import { createVec2 } from '@/shared/geometry'

import { LengthIndicator } from './LengthIndicator'

describe('LengthIndicator', () => {
  const startPoint = createVec2(0, 0)
  const endPoint = createVec2(1000, 0)

  it('renders without crashing', () => {
    const { container } = render(<LengthIndicator startPoint={startPoint} endPoint={endPoint} />)

    expect(container).toBeTruthy()
  })

  it('renders all expected elements', () => {
    const { getAllByTestId } = render(<LengthIndicator startPoint={startPoint} endPoint={endPoint} />)

    // Should have 1 group, 6 lines (2 main dimension, 2 connection lines, 2 end markers), and 1 text
    expect(getAllByTestId('konva-group')).toHaveLength(1)
    expect(getAllByTestId('konva-line')).toHaveLength(6)
    expect(getAllByTestId('konva-text')).toHaveLength(1)
  })

  it('displays custom label when provided', () => {
    const customLabel = '5.5m'
    const { getByTestId } = render(<LengthIndicator startPoint={startPoint} endPoint={endPoint} label={customLabel} />)

    const textElement = getByTestId('konva-text')
    expect(textElement).toHaveTextContent(customLabel)
  })

  it('auto-generates label when none provided', () => {
    const { getByTestId } = render(<LengthIndicator startPoint={startPoint} endPoint={endPoint} />)

    const textElement = getByTestId('konva-text')
    expect(textElement).toHaveTextContent('1m') // formatLength(1000) returns "1m"
  })

  it('applies custom color', () => {
    const customColor = '#ff0000'
    const { getAllByTestId } = render(
      <LengthIndicator startPoint={startPoint} endPoint={endPoint} color={customColor} />
    )

    const lines = getAllByTestId('konva-line')
    const text = getAllByTestId('konva-text')[0]

    // Check that lines and text use the custom color
    lines.forEach(line => {
      expect(line).toHaveAttribute('data-stroke', customColor)
    })
    expect(text).toHaveAttribute('data-fill', customColor)
  })

  it('renders with custom font size', () => {
    const customFontSize = 60
    const { container } = render(
      <LengthIndicator startPoint={startPoint} endPoint={endPoint} fontSize={customFontSize} />
    )

    expect(container).toBeTruthy()
  })

  it('handles zero-length measurements', () => {
    const samePoint = createVec2(100, 100)
    const { container } = render(<LengthIndicator startPoint={samePoint} endPoint={samePoint} />)

    expect(container).toBeTruthy()
  })
})
