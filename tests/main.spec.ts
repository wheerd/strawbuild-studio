import { expect, test } from '@playwright/test'
import path from 'node:path'

test('Test Data Screenshot', async ({ page }) => {
  test.setTimeout(60000)
  await page.goto('/')
  await expect(page).toHaveTitle(/StrawBuild/)
  await expect(page.getByText('Important Disclaimer')).toBeVisible({ timeout: 15000 })
  await page.getByRole('button', { name: 'I Understand & Continue' }).click()
  await expect(page.getByTestId('main-toolbar')).toMatchAriaSnapshot(`
    - button "About StrawBuild Studio"
    - button "Project": My Project
    - toolbar:
      - button "Select"
      - button "Move"
      - button "Fit to View"
      - separator
      - button "Building Perimeter"
      - button "Perimeter Presets"
      - button "Add Opening"
      - button "Add Post"
      - button "Split Wall"
      - separator
      - button "Floor Opening"
      - separator
      - button "Roof"
      - separator
      - button "Test Data"
    - button "View Construction Plan"
    - button "View Parts List"
    - button "View 3D Construction"
    - button "Configuration"
    - button "Account"
    `)
  await page.getByRole('button', { name: 'Test Data' }).click()
  await page.getByRole('button', { name: /Cross\/T-Shape Perimeter/ }).click()
  await expect(page.getByTestId('editor-svg')).toHaveScreenshot({
    animations: 'disabled',
    scale: 'css',
    stylePath: path.resolve(import.meta.dirname, 'hide-overlays.css')
  })
})
