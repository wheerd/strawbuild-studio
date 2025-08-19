import { render, screen } from '@testing-library/react'
import App from './App'

test('renders floor plan editor', () => {
  render(<App />)
  const floorPlanElement = screen.getByText(/Ground Floor/i)
  expect(floorPlanElement).toBeInTheDocument()
})

test('renders toolbar with select tool', () => {
  render(<App />)
  const selectTool = screen.getByText(/Select/i)
  expect(selectTool).toBeInTheDocument()
})
