import { expect, test } from '@playwright/test'
import {
  activateTool,
  clickEditorAt,
  dragInEditor,
  loadTestData,
  moveMouseTo,
  setupEditorPage,
  takeEditorScreenshot
} from '../fixtures/editor'

test.describe('Move Tool', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000)
    await setupEditorPage(page)

    // Load test data with geometry to move
    await loadTestData(page, '▭ Rectangular Perimeter (8×5m)')
  })

  test('activates from toolbar', async ({ page }) => {
    await activateTool(page, 'Move')

    // Verify move tool is active (has solid variant class)
    const moveButton = page.getByRole('button', { name: 'Move' })
    await expect(moveButton).toHaveClass(/rt-variant-solid/)
  })

  test('shows move cursor when active', async ({ page }) => {
    await activateTool(page, 'Move')

    // Hover over geometry
    await moveMouseTo(page, 425, 350)

    // Screenshot showing move cursor state
    await takeEditorScreenshot(page, 'move-cursor.png')
  })

  test('shows drag preview during move', async ({ page }) => {
    // First select an entity with select tool
    await activateTool(page, 'Select')
    await clickEditorAt(page, 425, 350)

    // Switch to move tool
    await activateTool(page, 'Move')

    // Start dragging (manually control mouse for drag preview)
    const svg = page.getByTestId('editor-svg')
    const box = await svg.boundingBox()
    if (!box) throw new Error('Could not get SVG bounding box')

    await page.mouse.move(box.x + 425, box.y + 350)
    await page.mouse.down()
    await page.mouse.move(box.x + 500, box.y + 300)

    // Screenshot showing drag preview (mid-drag)
    await takeEditorScreenshot(page, 'move-dragging.png')

    await page.mouse.up()
  })

  test('completes move on drag end', async ({ page }) => {
    // First select an entity with select tool
    await activateTool(page, 'Select')
    await clickEditorAt(page, 425, 350)

    // Switch to move tool
    await activateTool(page, 'Move')

    // Complete a drag operation
    await dragInEditor(page, { x: 425, y: 350 }, { x: 450, y: 320 })

    // Screenshot showing moved geometry
    await takeEditorScreenshot(page, 'move-completed.png')
  })

  test('can move without prior selection', async ({ page }) => {
    await activateTool(page, 'Move')

    // Drag directly on geometry
    await dragInEditor(page, { x: 425, y: 350 }, { x: 480, y: 350 })

    // Screenshot showing result
    await takeEditorScreenshot(page, 'move-direct-drag.png')
  })
})
