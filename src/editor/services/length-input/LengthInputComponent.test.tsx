import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { LengthInputComponent } from './LengthInputComponent'
import { lengthInputService } from './LengthInputService'
import type { LengthInputConfig } from './types'

// Mock Radix UI components
vi.mock('@radix-ui/themes', () => ({
  Box: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  TextField: {
    Root: ({ _children, ...props }: any) => <input {...props} />
  }
}))

describe('LengthInputComponent', () => {
  let mockConfig: LengthInputConfig

  beforeEach(() => {
    mockConfig = {
      position: { x: 100, y: 200 },
      onCommit: vi.fn(),
      onCancel: vi.fn()
    }

    // Clean up any existing state
    lengthInputService.deactivate()
  })

  afterEach(() => {
    cleanup()
    lengthInputService.deactivate()
  })

  describe('rendering', () => {
    it('should not render when inactive', () => {
      render(<LengthInputComponent />)

      const input = screen.queryByRole('textbox')
      expect(input).not.toBeInTheDocument()
    })

    it('should render when active and showImmediately is true', () => {
      const config = { ...mockConfig, showImmediately: true }
      lengthInputService.activate(config)

      render(<LengthInputComponent />)

      const input = screen.getByRole('textbox')
      expect(input).toBeInTheDocument()
    })

    it('should not render when ready but not shown', () => {
      lengthInputService.activate(mockConfig) // showImmediately defaults to false

      render(<LengthInputComponent />)

      const input = screen.queryByRole('textbox')
      expect(input).not.toBeInTheDocument()
    })

    it('should render after being shown', async () => {
      act(() => {
        lengthInputService.activate(mockConfig)
      })

      render(<LengthInputComponent />)

      // Initially not visible
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()

      // Show the input
      act(() => {
        lengthInputService.show()
      })

      // Wait for re-render
      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })
    })
  })

  describe('initial values', () => {
    it('should display initial value when provided', () => {
      const config = {
        ...mockConfig,
        initialValue: 500,
        showImmediately: true
      }
      lengthInputService.activate(config)

      render(<LengthInputComponent />)

      const input = screen.getByRole('textbox') as HTMLInputElement
      expect(input.value).toBe('0.5m') // formatLength converts 500mm to 0.5m
    })

    it('should display placeholder when no initial value', () => {
      const config = {
        ...mockConfig,
        placeholder: 'Enter length...',
        showImmediately: true
      }
      lengthInputService.activate(config)

      render(<LengthInputComponent />)

      const input = screen.getByRole('textbox') as HTMLInputElement
      expect(input.placeholder).toBe('Enter length...')
    })
  })

  describe('global keyboard handling', () => {
    beforeEach(() => {
      lengthInputService.activate(mockConfig) // Ready but not shown
      render(<LengthInputComponent />)
    })

    it('should show input and start with typed character on numeric key', () => {
      // Initially not visible
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()

      // Type a number
      fireEvent.keyDown(document, { key: '5' })

      // Should now be visible with the typed character
      const input = screen.getByRole('textbox') as HTMLInputElement
      expect(input).toBeInTheDocument()
      expect(input.value).toBe('5')
    })

    it('should show input on decimal point', () => {
      fireEvent.keyDown(document, { key: '.' })

      const input = screen.getByRole('textbox') as HTMLInputElement
      expect(input.value).toBe('.')
    })

    it('should show input on minus sign', () => {
      fireEvent.keyDown(document, { key: '-' })

      const input = screen.getByRole('textbox') as HTMLInputElement
      expect(input.value).toBe('-')
    })

    it('should not show input on non-numeric keys', () => {
      fireEvent.keyDown(document, { key: 'a' })

      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })

    it('should not show input on tool hotkeys', () => {
      fireEvent.keyDown(document, { key: 'w' }) // Wall tool hotkey
      fireEvent.keyDown(document, { key: 'm' }) // Move tool hotkey
      fireEvent.keyDown(document, { key: 'Escape' })

      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })

    it('should not install global handler when showImmediately is true', async () => {
      act(() => {
        lengthInputService.deactivate()
      })

      const config = { ...mockConfig, showImmediately: true }
      act(() => {
        lengthInputService.activate(config)
      })

      // Wait for component to render
      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      // Global keyboard events should not affect it
      const initialValue = (screen.getByRole('textbox') as HTMLInputElement).value
      fireEvent.keyDown(document, { key: '5' })

      // Value should not change from global handler
      expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe(initialValue)
    })

    it('should remove global handler when input becomes active', async () => {
      // Show the input
      act(() => {
        lengthInputService.show()
      })

      // Wait for input to be visible
      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      // Global keyboard events should not trigger again
      const spy = vi.spyOn(lengthInputService, 'updateInputValue')
      fireEvent.keyDown(document, { key: '7' })

      // Should not have been called by global handler
      expect(spy).not.toHaveBeenCalledWith('7')

      spy.mockRestore()
    })

    it('should remove global handler when deactivated', () => {
      // Deactivate
      act(() => {
        lengthInputService.deactivate()
      })

      // Global keyboard events should not work
      fireEvent.keyDown(document, { key: '5' })

      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })
  })

  describe('input interactions', () => {
    beforeEach(() => {
      const config = { ...mockConfig, showImmediately: true }
      lengthInputService.activate(config)
      render(<LengthInputComponent />)
    })

    it('should handle input changes', () => {
      const input = screen.getByRole('textbox') as HTMLInputElement

      fireEvent.change(input, { target: { value: '100mm' } })

      expect(input.value).toBe('100mm')
    })

    it('should handle Enter key to commit', () => {
      const input = screen.getByRole('textbox') as HTMLInputElement

      fireEvent.change(input, { target: { value: '500' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      expect(mockConfig.onCommit).toHaveBeenCalledWith(500)
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })

    it('should handle Escape key to cancel', () => {
      const input = screen.getByRole('textbox') as HTMLInputElement

      fireEvent.keyDown(input, { key: 'Escape' })

      expect(mockConfig.onCancel).toHaveBeenCalledWith()
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })
  })

  describe('auto-focus behavior', () => {
    it('should auto-focus and select text when shown', async () => {
      const config = {
        ...mockConfig,
        initialValue: 500,
        showImmediately: true
      }
      lengthInputService.activate(config)

      render(<LengthInputComponent />)

      const input = screen.getByRole('textbox') as HTMLInputElement

      // Wait for auto-focus to happen
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(document.activeElement).toBe(input)
    })
  })

  describe('blur behavior', () => {
    it('should cancel when input loses focus', async () => {
      const mockConfig = {
        position: { x: 100, y: 100 },
        showImmediately: true,
        onCommit: vi.fn(),
        onCancel: vi.fn()
      }

      lengthInputService.activate(mockConfig)

      render(<LengthInputComponent />)

      const input = screen.getByRole('textbox')

      // Simulate blur event
      fireEvent.blur(input)

      // Should call cancel callback
      expect(mockConfig.onCancel).toHaveBeenCalledTimes(1)

      // Should deactivate the service
      expect(lengthInputService.getState().isActive).toBe(false)
    })
  })
})
