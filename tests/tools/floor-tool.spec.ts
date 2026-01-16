import { expect, test } from '@playwright/test'

import {
  activateTool,
  clickEditorAt,
  moveMouseTo,
  pressKey,
  setupEditorPage,
  takeEditorScreenshot
} from '../fixtures/editor'

test.describe('Floor Opening Tool', () => {
  test('complete journey: activate, draw, invalid position, cancel, restart, complete', async ({ page }) => {
    test.setTimeout(120000)

    // Setup: Load rectangular perimeter test data
    await setupEditorPage(page)

    // Step 1: Activate tool and verify inspector
    await activateTool(page, 'Floor Opening')
    await expect(page.getByText('Floor Opening')).toBeVisible()

    // Step 2: First point - start drawing floor opening
    await clickEditorAt(page, 350, 380)
    await takeEditorScreenshot(page, '01-first-point.png')

    // Step 3: Second point
    await clickEditorAt(page, 500, 380)
    await takeEditorScreenshot(page, '02-second-point.png')

    // Step 4: Third point - creating L-shape
    await clickEditorAt(page, 500, 280)
    await takeEditorScreenshot(page, '03-third-point.png')

    // Step 5: Hover at invalid position (would create self-intersection)
    // Moving to (400, 420) creates a line from (500, 280) that crosses
    // the first horizontal segment from (350, 380) to (500, 380)
    // This should show a red preview line
    await moveMouseTo(page, 400, 420)
    await takeEditorScreenshot(page, '04-invalid-position.png')

    // Step 6: Cancel drawing with Escape
    await pressKey(page, 'Escape')
    await takeEditorScreenshot(page, '05-cancelled.png')

    // Step 7: Restart - click to begin a new polygon
    await clickEditorAt(page, 360, 370)
    await takeEditorScreenshot(page, '06-restarted.png')

    // Step 8-9: Draw a valid rectangular polygon
    await clickEditorAt(page, 490, 370)
    await clickEditorAt(page, 490, 290)
    await clickEditorAt(page, 360, 290)

    // Step 10: Hover near first point to show green closing line
    await moveMouseTo(page, 365, 365)
    await takeEditorScreenshot(page, '07-near-close.png')

    // Step 11: Complete polygon by clicking near first point
    await clickEditorAt(page, 365, 365)
    await takeEditorScreenshot(page, '08-completed.png')
  })
})
