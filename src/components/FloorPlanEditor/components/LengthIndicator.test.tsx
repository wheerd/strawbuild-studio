import { render } from '@testing-library/react'
import { vi } from 'vitest'
import { LengthIndicator } from './LengthIndicator'
import { createVec2 } from '@/types/geometry'

// Mock Konva components
vi.mock('react-konva', () => ({
  Group: ({ children, ...props }: any) => (
    <div data-testid="konva-group" {...props}>
      {children}
    </div>
  ),
  Line: (props: any) => <div data-testid="konva-line" {...props} />,
  Text: (props: any) => <div data-testid="konva-text" fontSize={props.fontSize} {...props} />
}))

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
    expect(textElement).toHaveAttribute('text', customLabel)
  })

  it('auto-generates label when none provided', () => {
    const { getByTestId } = render(<LengthIndicator startPoint={startPoint} endPoint={endPoint} />)

    const textElement = getByTestId('konva-text')
    expect(textElement).toHaveAttribute('text', '1.00m')
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
      expect(line).toHaveAttribute('stroke', customColor)
    })
    expect(text).toHaveAttribute('fill', customColor)
  })

  it('renders with custom font size and zoom scaling', () => {
    const customFontSize = 60
    const zoom = 0.5
    const { container } = render(
      <LengthIndicator startPoint={startPoint} endPoint={endPoint} fontSize={customFontSize} zoom={zoom} />
    )

    expect(container).toBeTruthy()
  })

  it('handles zero-length measurements', () => {
    const samePoint = createVec2(100, 100)
    const { container } = render(<LengthIndicator startPoint={samePoint} endPoint={samePoint} />)

    expect(container).toBeTruthy()
  })
})
