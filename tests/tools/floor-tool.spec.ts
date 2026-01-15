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

test.describe('Floor Opening Tool', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000)
    await setupEditorPage(page)

    // Load test data with perimeter for floor operations
    await loadTestData(page, '▭ Rectangular Perimeter (8×5m)')
    await pressKey(page, 'Escape')
  })

  test('activates from toolbar', async ({ page }) => {
    await activateTool(page, 'Floor Opening')

    // Verify tool is active
    await expect(page.getByText('Floor Opening')).toBeVisible()
  })

  test('shows overlay when drawing floor opening', async ({ page }) => {
    await activateTool(page, 'Floor Opening')

    // Click to place first point inside perimeter
    await clickEditorAt(page, 350, 350)

    // Move to show preview line
    await moveMouseTo(page, 500, 350)

    // Screenshot showing floor opening tool overlay
    await takeEditorScreenshot(page, 'floor-opening-first-point.png')
  })

  test('draws floor opening polygon with multiple points', async ({ page }) => {
    await activateTool(page, 'Floor Opening')

    // Draw polygon inside perimeter
    await clickEditorAt(page, 350, 380)
    await clickEditorAt(page, 500, 380)
    await clickEditorAt(page, 500, 280)

    // Move to show preview
    await moveMouseTo(page, 350, 280)

    // Screenshot showing multi-point floor opening polygon
    await takeEditorScreenshot(page, 'floor-opening-polygon.png')
  })

  test('shows closing indicator near first point', async ({ page }) => {
    await activateTool(page, 'Floor Opening')

    // Draw floor opening polygon
    await clickEditorAt(page, 350, 380)
    await clickEditorAt(page, 500, 380)
    await clickEditorAt(page, 500, 280)
    await clickEditorAt(page, 350, 280)

    // Move near first point
    await moveMouseTo(page, 355, 375)

    // Screenshot showing closing indicator
    await takeEditorScreenshot(page, 'floor-opening-closing.png')
  })

  test('completes floor opening on close', async ({ page }) => {
    await activateTool(page, 'Floor Opening')

    // Draw and close floor opening polygon
    await clickEditorAt(page, 350, 380)
    await clickEditorAt(page, 500, 380)
    await clickEditorAt(page, 500, 280)
    await clickEditorAt(page, 350, 280)

    // Click near first point to close
    await clickEditorAt(page, 355, 375)

    // Screenshot showing completed floor opening
    await takeEditorScreenshot(page, 'floor-opening-completed.png')
  })

  test('cancels drawing with Escape', async ({ page }) => {
    await activateTool(page, 'Floor Opening')

    // Start drawing
    await clickEditorAt(page, 350, 350)
    await clickEditorAt(page, 500, 350)

    // Cancel with Escape
    await pressKey(page, 'Escape')

    // Screenshot showing cancelled state
    await takeEditorScreenshot(page, 'floor-opening-cancelled.png')
  })
})
