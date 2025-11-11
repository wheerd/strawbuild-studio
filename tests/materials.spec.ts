import { type Locator, type Page, expect, test } from '@playwright/test'

async function openMaterialsConfig(page: Page): Promise<Locator> {
  await page.goto('/')

  await page.evaluate(() => {
    localStorage.setItem(
      'strawbaler-welcome-state',
      '{"accepted":true,"acceptedAt":"2025-10-22T06:21:42.893Z","version":"1.0"}'
    )
  })
  await expect(page.getByTestId('main-toolbar')).toBeVisible()
  await page.getByRole('button', { name: 'Configuration' }).click()
  const dialog = page.getByRole('dialog', { name: 'Configuration' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('tab', { name: 'Materials' }).click()
  return dialog
}

async function addMaterialOfType(dialog: Locator, typeLabel: string) {
  await dialog.getByRole('button', { name: 'Add New' }).click()
  await dialog.page().getByRole('menuitem', { name: typeLabel }).click()
}

test('materials configuration journey', async ({ page }) => {
  const dialog = await openMaterialsConfig(page)
  const nameField = dialog.getByPlaceholder('Material name')

  // Dimensional material CRUD
  await addMaterialOfType(dialog, 'Dimensional')
  await nameField.fill('E2E Dimensional')

  await dialog.getByLabel('Cross section smaller dimension').fill('6')
  await dialog.getByLabel('Cross section larger dimension').fill('12')
  await dialog.getByRole('button', { name: 'Add cross section' }).click()
  await expect(dialog.getByRole('listitem').filter({ hasText: /6cm × 12cm/ })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Remove cross section' })).toHaveCount(1)
  await dialog.getByRole('button', { name: 'Remove cross section' }).click()
  await expect(dialog.getByText('No cross sections configured')).toBeVisible()

  await dialog.getByLabel('Stock length input').fill('450')
  await dialog.getByRole('button', { name: 'Add stock length' }).click()
  await expect(dialog.getByRole('listitem').filter({ hasText: /4\.5m/ })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Remove stock length' })).toHaveCount(1)
  await dialog.getByRole('button', { name: 'Remove stock length' }).click()
  await expect(dialog.getByText('No lengths configured')).toBeVisible()

  // Sheet material CRUD
  await addMaterialOfType(dialog, 'Sheet')
  await nameField.fill('E2E Sheet')

  await dialog.getByLabel('Sheet width').fill('60')
  await dialog.getByLabel('Sheet length').fill('120')
  await dialog.getByRole('button', { name: 'Add sheet size' }).click()
  await expect(dialog.getByRole('listitem').filter({ hasText: /0.6m × 1.2m/ })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Remove sheet size' })).toHaveCount(1)
  await dialog.getByRole('button', { name: 'Remove sheet size' }).click()
  await expect(dialog.getByText('No sheet sizes configured')).toBeVisible()

  await dialog.getByLabel('Thickness input').fill('30')
  await dialog.getByRole('button', { name: 'Add thickness' }).click()
  await expect(dialog.getByRole('listitem').filter({ hasText: /3cm/ })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Remove thickness' })).toHaveCount(1)
  await dialog.getByRole('button', { name: 'Remove thickness' }).click()
  await expect(dialog.getByText('No thicknesses configured')).toBeVisible()

  // Volume material CRUD
  await addMaterialOfType(dialog, 'Volume')
  await nameField.fill('E2E Volume')

  await expect(page.getByRole('radio', { name: 'L' })).toBeChecked()
  await expect(dialog.getByText('No volumes configured')).toBeVisible()

  await dialog.getByLabel('Volume input').fill('1500')
  await dialog.getByRole('button', { name: 'Add volume option' }).click()
  await expect(dialog.getByRole('listitem').filter({ hasText: /1500L/ })).toBeVisible()

  await page.getByRole('radio', { name: 'm³' }).click()

  await dialog.getByLabel('Volume input').fill('1.3')
  await dialog.getByRole('button', { name: 'Add volume option' }).click()
  await expect(dialog.getByRole('listitem').filter({ hasText: /1\.30m³/ })).toBeVisible()

  await expect(dialog.getByRole('listitem')).toHaveCount(2)
  await expect(dialog.getByRole('listitem').filter({ hasText: /1\.50m³/ })).toBeVisible()

  await dialog.getByRole('button', { name: 'Remove volume option' }).first().click()
  await expect(dialog.getByRole('listitem')).toHaveCount(1)

  // Generic material rename
  await addMaterialOfType(dialog, 'Generic')
  await nameField.fill('E2E Generic')

  // Strawbale material rename
  await addMaterialOfType(dialog, 'Strawbale')
  await nameField.fill('E2E Strawbale')

  // Duplicate & delete flow
  await dialog.getByRole('button', { name: 'Duplicate' }).click()
  await expect(nameField).toHaveValue(/Copy/)

  await dialog.getByRole('button', { name: 'Delete' }).click()
  const alert = page.getByRole('alertdialog', { name: 'Delete Material' })
  await alert.getByRole('button', { name: 'Delete' }).click()
  await expect(alert).toBeHidden()
})
