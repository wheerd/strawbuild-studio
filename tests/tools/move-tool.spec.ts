import { expect, test } from '@playwright/test'

import {
  activateTool,
  dragEntityInEditor,
  getEditorSvg,
  getInspector,
  loadTestData,
  pressKey,
  setupEditorPage,
  takeEditorScreenshot
} from '../fixtures/editor'

test.describe('Move Tool', () => {
  test('complete journey: moving all the entities', async ({ page }) => {
    test.setTimeout(120000)
    await setupEditorPage(page)
    await loadTestData(page, '▭ Rectangular Perimeter (8×5m)')

    await pressKey(page, 'Escape') // Clear initial selection
    await pressKey(page, 'F') // Fit to view to ensure entities are visible

    const inspector = getInspector(page)
    const editorSvg = getEditorSvg(page)
    const viewModeToggle = page.getByTestId('viewmode-toggle')

    await takeEditorScreenshot(page, '00-initial-state.png')

    // Step 1: Activate tool and verify inspector is active
    await activateTool(page, 'Move')
    await expect(inspector.getByText(/Drag entities to move them/i)).toBeVisible()

    // Step 2: Move perimeter and reset
    const perimeter = editorSvg.locator('[data-entity-type="perimeter"]').first()
    await dragEntityInEditor(page, perimeter, { dx: 100, dy: 100 })
    await takeEditorScreenshot(page, '01-perimeter-dragging.png')

    await page.mouse.up()
    await takeEditorScreenshot(page, '02-perimeter-new-position.png')

    await pressKey(page, 'F')

    // Step 2: Move wall
    await expect(inspector.getByText(/Drag entities to move them/i)).toBeVisible()
    const wall = editorSvg.locator('[data-entity-type="perimeter-wall"]').first()
    await dragEntityInEditor(page, wall, { dx: 100, dy: -50 })
    await takeEditorScreenshot(page, '03-wall-dragging.png')

    await page.mouse.up()
    await takeEditorScreenshot(page, '04-wall-new-position.png')

    await dragEntityInEditor(page, wall, { dx: 100, dy: 100 })
    await takeEditorScreenshot(page, '05-wall-dragging.png')

    await pressKey(page, 'Escape')
    await takeEditorScreenshot(page, '04-wall-new-position.png')

    await pressKey(page, 'F')

    // Step 3: Move corner
    const corner = editorSvg.locator('[data-entity-type="perimeter-corner"]').first()
    await dragEntityInEditor(page, corner, { dx: -60, dy: -40 })
    await takeEditorScreenshot(page, '06-corner-dragging.png')

    await page.mouse.up()
    await takeEditorScreenshot(page, '07-corner-new-position.png')

    await pressKey(page, 'F')

    // Step 4: Move opening
    const opening = editorSvg.locator('[data-entity-type="opening"]').nth(3)
    const openingWall = editorSvg.locator('[data-entity-type="perimeter-wall"]').nth(1)
    await dragEntityInEditor(page, opening, { dx: 0, dy: -90 })
    await takeEditorScreenshot(page, '08-opening-dragging-snap-wall-end.png')

    await openingWall.hover({ position: { x: 20, y: 150 }, force: true })
    await takeEditorScreenshot(page, '09-opening-dragging-snap-other-opening.png')

    await openingWall.hover({ position: { x: 20, y: 200 }, force: true })
    await takeEditorScreenshot(page, '10-opening-dragging-invalid-other-opening.png')

    await openingWall.hover({ position: { x: 20, y: 60 }, force: true })
    await page.mouse.up()
    await takeEditorScreenshot(page, '11-opening-new-position.png')

    // Step 5: Move wall post
    const wallPost = editorSvg.locator('[data-entity-type="wall-post"]').first()
    const bottomWall = editorSvg.locator('[data-entity-type="perimeter-wall"]').nth(2)
    await dragEntityInEditor(page, wallPost, { dx: -90, dy: 0 })
    await takeEditorScreenshot(page, '12-post-dragging.png')

    await bottomWall.hover({ position: { x: 150, y: 20 }, force: true })
    await takeEditorScreenshot(page, '13-post-dragging-snap-opening.png')

    await bottomWall.hover({ position: { x: 380, y: 20 }, force: true })
    await takeEditorScreenshot(page, '14-post-dragging-invalid-opening.png')

    await bottomWall.hover({ position: { x: 600, y: 20 }, force: true })
    await takeEditorScreenshot(page, '15-post-dragging-corner.png')

    await bottomWall.hover({ position: { x: 200, y: 20 }, force: true })
    await page.mouse.up()
    await takeEditorScreenshot(page, '16-post-new-position.png')

    // Step 6: Move roof
    await viewModeToggle.getByRole('radio', { name: 'Roofs' }).click()
    const roof = editorSvg.locator('[data-entity-type="roof"]').first()
    await dragEntityInEditor(page, roof, { dx: 100, dy: 80 })
    await takeEditorScreenshot(page, '17-roof-dragging.png')

    await page.mouse.up()
    await takeEditorScreenshot(page, '18-roof-new-position.png')

    // Step 7: Move floor opening
    await viewModeToggle.getByRole('radio', { name: 'Floors' }).click()
    const floorOpening = editorSvg.locator('[data-entity-type="floor-opening"]').first()
    await dragEntityInEditor(page, floorOpening, { dx: 200, dy: -80 })
    await takeEditorScreenshot(page, '19-floor-opening-dragging.png')

    const perimeterOutline = editorSvg.locator('[data-entity-type="perimeter"]').first()
    await perimeterOutline.hover({ position: { x: 620, y: 430 }, force: true })
    await takeEditorScreenshot(page, '20-floor-opening-dragging-snap-wall.png')

    await page.mouse.up()
    await takeEditorScreenshot(page, '21-floor-opening-new-position.png')
  })
})
