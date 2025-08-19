import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FloorPlanEditor } from '../FloorPlanEditor'
import { useModelStore } from '../../../model/store'

describe('Wall Creation', () => {
  beforeEach(() => {
    // Reset the model store before each test
    useModelStore.getState().reset()
  })

  it('should have wall tool available in toolbar', () => {
    render(<FloorPlanEditor />)
    
    const wallButton = screen.getByText('Wall')
    expect(wallButton).toBeDefined()
    expect(wallButton.tagName).toBe('BUTTON')
  })

  it('should activate wall tool when clicked', () => {
    render(<FloorPlanEditor />)
    
    const wallButton = screen.getByText('Wall')
    fireEvent.click(wallButton)
    
    // Check if the button has the active class
    expect(wallButton.className).toContain('active')
  })

  it('should create sample walls when sample button is clicked', () => {
    render(<FloorPlanEditor />)
    
    const initialWallCount = useModelStore.getState().walls.size
    
    const sampleButton = screen.getByText('Sample')
    fireEvent.click(sampleButton)
    
    const finalWallCount = useModelStore.getState().walls.size
    expect(finalWallCount).toBeGreaterThan(initialWallCount)
    expect(finalWallCount).toBe(4) // Sample creates 4 walls
  })
})