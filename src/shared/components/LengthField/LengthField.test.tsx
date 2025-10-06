import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'

import type { Length } from '@/shared/geometry'

import { LengthField } from './LengthField'

describe('LengthField', () => {
  const mockOnChange = vi.fn()

  beforeEach(() => {
    mockOnChange.mockClear()
  })

  describe('unit display and conversion', () => {
    it('displays mm values correctly', () => {
      render(<LengthField value={1250 as Length} onChange={mockOnChange} unit="mm" />)

      const input = screen.getByRole('textbox')
      expect(input).toHaveValue('1250')
      expect(screen.getByText('mm')).toBeInTheDocument()
    })

    it('displays cm values with 1 decimal place', () => {
      render(<LengthField value={1250 as Length} onChange={mockOnChange} unit="cm" />)

      const input = screen.getByRole('textbox')
      expect(input).toHaveValue('125.0')
      expect(screen.getByText('cm')).toBeInTheDocument()
    })

    it('displays m values with 1 decimal place', () => {
      render(<LengthField value={1250 as Length} onChange={mockOnChange} unit="m" />)

      const input = screen.getByRole('textbox')
      expect(input).toHaveValue('1.3')
      expect(screen.getByText('m')).toBeInTheDocument()
    })
  })

  describe('input validation', () => {
    it('allows valid numeric input', () => {
      render(<LengthField value={100 as Length} onChange={mockOnChange} unit="mm" />)

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: '250' } })

      expect(input).toHaveValue('250')
    })

    it('blocks invalid characters', () => {
      render(<LengthField value={100 as Length} onChange={mockOnChange} unit="mm" />)

      const input = screen.getByRole('textbox')

      // Try to input invalid characters
      fireEvent.change(input, { target: { value: 'abc' } })
      expect(input).toHaveValue('100') // Should remain unchanged

      // Valid input should work
      fireEvent.change(input, { target: { value: '123' } })
      expect(input).toHaveValue('123')
    })

    it('allows decimal points for cm and m units', () => {
      render(<LengthField value={100 as Length} onChange={mockOnChange} unit="cm" />)

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: '12.5' } })

      expect(input).toHaveValue('12.5')
    })
  })

  describe('spinner buttons', () => {
    it('renders up and down spinner buttons', () => {
      render(<LengthField value={100 as Length} onChange={mockOnChange} unit="mm" />)

      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(2)
    })

    it('increments value when up button is clicked', () => {
      render(<LengthField value={100 as Length} onChange={mockOnChange} unit="mm" />)

      const buttons = screen.getAllByRole('button')
      const upButton = buttons[0]

      fireEvent.click(upButton)

      expect(mockOnChange).toHaveBeenCalledWith(101)
    })

    it('decrements value when down button is clicked', () => {
      render(<LengthField value={100 as Length} onChange={mockOnChange} unit="mm" />)

      const buttons = screen.getAllByRole('button')
      const downButton = buttons[1]

      fireEvent.click(downButton)

      expect(mockOnChange).toHaveBeenCalledWith(99)
    })

    it('uses correct step sizes for different units', () => {
      // Test cm unit (default step: 10mm = 1cm)
      const { rerender } = render(<LengthField value={100 as Length} onChange={mockOnChange} unit="cm" />)

      const buttons = screen.getAllByRole('button')
      fireEvent.click(buttons[0])

      expect(mockOnChange).toHaveBeenCalledWith(110) // 100 + 10mm

      mockOnChange.mockClear()

      // Test m unit (default step: 100mm = 0.1m)
      rerender(<LengthField value={1000 as Length} onChange={mockOnChange} unit="m" />)

      fireEvent.click(buttons[0])
      expect(mockOnChange).toHaveBeenCalledWith(1100) // 1000 + 100mm
    })

    it('respects min/max bounds', () => {
      render(<LengthField value={5 as Length} onChange={mockOnChange} unit="mm" min={5 as Length} max={10 as Length} />)

      const buttons = screen.getAllByRole('button')
      const upButton = buttons[0]
      const downButton = buttons[1]

      // Should not go below min
      fireEvent.click(downButton)
      expect(mockOnChange).not.toHaveBeenCalled()

      // Should increment normally
      fireEvent.click(upButton)
      expect(mockOnChange).toHaveBeenCalledWith(6)
    })
  })

  describe('keyboard navigation', () => {
    it('increments on ArrowUp key', () => {
      render(<LengthField value={100 as Length} onChange={mockOnChange} unit="mm" />)

      const input = screen.getByRole('textbox')
      fireEvent.keyDown(input, { key: 'ArrowUp' })

      expect(mockOnChange).toHaveBeenCalledWith(101)
    })

    it('decrements on ArrowDown key', () => {
      render(<LengthField value={100 as Length} onChange={mockOnChange} unit="mm" />)

      const input = screen.getByRole('textbox')
      fireEvent.keyDown(input, { key: 'ArrowDown' })

      expect(mockOnChange).toHaveBeenCalledWith(99)
    })

    it('uses 10x step with Shift modifier', () => {
      render(<LengthField value={100 as Length} onChange={mockOnChange} unit="mm" />)

      const input = screen.getByRole('textbox')
      fireEvent.keyDown(input, { key: 'ArrowUp', shiftKey: true })

      expect(mockOnChange).toHaveBeenCalledWith(110) // 100 + (1 * 10)
    })

    it('uses 0.1x step with Ctrl modifier', () => {
      render(
        <LengthField
          value={100 as Length}
          onChange={mockOnChange}
          unit="cm"
          step={10 as Length} // 1cm step for cm unit
        />
      )

      const input = screen.getByRole('textbox')
      fireEvent.keyDown(input, { key: 'ArrowUp', ctrlKey: true })

      expect(mockOnChange).toHaveBeenCalledWith(101) // 100 + max(1, 10 * 0.1) = 100 + 1
    })
  })

  describe('blur formatting', () => {
    it('formats values on blur', async () => {
      render(<LengthField value={1250 as Length} onChange={mockOnChange} unit="cm" />)

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
      render(<LengthField value={100 as Length} onChange={mockOnChange} unit="mm" />)

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'invalid' } })
      fireEvent.blur(input)

      expect(input).toHaveValue('100') // Reverted to original value
    })
  })

  describe('custom step and precision', () => {
    it('uses custom step size', () => {
      render(<LengthField value={100 as Length} onChange={mockOnChange} unit="mm" step={5 as Length} />)

      const buttons = screen.getAllByRole('button')
      fireEvent.click(buttons[0])

      expect(mockOnChange).toHaveBeenCalledWith(105)
    })

    it('uses custom precision', () => {
      render(<LengthField value={1234 as Length} onChange={mockOnChange} unit="m" precision={3} />)

      const input = screen.getByRole('textbox')
      expect(input).toHaveValue('1.234') // 3 decimal places
    })
  })
})
