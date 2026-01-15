import { expect, test } from '@playwright/test'
import {
  activateTool,
  clickEditorAt,
  moveMouseTo,
  pressKey,
  setupEditorPage,
  takeEditorScreenshot
} from '../fixtures/editor'

test.describe('Perimeter Tool', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000)
    await setupEditorPage(page)
  })

  test('activates from toolbar', async ({ page }) => {
    await activateTool(page, 'Building Perimeter')

    // Verify tool is active by checking inspector shows perimeter tool content
    await expect(page.getByText('Building Perimeter')).toBeVisible()
  })

  test('draws first segment with wall thickness preview', async ({ page }) => {
    await activateTool(page, 'Building Perimeter')

    // Click to place first point
    await clickEditorAt(page, 300, 300)

    // Move mouse to show preview line
    await moveMouseTo(page, 500, 300)

    // Screenshot showing wall thickness offset preview
    await takeEditorScreenshot(page, 'perimeter-first-segment.png')
  })

  test('draws L-shape showing offset polygon', async ({ page }) => {
    await activateTool(page, 'Building Perimeter')

    // Draw L-shape
    await clickEditorAt(page, 300, 400)
    await clickEditorAt(page, 500, 400)
    await clickEditorAt(page, 500, 250)

    // Move to show preview
    await moveMouseTo(page, 350, 250)

    // Screenshot showing multi-segment offset polygon
    await takeEditorScreenshot(page, 'perimeter-l-shape.png')
  })

  test('shows closing indicator near first point', async ({ page }) => {
    await activateTool(page, 'Building Perimeter')

    // Draw rectangle shape
    await clickEditorAt(page, 300, 400)
    await clickEditorAt(page, 550, 400)
    await clickEditorAt(page, 550, 200)
    await clickEditorAt(page, 300, 200)

    // Move near first point to show closing indicator
    await moveMouseTo(page, 305, 395)

    // Screenshot showing closing indicator
    await takeEditorScreenshot(page, 'perimeter-closing.png')
  })

  test('completes polygon on close', async ({ page }) => {
    await activateTool(page, 'Building Perimeter')

    // Draw and close rectangle
    await clickEditorAt(page, 300, 400)
    await clickEditorAt(page, 550, 400)
    await clickEditorAt(page, 550, 200)
    await clickEditorAt(page, 300, 200)

    // Click near first point to close
    await clickEditorAt(page, 305, 395)

    // Screenshot showing completed perimeter
    await takeEditorScreenshot(page, 'perimeter-completed.png')
  })

  test('cancels drawing with Escape', async ({ page }) => {
    await activateTool(page, 'Building Perimeter')

    // Start drawing
    await clickEditorAt(page, 300, 300)
    await clickEditorAt(page, 500, 300)

    // Cancel with Escape
    await pressKey(page, 'Escape')

    // Screenshot showing cancelled state (no perimeter)
    await takeEditorScreenshot(page, 'perimeter-cancelled.png')
  })
})
