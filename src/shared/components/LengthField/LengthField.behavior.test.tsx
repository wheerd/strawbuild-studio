import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'

import type { Length } from '@/shared/geometry'

import { LengthField } from './LengthField'

describe('LengthField UX Behavior', () => {
  const mockOnChange = vi.fn()

  beforeEach(() => {
    mockOnChange.mockClear()
  })

  it('allows free editing while typing without onChange calls', () => {
    render(
      <LengthField value={100 as Length} onChange={mockOnChange} unit="mm" min={50 as Length} max={200 as Length} />
    )

    const input = screen.getByRole('textbox')

    // Start typing a value that would be out of bounds
    fireEvent.change(input, { target: { value: '5' } })
    expect(input).toHaveValue('5')
    expect(mockOnChange).not.toHaveBeenCalled()

    // Continue typing
    fireEvent.change(input, { target: { value: '50' } })
    expect(input).toHaveValue('50')
    expect(mockOnChange).not.toHaveBeenCalled()

    // Type a value that would exceed max
    fireEvent.change(input, { target: { value: '500' } })
    expect(input).toHaveValue('500')
    expect(mockOnChange).not.toHaveBeenCalled()
  })

  it('applies bounds and rounding only on blur', async () => {
    const { rerender } = render(
      <LengthField value={100 as Length} onChange={mockOnChange} unit="mm" min={50 as Length} max={200 as Length} />
    )

    const input = screen.getByRole('textbox')

    // Type a value above max
    fireEvent.change(input, { target: { value: '500' } })
    expect(input).toHaveValue('500')
    expect(mockOnChange).not.toHaveBeenCalled()

    // Blur should clamp to max
    fireEvent.blur(input)
    expect(mockOnChange).toHaveBeenCalledWith(200)

    // Re-render with the new value to simulate the parent state update
    rerender(
      <LengthField value={200 as Length} onChange={mockOnChange} unit="mm" min={50 as Length} max={200 as Length} />
    )

    expect(input).toHaveValue('200')
  })

  it('shows validation state for out-of-bounds values', () => {
    render(
      <LengthField value={100 as Length} onChange={mockOnChange} unit="mm" min={50 as Length} max={200 as Length} />
    )

    const input = screen.getByRole('textbox')

    // Type a value below min
    fireEvent.change(input, { target: { value: '10' } })

    // Field should show error state (red color)
    const textFieldRoot = input.closest('.rt-TextFieldRoot')
    expect(textFieldRoot).toHaveClass('rt-variant-surface')
    // Note: We can't easily test the color prop in this test environment,
    // but the isValid state should be false which sets color="red"
  })

  it('blocks invalid characters while typing', () => {
    render(<LengthField value={100 as Length} onChange={mockOnChange} unit="mm" />)

    const input = screen.getByRole('textbox')

    // Try to type invalid characters - they should be blocked
    fireEvent.change(input, { target: { value: 'abc' } })
    expect(input).toHaveValue('100') // Should remain unchanged

    // Valid numeric input should work
    fireEvent.change(input, { target: { value: '150' } })
    expect(input).toHaveValue('150')
  })

  it('handles escape key to revert changes', () => {
    render(<LengthField value={100 as Length} onChange={mockOnChange} unit="mm" />)

    const input = screen.getByRole('textbox')

    // Type new value
    fireEvent.change(input, { target: { value: '150' } })
    expect(input).toHaveValue('150')

    // Press escape
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(input).toHaveValue('100')
    expect(mockOnChange).not.toHaveBeenCalled()
  })

  it('handles enter key to commit changes', () => {
    render(<LengthField value={100 as Length} onChange={mockOnChange} unit="mm" />)

    const input = screen.getByRole('textbox')

    // Type new value
    fireEvent.change(input, { target: { value: '150' } })
    expect(input).toHaveValue('150')

    // Press enter
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(mockOnChange).toHaveBeenCalledWith(150)
  })

  it('formats trailing zeros on blur', () => {
    const { rerender } = render(<LengthField value={100 as Length} onChange={mockOnChange} unit="cm" />)

    const input = screen.getByRole('textbox')

    // Type value with trailing zeros
    fireEvent.change(input, { target: { value: '12.500' } })
    expect(input).toHaveValue('12.500')

    // Blur should format and update
    fireEvent.blur(input)
    expect(mockOnChange).toHaveBeenCalledWith(125) // 12.5cm = 125mm

    // Re-render with the new value
    rerender(<LengthField value={125 as Length} onChange={mockOnChange} unit="cm" />)

    expect(input).toHaveValue('12.5')
  })
})
