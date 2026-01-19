import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'

import App from './App'

vi.mock('next-themes', () => ({
  useTheme: vi.fn().mockReturnValue({ resolvedTheme: 'light' })
}))

vi.mock('@/editor/FloorPlanEditor', () => ({
  FloorPlanEditor: () => (
    <div data-testid="floor-plan-editor">
      <div data-testid="main-toolbar" />
    </div>
  )
}))

test('renders loading state initially', () => {
  render(<App />)

  const skeletonElement = screen.getByTestId('app-skeleton')
  expect(skeletonElement).toBeInTheDocument()
})

test('renders floor plan editor after loading', async () => {
  render(<App />)

  // Wait for the floor plan editor to load
  await waitFor(
    () => {
      const editorElement = screen.getByTestId('floor-plan-editor')
      expect(editorElement).toBeInTheDocument()
    },
    { timeout: 1000 }
  )
}, 1500)

test('renders toolbar with select tool after loading', async () => {
  render(<App />)

  // Wait for the toolbar to load
  await waitFor(
    () => {
      const toolbarElement = screen.getByTestId('main-toolbar')
      expect(toolbarElement).toBeInTheDocument()
    },
    { timeout: 10000 }
  )
})
