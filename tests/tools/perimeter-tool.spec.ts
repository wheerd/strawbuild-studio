import { expect, test } from '@playwright/test'

import {
  activateTool,
  clickEditorAt,
  getInspector,
  moveMouseTo,
  pressKey,
  setupEditorPage,
  takeEditorScreenshot
} from '../fixtures/editor'

test.describe('Perimeter Tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.evaluate('document.fonts.ready')
  })

  test('complete journey: draw, snap, invalid, cancel, change params, complete, verify', async ({ page }) => {
    test.setTimeout(180000)

    // Setup: Fresh editor
    await setupEditorPage(page)

    // Step 1: Activate tool and verify inspector shows default values
    await activateTool(page, 'Building Perimeter')
    await expect(page.getByText('Building Perimeter')).toBeVisible()

    // Verify default values in inspector
    const inspector = getInspector(page)
    await expect(inspector.getByText('Wall Thickness')).toBeVisible()
    // Reference side defaults to Inside
    await expect(inspector.getByRole('radio', { name: 'Inside' })).toBeChecked()

    // Step 2: First point
    await clickEditorAt(page, 300, 400)
    await takeEditorScreenshot(page, '01-first-point.png')

    // Step 3: Second point with wall preview
    await clickEditorAt(page, 550, 400)
    await moveMouseTo(page, 550, 250)
    await takeEditorScreenshot(page, '02-wall-preview.png')

    // Step 4: Snapping test - hover near perpendicular position
    // The snapping should show guides when near 90-degree angle
    await moveMouseTo(page, 548, 250) // Slightly off perpendicular to trigger snap
    await takeEditorScreenshot(page, '03-snap-to-perpendicular.png')

    // Step 5: Click third point (snapped to perpendicular)
    await clickEditorAt(page, 550, 250)
    await takeEditorScreenshot(page, '04-l-shape.png')

    // Step 6: Invalid hover - move to position that would create self-intersection
    // Line from (550, 250) crossing the first segment (300, 400) to (550, 400)
    await moveMouseTo(page, 400, 450)
    await takeEditorScreenshot(page, '05-invalid-position.png')

    // Step 7: Cancel drawing
    await pressKey(page, 'Escape')
    await takeEditorScreenshot(page, '06-cancelled.png')

    // Step 8: Change parameters in inspector
    // Switch reference side to "Outside"
    await inspector.getByRole('radio', { name: 'Outside' }).click()
    await expect(inspector.getByRole('radio', { name: 'Outside' })).toBeChecked()

    // Change wall thickness to 200mm
    const thicknessInput = inspector.locator('#wall-thickness')
    await thicknessInput.fill('200')
    await thicknessInput.press('Enter')

    // Change wall assembly to Strawhenge
    await inspector.getByRole('combobox').first().click()
    await page.getByRole('option', { name: 'Strawhenge' }).click()

    // Step 9: Restart drawing with new parameters
    await clickEditorAt(page, 300, 400)
    await takeEditorScreenshot(page, '07-restarted-outside-ref.png')

    // Step 10: Show offset difference with outside reference
    await clickEditorAt(page, 550, 400)
    await moveMouseTo(page, 550, 250)
    await takeEditorScreenshot(page, '08-outside-ref-preview.png')

    // Step 11-12: Draw remaining points for rectangle
    await clickEditorAt(page, 550, 200)
    await clickEditorAt(page, 300, 200)

    // Step 13: Near close - hover near first point to show green closing line
    await moveMouseTo(page, 305, 395)
    await takeEditorScreenshot(page, '09-near-close.png')

    // Step 14: Complete polygon
    await clickEditorAt(page, 305, 395)
    await takeEditorScreenshot(page, '10-completed.png')

    // Step 15: Select and verify - switch to Select tool
    await activateTool(page, 'Select')

    // Click on a wall segment to select the perimeter
    await clickEditorAt(page, 425, 400)

    // Verify inspector shows wall properties (wall inspector, not perimeter inspector)
    // Note: Reference side is perimeter-level, not wall-level, so we can't check it here
    // The wall inspector uses #perimeter-thickness for the thickness field
    await expect(inspector.locator('#perimeter-thickness')).toHaveValue('20') // 200mm = 20cm

    // Verify wall assembly shows Strawhenge
    await expect(inspector.getByText('Strawhenge')).toBeVisible()

    // await expect(inspector).toHaveScreenshot('11-selected-inspector.png')
  })
})
