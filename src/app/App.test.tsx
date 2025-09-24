import { render, screen, waitFor } from '@testing-library/react'
import App from './App'
import { Theme } from '@radix-ui/themes'

test('renders loading state initially', () => {
  render(
    <Theme>
      <App />
    </Theme>
  )
  const loadingElement = screen.getByText(/Loading Floor Plan Editor.../i)
  expect(loadingElement).toBeInTheDocument()
})

test('renders floor plan editor after loading', async () => {
  render(
    <Theme>
      <App />
    </Theme>
  )

  // Wait for the floor plan editor to load
  await waitFor(
    () => {
      const editorElement = screen.getByTestId('floor-plan-editor')
      expect(editorElement).toBeInTheDocument()
    },
    { timeout: 10000 }
  )
})

test('renders toolbar with select tool after loading', async () => {
  render(
    <Theme>
      <App />
    </Theme>
  )

  // Wait for the toolbar to load
  await waitFor(
    () => {
      const toolbarElement = screen.getByTestId('main-toolbar')
      expect(toolbarElement).toBeInTheDocument()
    },
    { timeout: 10000 }
  )
})
