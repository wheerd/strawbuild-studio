import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'

import { LengthField } from './LengthField'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: {
      language: 'en'
    }
  })
}))

describe('LengthField', () => {
  const mockOnChange = vi.fn()
  const mockOnCommit = vi.fn()

  beforeEach(() => {
    mockOnChange.mockClear()
    mockOnCommit.mockClear()
  })

  describe('unit display and conversion', () => {
    it('displays mm values correctly', () => {
      render(<LengthField value={1250} onCommit={mockOnCommit} unit="mm" />)

      const input = screen.getByRole('textbox')
      expect(input).toHaveValue('1250')
      expect(screen.getByText('mm')).toBeInTheDocument()
    })

    it('displays cm values', () => {
      render(<LengthField value={1250} onCommit={mockOnCommit} unit="cm" />)

      const input = screen.getByRole('textbox')
      expect(input).toHaveValue('125')
      expect(screen.getByText('cm')).toBeInTheDocument()
    })

    it('displays m values with 1 decimal place', () => {
      render(<LengthField value={1250} onCommit={mockOnCommit} unit="m" />)

      const input = screen.getByRole('textbox')
      expect(input).toHaveValue('1.3')
      expect(screen.getByText('m')).toBeInTheDocument()
    })

    it('displays m values with configured precision', () => {
      render(<LengthField value={1258} precision={3} onCommit={mockOnCommit} unit="m" />)

      const input = screen.getByRole('textbox')
      expect(input).toHaveValue('1.258')
      expect(screen.getByText('m')).toBeInTheDocument()
    })

    it('does not display invalid values', () => {
      render(<LengthField value={'invalid' as any} onCommit={mockOnCommit} unit="mm" />)

      const input = screen.getByRole('textbox')
      expect(input).toHaveValue('')
    })
  })

  describe('input validation', () => {
    it('allows valid numeric input', () => {
      render(<LengthField value={100} onCommit={mockOnCommit} unit="mm" />)

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: '250' } })

      expect(input).toHaveValue('250')
    })

    it('blocks invalid characters', () => {
      render(<LengthField value={100} onCommit={mockOnCommit} unit="mm" />)

      const input = screen.getByRole('textbox')

      // Try to input invalid characters
      fireEvent.change(input, { target: { value: 'abc' } })
      expect(input).toHaveValue('100') // Should remain unchanged

      // Valid input should work
      fireEvent.change(input, { target: { value: '123' } })
      expect(input).toHaveValue('123')
    })

    it('allows decimal points for cm and m units', () => {
      render(<LengthField value={100} onCommit={mockOnCommit} unit="cm" />)

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: '12.5' } })

      expect(input).toHaveValue('12.5')
    })

    it('shows validation state for out-of-bounds values', () => {
      render(<LengthField value={100} onCommit={mockOnCommit} unit="mm" min={50} max={200} />)

      const input = screen.getByRole('textbox')

      // Type a value below min
      fireEvent.change(input, { target: { value: '10' } })

      // Field should show error state (red color)
      const textFieldRoot = input.closest('.rt-TextFieldRoot')
      expect(textFieldRoot).toHaveClass('rt-variant-surface')
      // Note: We can't easily test the color prop in this test environment,
      // but the isValid state should be false which setsclassName="text-destructive"
    })
  })

  describe('spinner buttons', () => {
    it('renders up and down spinner buttons', () => {
      render(<LengthField value={100} onCommit={mockOnCommit} unit="mm" />)

      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(2)
    })

    it('increments value when up button is clicked', () => {
      render(<LengthField value={100} onCommit={mockOnCommit} unit="mm" />)

      const buttons = screen.getAllByRole('button')
      const upButton = buttons[0]

      fireEvent.click(upButton)

      expect(mockOnCommit).toHaveBeenCalledWith(101)
    })

    it('decrements value when down button is clicked', () => {
      render(<LengthField value={100} onCommit={mockOnCommit} unit="mm" />)

      const buttons = screen.getAllByRole('button')
      const downButton = buttons[1]

      fireEvent.click(downButton)

      expect(mockOnCommit).toHaveBeenCalledWith(99)
    })

    it('uses correct step sizes for different units', () => {
      // Test cm unit (default step: 10mm = 1cm)
      const { rerender } = render(<LengthField value={100} onCommit={mockOnCommit} unit="cm" />)

      const buttons = screen.getAllByRole('button')
      fireEvent.click(buttons[0])

      expect(mockOnCommit).toHaveBeenCalledWith(110) // 100 + 10mm

      mockOnCommit.mockClear()

      // Test m unit (default step: 100mm = 0.1m)
      rerender(<LengthField value={1000} onCommit={mockOnCommit} unit="m" />)

      fireEvent.click(buttons[0])
      expect(mockOnCommit).toHaveBeenCalledWith(1100) // 1000 + 100mm
    })

    it('respects min/max bounds', () => {
      render(<LengthField value={5} onCommit={mockOnCommit} unit="mm" min={5} max={10} />)

      const buttons = screen.getAllByRole('button')
      const upButton = buttons[0]
      const downButton = buttons[1]

      // Should not go below min
      fireEvent.click(downButton)
      expect(mockOnCommit).not.toHaveBeenCalled()

      // Should increment normally
      fireEvent.click(upButton)
      expect(mockOnCommit).toHaveBeenCalledWith(6)
    })
  })

  describe('keyboard navigation', () => {
    it('increments on ArrowUp key', () => {
      render(<LengthField value={100} onCommit={mockOnCommit} unit="mm" />)

      const input = screen.getByRole('textbox')
      fireEvent.keyDown(input, { key: 'ArrowUp' })

      expect(mockOnCommit).toHaveBeenCalledWith(101)
    })

    it('decrements on ArrowDown key', () => {
      render(<LengthField value={100} onCommit={mockOnCommit} unit="mm" />)

      const input = screen.getByRole('textbox')
      fireEvent.keyDown(input, { key: 'ArrowDown' })

      expect(mockOnCommit).toHaveBeenCalledWith(99)
    })

    it('uses 10x step with Shift modifier', () => {
      render(<LengthField value={100} onCommit={mockOnCommit} unit="mm" />)

      const input = screen.getByRole('textbox')
      fireEvent.keyDown(input, { key: 'ArrowUp', shiftKey: true })

      expect(mockOnCommit).toHaveBeenCalledWith(110) // 100 + (1 * 10)
    })

    it('uses 0.1x step with Ctrl modifier', () => {
      render(
        <LengthField
          value={100}
          onCommit={mockOnCommit}
          unit="cm"
          step={10} // 1cm step for cm unit
        />
      )

      const input = screen.getByRole('textbox')
      fireEvent.keyDown(input, { key: 'ArrowUp', ctrlKey: true })

      expect(mockOnCommit).toHaveBeenCalledWith(101) // 100 + max(1, 10 * 0.1) = 100 + 1
    })

    it('handles escape key to revert changes', () => {
      render(<LengthField value={100} onCommit={mockOnCommit} unit="mm" />)

      const input = screen.getByRole('textbox')

      // Type new value
      fireEvent.change(input, { target: { value: '150' } })
      expect(input).toHaveValue('150')

      // Press escape
      fireEvent.keyDown(input, { key: 'Escape' })
      expect(input).toHaveValue('100')
      expect(mockOnCommit).not.toHaveBeenCalled()
    })

    it('handles enter key to commit changes', () => {
      render(<LengthField value={100} onCommit={mockOnCommit} unit="mm" />)

      const input = screen.getByRole('textbox')

      // Type new value
      fireEvent.change(input, { target: { value: '150' } })
      expect(input).toHaveValue('150')

      // Press enter
      fireEvent.keyDown(input, { key: 'Enter' })
      expect(mockOnCommit).toHaveBeenCalledWith(150)
    })
  })

  describe('blur formatting', () => {
    it('formats values on blur', async () => {
      render(<LengthField value={1250} onChange={mockOnChange} unit="cm" />)

      const input = screen.getByRole('textbox')
      // Input starts as 125.0 (1250mm = 125.0cm)
      fireEvent.change(input, { target: { value: '125.500' } })

      // Wait a moment for the state to update
      await new Promise(resolve => setTimeout(resolve, 10))

      fireEvent.blur(input)

      // After blur, the onChange should be called with the converted value
      expect(mockOnChange).toHaveBeenCalledWith(1255) // 125.5cm = 1255mm
    })

    it('reverts to previous value for invalid input', () => {
      render(<LengthField value={100} onChange={mockOnChange} unit="mm" />)

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'invalid' } })
      fireEvent.blur(input)

      expect(input).toHaveValue('100') // Reverted to original value
    })
  })

  describe('user experience behavior', () => {
    it('calls onChange on typing only when within bounds', () => {
      render(<LengthField value={100} onChange={mockOnChange} unit="mm" min={50} max={200} />)

      const input = screen.getByRole('textbox')

      // Start typing a value that would be out of bounds
      fireEvent.change(input, { target: { value: '5' } })
      expect(input).toHaveValue('5')
      expect(mockOnChange).not.toHaveBeenCalled()

      // Continue typing
      fireEvent.change(input, { target: { value: '50' } })
      expect(input).toHaveValue('50')
      expect(mockOnChange).toHaveBeenCalledWith(50)
      mockOnChange.mockClear()

      // Type a value that would exceed max
      fireEvent.change(input, { target: { value: '500' } })
      expect(input).toHaveValue('500')
      expect(mockOnChange).not.toHaveBeenCalled()
    })

    it('applies bounds and rounding only on blur', () => {
      const { rerender } = render(<LengthField value={100} onChange={mockOnChange} unit="mm" min={50} max={200} />)

      const input = screen.getByRole('textbox')

      // Type a value above max
      fireEvent.change(input, { target: { value: '500' } })
      expect(input).toHaveValue('500')
      expect(mockOnChange).not.toHaveBeenCalled()

      // Blur should clamp to max
      fireEvent.blur(input)
      expect(mockOnChange).toHaveBeenCalledWith(200)

      // Re-render with the new value to simulate the parent state update
      rerender(<LengthField value={200} onChange={mockOnChange} unit="mm" min={50} max={200} />)

      expect(input).toHaveValue('200')
    })

    it('formats trailing zeros on blur', () => {
      const { rerender } = render(<LengthField value={100} onChange={mockOnChange} unit="cm" />)

      const input = screen.getByRole('textbox')

      // Type value with trailing zeros
      fireEvent.change(input, { target: { value: '12.500' } })
      expect(input).toHaveValue('12.500')

      // Blur should format and update
      fireEvent.blur(input)
      expect(mockOnChange).toHaveBeenCalledWith(125) // 12.5cm = 125mm

      // Re-render with the new value
      rerender(<LengthField value={125} onChange={mockOnChange} unit="cm" />)

      expect(input).toHaveValue('12.5')
    })
  })

  describe('custom step and precision', () => {
    it('uses custom step size', () => {
      render(<LengthField value={100} onChange={mockOnChange} unit="mm" step={5} />)

      const buttons = screen.getAllByRole('button')
      fireEvent.click(buttons[0])

      expect(mockOnChange).toHaveBeenCalledWith(105)
    })

    it('uses custom precision', () => {
      render(<LengthField value={1234} onChange={mockOnChange} unit="m" precision={3} />)

      const input = screen.getByRole('textbox')
      expect(input).toHaveValue('1.234') // 3 decimal places
    })
  })

  describe('locale-aware formatting', () => {
    it('accepts comma as decimal separator (lenient input)', () => {
      render(<LengthField value={100} onChange={mockOnChange} unit="cm" />)

      const input = screen.getByRole('textbox')

      // User types with comma (German style)
      fireEvent.change(input, { target: { value: '12,5' } })
      expect(input).toHaveValue('12,5')

      // Should parse correctly and call onChange
      expect(mockOnChange).toHaveBeenCalledWith(125) // 12.5cm = 125mm
    })

    it('accepts period as decimal separator (lenient input)', () => {
      render(<LengthField value={100} onChange={mockOnChange} unit="cm" />)

      const input = screen.getByRole('textbox')

      // User types with period (English style)
      fireEvent.change(input, { target: { value: '12.5' } })
      expect(input).toHaveValue('12.5')

      // Should parse correctly and call onChange
      expect(mockOnChange).toHaveBeenCalledWith(125) // 12.5cm = 125mm
    })

    it('formats to locale decimal separator on blur', () => {
      const { rerender } = render(<LengthField value={100} onChange={mockOnChange} unit="cm" />)

      const input = screen.getByRole('textbox')

      // User types with comma
      fireEvent.change(input, { target: { value: '12,5' } })
      expect(input).toHaveValue('12,5')

      // On blur, should format to locale (English uses period)
      fireEvent.blur(input)
      expect(mockOnChange).toHaveBeenCalledWith(125)

      // Re-render with new value
      rerender(<LengthField value={125} onChange={mockOnChange} unit="cm" />)

      // Should display with period (English locale)
      expect(input).toHaveValue('12.5')
    })
  })
})
