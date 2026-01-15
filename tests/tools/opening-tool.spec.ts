import { expect, test } from '@playwright/test'
import {
  activateTool,
  clickEditorAt,
  loadTestData,
  moveMouseTo,
  pressKey,
  setupEditorPage,
  takeEditorScreenshot
} from '../fixtures/editor'

test.describe('Add Opening Tool', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000)
    await setupEditorPage(page)

    // Load test data with perimeter for opening operations
    await loadTestData(page, '▭ Rectangular Perimeter (8×5m)')
  })

  test('activates from toolbar', async ({ page }) => {
    await activateTool(page, 'Add Opening')

    // Verify tool is active (has solid variant class)
    const openingButton = page.getByRole('button', { name: 'Add Opening' })
    await expect(openingButton).toHaveClass(/rt-variant-solid/)
  })

  test('shows preview when hovering over wall', async ({ page }) => {
    await activateTool(page, 'Add Opening')

    // Hover over a wall segment
    await moveMouseTo(page, 425, 400)

    // Screenshot showing opening preview on hover
    await takeEditorScreenshot(page, 'opening-hover-preview.png')
  })

  test('shows opening dimensions preview', async ({ page }) => {
    await activateTool(page, 'Add Opening')

    // Hover over a wall to show dimension preview
    await moveMouseTo(page, 450, 400)

    // Screenshot showing dimension annotations
    await takeEditorScreenshot(page, 'opening-dimensions.png')
  })

  test('places opening on click', async ({ page }) => {
    await activateTool(page, 'Add Opening')

    // Click on a wall to place opening
    await clickEditorAt(page, 425, 400)

    // Screenshot showing placed opening
    await takeEditorScreenshot(page, 'opening-placed.png')
  })

  test('can place multiple openings', async ({ page }) => {
    await activateTool(page, 'Add Opening')

    // Place first opening on bottom wall
    await clickEditorAt(page, 400, 400)

    // Place second opening on right wall
    await clickEditorAt(page, 550, 325)

    // Screenshot showing multiple openings
    await takeEditorScreenshot(page, 'opening-multiple.png')
  })

  test('opening preview follows mouse along wall', async ({ page }) => {
    await activateTool(page, 'Add Opening')

    // Move along the bottom wall
    await moveMouseTo(page, 350, 400)
    await takeEditorScreenshot(page, 'opening-follow-left.png')

    await moveMouseTo(page, 500, 400)
    await takeEditorScreenshot(page, 'opening-follow-right.png')
  })

  test('deactivates with Escape', async ({ page }) => {
    await activateTool(page, 'Add Opening')

    // Press Escape to deactivate
    await pressKey(page, 'Escape')

    // Verify select tool becomes active (has solid variant class)
    const selectButton = page.getByRole('button', { name: 'Select' })
    await expect(selectButton).toHaveClass(/rt-variant-solid/)
  })
})
