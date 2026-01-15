import { expect, test } from '@playwright/test'
import {
  activateTool,
  clickEditorAt,
  getEditorSvg,
  loadTestData,
  setupEditorPage,
  takeEditorScreenshot
} from '../fixtures/editor'

test.describe('Select Tool', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000)
    await setupEditorPage(page)

    // Load test data with geometry to select
    await loadTestData(page, '▭ Rectangular Perimeter (8×5m)')

    // Ensure select tool is active (it's the default)
    await activateTool(page, 'Select')
  })

  test('is active by default', async ({ page }) => {
    // Select tool should be the default active tool
    const selectButton = page.getByRole('button', { name: 'Select' })
    await expect(selectButton).toHaveClass(/rt-variant-solid/)
  })

  test('activates from toolbar', async ({ page }) => {
    // First switch to another tool
    await activateTool(page, 'Move')

    // Then switch back to select
    await activateTool(page, 'Select')

    // Verify select is active (has solid variant class)
    const selectButton = page.getByRole('button', { name: 'Select' })
    await expect(selectButton).toHaveClass(/rt-variant-solid/)
  })

  test('selects wall on click', async ({ page }) => {
    // Click on a wall segment (center of the rectangular perimeter)
    await clickEditorAt(page, 425, 350)

    // Screenshot showing selection highlight
    await takeEditorScreenshot(page, 'select-wall-selected.png')
  })

  test('shows selection overlay for selected entity', async ({ page }) => {
    // Click to select a wall
    await clickEditorAt(page, 425, 400)

    // Verify selection overlay is visible (use first() since there may be multiple overlay groups)
    await expect(getEditorSvg(page).locator('[data-layer="selection-overlay"]').first()).toBeVisible()

    // Screenshot showing selection overlay
    await takeEditorScreenshot(page, 'select-overlay-visible.png')
  })

  test('deselects on click elsewhere', async ({ page }) => {
    // First select a wall
    await clickEditorAt(page, 425, 350)

    // Then click on empty area
    await clickEditorAt(page, 200, 200)

    // Screenshot showing deselected state
    await takeEditorScreenshot(page, 'select-deselected.png')
  })

  test('can select different entity types', async ({ page }) => {
    // Click on top wall
    await clickEditorAt(page, 425, 250)
    await takeEditorScreenshot(page, 'select-top-wall.png')

    // Click on side wall
    await clickEditorAt(page, 550, 325)
    await takeEditorScreenshot(page, 'select-side-wall.png')
  })
})
