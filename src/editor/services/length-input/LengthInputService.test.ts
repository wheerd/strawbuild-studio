import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LengthInputService } from './LengthInputService'
import type { LengthInputConfig } from './types'

describe('LengthInputService', () => {
  let service: LengthInputService
  let mockConfig: LengthInputConfig

  beforeEach(() => {
    service = new LengthInputService()
    mockConfig = {
      position: { x: 100, y: 200 },
      onCommit: vi.fn(),
      onCancel: vi.fn()
    }
  })

  describe('initial state', () => {
    it('should start inactive', () => {
      const state = service.getState()
      expect(state.isActive).toBe(false)
      expect(state.config).toBe(null)
      expect(state.inputValue).toBe('')
      expect(state.isValid).toBe(true)
    })
  })

  describe('activation and deactivation', () => {
    it('should activate with config but not show immediately by default', () => {
      service.activate(mockConfig)

      const state = service.getState()
      expect(state.isActive).toBe(false) // Not shown immediately by default
      expect(state.config).toBe(mockConfig)
      expect(state.inputValue).toBe('')
      expect(state.isValid).toBe(true)
    })

    it('should show immediately when showImmediately is true', () => {
      const configWithImmediate = { ...mockConfig, showImmediately: true }
      service.activate(configWithImmediate)

      const state = service.getState()
      expect(state.isActive).toBe(true)
      expect(state.config).toBe(configWithImmediate)
    })

    it('should activate with initial value', () => {
      const configWithInitial = {
        ...mockConfig,
        initialValue: 500,
        showImmediately: true
      }

      service.activate(configWithInitial)

      const state = service.getState()
      expect(state.isActive).toBe(true)
      expect(state.inputValue).toBe('0.5m') // formatLength converts 500mm to 0.5m
    })

    it('should deactivate previous config when activating new one', () => {
      service.activate(mockConfig)
      expect(service.getState().isActive).toBe(false) // Not shown immediately by default

      const newConfig = {
        ...mockConfig,
        showImmediately: true
      }
      service.activate(newConfig)

      const state = service.getState()
      expect(state.isActive).toBe(true)
      expect(state.config?.showImmediately).toBe(true)
    })

    it('should deactivate', () => {
      service.activate(mockConfig)
      service.deactivate()

      const state = service.getState()
      expect(state.isActive).toBe(false)
      expect(state.config).toBe(null)
      expect(state.inputValue).toBe('')
    })
  })

  describe('input value updates', () => {
    beforeEach(() => {
      service.activate({ ...mockConfig, showImmediately: true })
    })

    it('should update input value and validate', () => {
      service.updateInputValue('500')

      const state = service.getState()
      expect(state.inputValue).toBe('500')
      expect(state.isValid).toBe(true)
      expect(state.errorMessage).toBeUndefined()
    })

    it('should mark invalid input', () => {
      service.updateInputValue('invalid')

      const state = service.getState()
      expect(state.inputValue).toBe('invalid')
      expect(state.isValid).toBe(false)
      expect(state.errorMessage).toBeDefined()
    })

    it('should not update when inactive', () => {
      service.deactivate()
      service.updateInputValue('500')

      const state = service.getState()
      expect(state.inputValue).toBe('')
    })
  })

  describe('commit and cancel', () => {
    beforeEach(() => {
      service.activate({ ...mockConfig, showImmediately: true })
    })

    it('should commit valid value', () => {
      service.updateInputValue('500')
      service.commit()

      expect(mockConfig.onCommit).toHaveBeenCalledWith(500)
      expect(service.getState().isActive).toBe(false)
    })

    it('should not commit invalid value', () => {
      service.updateInputValue('invalid')
      service.commit()

      expect(mockConfig.onCommit).not.toHaveBeenCalled()
      expect(service.getState().isActive).toBe(true) // Should remain active
    })

    it('should cancel and call onCancel', () => {
      service.cancel()

      expect(mockConfig.onCancel).toHaveBeenCalledWith()
      expect(service.getState().isActive).toBe(false)
    })

    it('should cancel without onCancel callback', () => {
      const configWithoutCancel = {
        ...mockConfig,
        onCancel: undefined
      }
      service.activate(configWithoutCancel)

      expect(() => {
        service.cancel()
      }).not.toThrow()
      expect(service.getState().isActive).toBe(false)
    })

    it('should not commit when inactive', () => {
      service.deactivate()
      service.commit()

      expect(mockConfig.onCommit).not.toHaveBeenCalled()
    })

    it('should not cancel when inactive', () => {
      service.deactivate()
      service.cancel()

      expect(mockConfig.onCancel).not.toHaveBeenCalled()
    })
  })

  describe('keyboard handling', () => {
    beforeEach(() => {
      service.activate({ ...mockConfig, showImmediately: true })
      service.updateInputValue('500')
    })

    it('should handle Enter key to commit', () => {
      const event = new KeyboardEvent('keydown', { key: 'Enter' })
      const preventDefault = vi.spyOn(event, 'preventDefault')

      const handled = service.handleKeyDown(event)

      expect(handled).toBe(true)
      expect(preventDefault).toHaveBeenCalled()
      expect(mockConfig.onCommit).toHaveBeenCalledWith(500)
    })

    it('should handle Escape key to cancel', () => {
      const event = new KeyboardEvent('keydown', { key: 'Escape' })
      const preventDefault = vi.spyOn(event, 'preventDefault')

      const handled = service.handleKeyDown(event)

      expect(handled).toBe(true)
      expect(preventDefault).toHaveBeenCalled()
      expect(mockConfig.onCancel).toHaveBeenCalledWith()
    })

    it('should not handle other keys', () => {
      const event = new KeyboardEvent('keydown', { key: 'a' })

      const handled = service.handleKeyDown(event)

      expect(handled).toBe(false)
    })

    it('should not handle keys when inactive', () => {
      service.deactivate()
      const event = new KeyboardEvent('keydown', { key: 'Enter' })

      const handled = service.handleKeyDown(event)

      expect(handled).toBe(false)
    })
  })

  describe('keyboard capture', () => {
    it('should capture keyboard when active', () => {
      service.activate({ ...mockConfig, showImmediately: true })
      expect(service.shouldCaptureKeyboard()).toBe(true)
    })

    it('should not capture keyboard when inactive', () => {
      expect(service.shouldCaptureKeyboard()).toBe(false)
    })

    it('should not capture keyboard when ready but not shown', () => {
      service.activate(mockConfig) // showImmediately defaults to false
      expect(service.shouldCaptureKeyboard()).toBe(false)
      expect(service.isReady()).toBe(true)
    })
  })

  describe('subscription system', () => {
    it('should notify listeners on state changes', () => {
      const listener = vi.fn()
      const unsubscribe = service.subscribe(listener)

      service.activate(mockConfig)
      expect(listener).toHaveBeenCalledTimes(1)

      // Show the input (this should trigger another notification)
      service.show()
      expect(listener).toHaveBeenCalledTimes(2)

      service.updateInputValue('500')
      expect(listener).toHaveBeenCalledTimes(3)

      service.deactivate()
      expect(listener).toHaveBeenCalledTimes(4)

      unsubscribe()
    })

    it('should unsubscribe listeners', () => {
      const listener = vi.fn()
      const unsubscribe = service.subscribe(listener)

      unsubscribe()

      service.activate(mockConfig)
      expect(listener).not.toHaveBeenCalled()
    })

    it('should handle listener errors gracefully', () => {
      const errorListener = vi.fn(() => {
        throw new Error('Listener error')
      })
      const consoleError = vi.spyOn(console, 'error').mockImplementation(vi.fn())

      service.subscribe(errorListener)

      expect(() => {
        service.activate(mockConfig)
      }).not.toThrow()
      expect(consoleError).toHaveBeenCalledWith('Error in length input listener:', expect.any(Error))

      consoleError.mockRestore()
    })
  })

  describe('initial value formatting', () => {
    it('should format small values with units', () => {
      const config = {
        ...mockConfig,
        initialValue: 23,
        showImmediately: true
      }

      service.activate(config)
      expect(service.getState().inputValue).toBe('23mm')
    })

    it('should format centimeter values', () => {
      const config = {
        ...mockConfig,
        initialValue: 50, // 5cm
        showImmediately: true
      }

      service.activate(config)
      expect(service.getState().inputValue).toBe('5cm')
    })

    it('should format meter values', () => {
      const config = {
        ...mockConfig,
        initialValue: 1500, // 1.5m
        showImmediately: true
      }

      service.activate(config)
      expect(service.getState().inputValue).toBe('1.5m')
    })

    it('should format zero value', () => {
      const config = {
        ...mockConfig,
        initialValue: 0,
        showImmediately: true
      }

      service.activate(config)
      expect(service.getState().inputValue).toBe('0m')
    })
  })

  describe('show and ready states', () => {
    it('should be ready when activated but not shown', () => {
      service.activate(mockConfig)
      expect(service.isReady()).toBe(true)
      expect(service.getState().isActive).toBe(false)
    })

    it('should show when ready and show() is called', () => {
      service.activate(mockConfig)
      service.show()
      expect(service.getState().isActive).toBe(true)
      expect(service.isReady()).toBe(false)
    })

    it('should not be ready when not activated', () => {
      expect(service.isReady()).toBe(false)
    })
  })

  describe('position updates', () => {
    beforeEach(() => {
      service.activate({ ...mockConfig, showImmediately: true })
    })

    it('should update position when active', () => {
      const newPosition = { x: 200, y: 300 }
      service.updatePosition(newPosition)

      const state = service.getState()
      expect(state.config?.position).toEqual(newPosition)
    })

    it('should update position when ready but not shown', () => {
      service.deactivate()
      service.activate(mockConfig) // Ready but not shown

      const newPosition = { x: 150, y: 250 }
      service.updatePosition(newPosition)

      const state = service.getState()
      expect(state.config?.position).toEqual(newPosition)
    })

    it('should not update position when not activated', () => {
      service.deactivate()

      const newPosition = { x: 300, y: 400 }
      service.updatePosition(newPosition)

      const state = service.getState()
      expect(state.config).toBe(null)
    })

    it('should notify listeners when position is updated', () => {
      const listener = vi.fn()
      service.subscribe(listener)

      const newPosition = { x: 250, y: 350 }
      service.updatePosition(newPosition)

      expect(listener).toHaveBeenCalled()
    })
  })
})
