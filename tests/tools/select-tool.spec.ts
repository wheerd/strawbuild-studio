import { expect, test } from '@playwright/test'

import {
  getEditorSvg,
  getInspector,
  loadTestData,
  pressKey,
  setupEditorPage,
  takeEditorScreenshot
} from '../fixtures/editor'

test.describe('Select Tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.evaluate('document.fonts.ready')
  })

  test('complete journey: selection drill-down, inspectors, fit-to-view across view modes', async ({ page }) => {
    test.setTimeout(120000)
    await setupEditorPage(page)
    await loadTestData(page, '▭ Rectangular Perimeter (8×5m)')
    await pressKey(page, 'Escape') // Clear initial selection
    await pressKey(page, 'F') // Fit to view to ensure entities are visible

    const inspector = getInspector(page)
    const editorSvg = getEditorSvg(page)
    const viewModeToggle = page.getByTestId('viewmode-toggle')

    // Helper to click fit-to-view and take screenshot
    async function fitToViewAndScreenshot(name: string) {
      await inspector.getByRole('button', { name: /fit to view/i }).click()
      await takeEditorScreenshot(page, name)
      await pressKey(page, 'F') // Reset view
    }

    // === PHASE 1: Wall Mode - Opening drill-down ===

    // Click on an opening - first click selects perimeter
    await editorSvg.locator('[data-entity-type="opening"]').first().click()
    // await expect(inspector).toHaveScreenshot('01-perimeter-inspector.png')
    await fitToViewAndScreenshot('02-perimeter-fit-to-view.png')

    // Click again - selects wall
    await editorSvg.locator('[data-entity-type="opening"]').first().click()
    // await expect(inspector).toHaveScreenshot('03-wall-inspector.png')
    await fitToViewAndScreenshot('04-wall-fit-to-view.png')

    // Click again - selects opening
    await editorSvg.locator('[data-entity-type="opening"]').first().click()
    // await expect(inspector).toHaveScreenshot('05-opening-inspector.png')
    await fitToViewAndScreenshot('06-opening-fit-to-view.png')

    // === PHASE 2: Opening - ClickableLengthIndicator interaction ===

    // Hover over a length indicator (the SVG g element with cursor: pointer style)
    const lengthIndicator = editorSvg.getByTestId('clickable-length-indicator').first()
    await lengthIndicator.hover()
    await takeEditorScreenshot(page, '07-opening-length-hover.png')

    // Click the length indicator to open the input
    await lengthIndicator.click()
    await takeEditorScreenshot(page, '08-opening-length-input.png')

    // Type a new value and press Enter
    const lengthInput = page.getByPlaceholder('Enter distance...')
    await lengthInput.fill('1.5m')
    await lengthInput.press('Enter')
    await takeEditorScreenshot(page, '09-opening-moved.png')

    // === PHASE 3: Corner Selection ===

    // Click on a corner - selects corner
    await editorSvg.locator('[data-entity-type="perimeter-corner"]').first().click()
    // await expect(inspector).toHaveScreenshot('10-corner-inspector.png')
    await fitToViewAndScreenshot('11-corner-fit-to-view.png')

    // Click "Switch main wall" button and screenshot
    const switchMainWallButton = inspector.getByRole('button', { name: /switch main wall/i })
    await expect(switchMainWallButton).toBeEnabled()
    await switchMainWallButton.click()
    await takeEditorScreenshot(page, '12-corner-switched.png')

    // === PHASE 4: Wall Post Selection ===

    // Click on wall post 2 times to drill down (already same perimeter so first click selects wall)
    await editorSvg.locator('[data-entity-type="wall-post"]').first().click()
    await editorSvg.locator('[data-entity-type="wall-post"]').first().click()
    await expect(inspector).toHaveText(/post material/i)
    // await expect(inspector).toHaveScreenshot('13-wall-post-inspector.png')
    await fitToViewAndScreenshot('14-wall-post-fit-to-view.png')

    // === PHASE 5: Roof Mode ===

    await viewModeToggle.getByRole('radio', { name: 'Roofs' }).click()
    await editorSvg.locator('[data-entity-type="roof"]').first().click()
    // await expect(inspector).toHaveScreenshot('15-roof-inspector.png')
    await fitToViewAndScreenshot('16-roof-fit-to-view.png')

    // Click on roof overhang to drill down
    await editorSvg.locator('[data-entity-type="roof-overhang"]').first().click()
    // await expect(inspector).toHaveScreenshot('17-roof-overhang-inspector.png')
    await fitToViewAndScreenshot('18-roof-overhang-fit-to-view.png')

    // === PHASE 7: Floor Mode ===

    await viewModeToggle.getByRole('radio', { name: 'Floors' }).click()
    await editorSvg.locator('[data-entity-type="floor-opening"]').first().click()
    // await expect(inspector).toHaveScreenshot('19-floor-opening-inspector.png')
    await inspector.getByRole('button', { name: /fit to view/i }).click()
    await takeEditorScreenshot(page, '20-floor-opening-fit-to-view.png')

    // === PHASE 8: Storey Inspector ===

    await editorSvg.click({ position: { x: 1, y: 1 } })
    await expect(inspector).toHaveText(/Ground Floor/i)
    // await expect(inspector).toHaveScreenshot('21-storey-inspector.png')
  })
})
