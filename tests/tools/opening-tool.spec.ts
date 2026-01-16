import { expect, test } from '@playwright/test'

import {
  activateTool,
  clickEditorAt,
  getInspector,
  moveMouseTo,
  setupEditorPage,
  takeEditorScreenshot
} from '../fixtures/editor'

test.describe('Add Opening Tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.evaluate('document.fonts.ready')
  })

  test('complete journey: presets, snapping, invalid position, place openings', async ({ page }) => {
    test.setTimeout(180000)

    // Setup: Fresh editor
    await setupEditorPage(page)

    // Step 1: Create rectangular perimeter using preset tool
    await activateTool(page, 'Perimeter Presets')
    await page.getByRole('button', { name: 'Rectangular Perimeter' }).click()

    // Dialog appears - use default dimensions and confirm (auto-places at origin)
    await page.getByRole('button', { name: 'Confirm' }).click()

    // Step 2: Activate Add Opening tool
    await activateTool(page, 'Add Opening')
    const inspector = getInspector(page)
    // Verify tool is active by checking for opening presets section
    await expect(inspector.getByText('Presets')).toBeVisible()

    // Step 3: Screenshot inspector with Standard Door preset (default)
    await expect(inspector).toHaveScreenshot('01-inspector-door-preset.png')

    // Step 4: Select Small Window preset and screenshot
    await inspector.getByRole('button', { name: 'Small Window' }).click()
    await expect(inspector).toHaveScreenshot('02-inspector-small-window-preset.png')

    // Step 5: Select Floor Window preset and screenshot
    await inspector.getByRole('button', { name: 'Floor Window' }).click()
    await expect(inspector).toHaveScreenshot('03-inspector-floor-window-preset.png')

    // Step 6: Place first opening (Floor Window)
    // Hover near the end of the bottom wall to show snapping to wall end
    await moveMouseTo(page, 160, 80)
    await takeEditorScreenshot(page, '04-snap-to-wall-end.png')

    // Place the opening
    await clickEditorAt(page, 400, 80)
    await takeEditorScreenshot(page, '05-first-opening-placed.png')

    // Step 7: Select Small Window for second opening
    await inspector.getByRole('button', { name: 'Small Window' }).click()

    // Step 8: Hover next to the existing opening to show snapping
    await moveMouseTo(page, 450, 80)
    await takeEditorScreenshot(page, '06-snap-to-existing-opening.png')

    // Step 9: Hover over the middle of the existing opening to show invalid state (red)
    await moveMouseTo(page, 400, 80)
    await takeEditorScreenshot(page, '07-invalid-overlap.png')

    // Step 10: Move to valid position and place second opening
    await clickEditorAt(page, 480, 80)
    await takeEditorScreenshot(page, '08-second-opening-placed.png')

    // Step 11: Select Standard Door preset
    await inspector.getByRole('button', { name: 'Standard Door' }).click()

    // Step 12: Hover on left wall to show door preview before placing
    await moveMouseTo(page, 140, 300)
    await takeEditorScreenshot(page, '09-door-hover-preview.png')

    // Step 13: Place the door
    await clickEditorAt(page, 140, 300)
    await takeEditorScreenshot(page, '10-door-placed.png')
  })
})
