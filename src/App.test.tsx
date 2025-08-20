import { render, screen, waitFor } from '@testing-library/react'
import App from '@/App'

test('renders loading state initially', () => {
  render(<App />)
  const loadingElement = screen.getByText(/Loading Floor Plan Editor.../i)
  expect(loadingElement).toBeInTheDocument()
})

test('renders floor plan editor after loading', async () => {
  render(<App />)

  // Wait for the lazy component to load
  await waitFor(() => {
    const floorPlanElement = screen.getByText(/Ground Floor/i)
    expect(floorPlanElement).toBeInTheDocument()
  }, { timeout: 5000 })
})

test('renders toolbar with select tool after loading', async () => {
  render(<App />)

  // Wait for the lazy component to load
  await waitFor(() => {
    const selectTool = screen.getByText(/Select/i)
    expect(selectTool).toBeInTheDocument()
  }, { timeout: 5000 })
})
