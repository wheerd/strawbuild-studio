import { type Locator, type Page, expect } from '@playwright/test'
import path from 'node:path'

/**
 * Set up the editor page for testing - navigates to the app and dismisses the welcome modal
 */
export async function setupEditorPage(page: Page): Promise<void> {
  // Set localStorage before navigation to avoid reload
  await page.addInitScript(() => {
    localStorage.setItem(
      'strawbaler-welcome-state',
      '{"accepted":true,"acceptedAt":"2025-10-22T06:21:42.893Z","version":"0.2"}'
    )
  })

  await page.goto('/')

  // Wait for the editor to be ready
  await expect(page.getByTestId('main-toolbar')).toBeVisible({ timeout: 15000 })
  await expect(page.getByTestId('editor-svg')).toBeVisible()
}

/**
 * Get the editor SVG element
 */
export function getEditorSvg(page: Page): Locator {
  return page.getByTestId('editor-svg')
}

/**
 * Click at a position in the editor SVG
 */
export async function clickEditorAt(page: Page, x: number, y: number): Promise<void> {
  await getEditorSvg(page).click({ position: { x, y } })
}

/**
 * Double-click at a position in the editor SVG
 */
export async function doubleClickEditorAt(page: Page, x: number, y: number): Promise<void> {
  await getEditorSvg(page).dblclick({ position: { x, y } })
}

/**
 * Move the mouse to a position in the editor SVG
 */
export async function moveMouseTo(page: Page, x: number, y: number): Promise<void> {
  await getEditorSvg(page).hover({ position: { x, y } })
}

/**
 * Activate a tool by clicking its toolbar button
 */
export async function activateTool(
  page: Page,
  toolName:
    | 'Select'
    | 'Move'
    | 'Fit to View'
    | 'Building Perimeter'
    | 'Perimeter Presets'
    | 'Add Opening'
    | 'Split Wall'
    | 'Floor Opening'
    | 'Roof'
    | 'Test Data'
): Promise<void> {
  await page.getByRole('button', { name: toolName }).click()
}

/**
 * Load test data from the test data tool
 */
export async function loadTestData(
  page: Page,
  presetName: string
): Promise<void> {
  await activateTool(page, 'Test Data')
  await page.getByRole('button', { name: presetName }).click()
}

/**
 * Take a screenshot of the editor SVG area
 * Uses the hide-overlays.css to remove UI chrome
 */
export async function takeEditorScreenshot(
  page: Page,
  name: string
): Promise<void> {
  await expect(getEditorSvg(page)).toHaveScreenshot(name, {
    animations: 'disabled',
    scale: 'css',
    stylePath: path.resolve(import.meta.dirname, '../hide-overlays.css')
  })
}

/**
 * Press a key on the editor
 */
export async function pressKey(page: Page, key: string): Promise<void> {
  await getEditorSvg(page).press(key)
}

/**
 * Drag from one position to another in the editor SVG
 */
export async function dragInEditor(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number }
): Promise<void> {
  const svg = getEditorSvg(page)
  const box = await svg.boundingBox()
  if (!box) throw new Error('Could not get SVG bounding box')

  await page.mouse.move(box.x + from.x, box.y + from.y)
  await page.mouse.down()
  await page.mouse.move(box.x + to.x, box.y + to.y)
  await page.mouse.up()
}

/**
 * Get the inspector panel (sidebar)
 */
export function getInspector(page: Page): Locator {
  return page.getByTestId('inspector')
}
