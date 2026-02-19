import { expect, test } from '@playwright/test'

import { TEST_USER_EMAIL, TEST_USER_PASSWORD, isSupabaseConfiguredForTests, setupAnonymousPage } from './fixtures/auth'
import { loadTestData } from './fixtures/editor'

const authDescribe = isSupabaseConfiguredForTests() ? test.describe : test.describe.skip

authDescribe('Project Management', () => {
  test('complete journey: anonymous rename, sign-in sync, CRUD operations', async ({ page }) => {
    test.setTimeout(180000)

    const testId = Date.now()
    const firstName = `Journey First ${testId}`
    const emptyName = `Journey Empty ${testId}`
    const copiedName = `Journey Copied ${testId}`

    await page.evaluate('document.fonts.ready')

    // === PHASE 1: Anonymous User ===

    await setupAnonymousPage(page)

    await page.getByRole('button', { name: /project/i }).click()
    await expect(page.getByRole('menuitem', { name: /manage projects/i })).not.toBeVisible()
    await page.keyboard.press('Escape')

    await loadTestData(page, /Rectangular Perimeter/)
    await page.locator('[data-entity-type="perimeter"]').click()
    await expect(page.getByTestId('side-panel')).toContainText('40.00m²')

    await page.getByRole('button', { name: /project/i }).click()
    await page.getByRole('menuitem', { name: /edit project/i }).click()
    await page.getByLabel(/name/i).fill(firstName)
    await page.getByRole('button', { name: /^save$/i }).click()

    await expect(page.getByRole('button', { name: /project/i })).toHaveText(firstName)

    // === PHASE 2: Sign In via UI ===

    await page.getByRole('button', { name: /account/i }).click()
    await page.getByRole('menuitem', { name: /sign in/i }).click()

    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByLabel(/email/i).fill(TEST_USER_EMAIL)
    await page.getByLabel(/^password$/i).fill(TEST_USER_PASSWORD)
    await page.getByRole('button', { name: /^sign in$/i }).click()

    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 })

    await page.getByRole('button', { name: /account/i }).click()
    await expect(page.getByTestId('user-email')).toHaveText(TEST_USER_EMAIL)
    await page.keyboard.press('Escape')

    // === PHASE 3: Verify Synced Project ===

    await page.getByRole('button', { name: /project/i }).click()
    await page.getByRole('menuitem', { name: /manage projects/i }).click()

    const dialog = page.getByRole('dialog', { name: /manage projects/i })
    const projectList = dialog.getByRole('listbox', { name: /projects/i })
    await expect(dialog).toBeVisible()

    const firstProjectOption = projectList.getByRole('option', { name: firstName })
    await expect(firstProjectOption).toBeVisible()
    await expect(firstProjectOption).toHaveAttribute('aria-selected', 'true')

    await page.getByRole('button', { name: /cancel/i }).click()
    await expect(page.getByRole('dialog', { name: /manage projects/i })).not.toBeVisible()

    // === PHASE 4: Create Empty Project ===

    await page.getByRole('button', { name: /project/i }).click()
    await page.getByRole('menuitem', { name: /manage projects/i }).click()
    await page.getByRole('button', { name: /new project/i }).click()

    const newProjectDialog = page.getByRole('dialog', { name: /new project/i })
    await expect(newProjectDialog).toBeVisible()
    await newProjectDialog.getByLabel(/name/i).fill(emptyName)
    await newProjectDialog.getByRole('radio', { name: /start with empty/i }).check()
    await newProjectDialog.getByRole('button', { name: /^create$/i }).click()

    await expect(page.getByRole('dialog', { name: /manage projects/i })).toBeVisible()
    const emptyProjectEntry = projectList.getByRole('option', { name: emptyName })
    await expect(emptyProjectEntry).toBeVisible()
    await expect(emptyProjectEntry).toHaveAttribute('aria-selected', 'true')

    await page.getByRole('button', { name: /cancel/i }).click()
    await expect(page.getByRole('dialog', { name: /manage projects/i })).not.toBeVisible()
    await expect(page.locator('[data-entity-type="perimeter"]')).not.toBeVisible()
    await loadTestData(page, /Hexagonal Perimeter/)
    await page.locator('[data-entity-type="perimeter"]').click()
    await expect(page.getByTestId('side-panel')).toContainText('18m')

    // === PHASE 5: Create Copied Project ===

    await page.getByRole('button', { name: /project/i }).click()
    await page.getByRole('menuitem', { name: /manage projects/i }).click()
    await page.getByRole('button', { name: /new project/i }).click()

    await page.getByLabel(/name/i).fill(copiedName)
    await page.getByRole('radio', { name: /copy current/i }).check()
    await page.getByRole('button', { name: /^create$/i }).click()

    await expect(page.getByRole('dialog', { name: /manage projects/i })).toBeVisible()
    const copiedProjectEntry = projectList.getByRole('option', { name: copiedName })
    await expect(copiedProjectEntry).toBeVisible()
    await expect(copiedProjectEntry).toHaveAttribute('aria-selected', 'true')

    await page.getByRole('button', { name: /cancel/i }).click()
    await expect(page.getByRole('dialog', { name: /manage projects/i })).not.toBeVisible()
    await page.locator('[data-entity-type="perimeter"]').click()
    await expect(page.getByTestId('side-panel')).toContainText('18m')

    // === PHASE 6: Switch Between Projects ===

    await page.getByRole('button', { name: /project/i }).click()
    await page.getByRole('menuitem', { name: /manage projects/i }).click()

    const switchDialog = page.getByRole('dialog', { name: /manage projects/i })
    const switchProjectList = switchDialog.getByRole('listbox', { name: /projects/i })
    await switchProjectList.getByRole('button', { name: `Switch to ${firstName}` }).click()

    await expect(firstProjectOption).toHaveAttribute('aria-selected', 'true')

    await page.getByRole('button', { name: /cancel/i }).click()
    await expect(page.getByRole('dialog', { name: /manage projects/i })).not.toBeVisible()
    await page.locator('[data-entity-type="perimeter"]').click()
    await expect(page.getByTestId('side-panel')).toContainText('40.00m²')

    // === PHASE 7: Delete Test Projects ===

    await page.getByRole('button', { name: /project/i }).click()
    await page.getByRole('menuitem', { name: /manage projects/i }).click()

    const deleteDialog = page.getByRole('dialog', { name: /manage projects/i })
    const deleteProjectList = deleteDialog.getByRole('listbox', { name: /projects/i })

    await deleteProjectList.getByRole('button', { name: `Delete project ${emptyName}` }).click()
    await page.getByRole('button', { name: /^delete$/i }).click()
    await expect(deleteProjectList.getByRole('option', { name: emptyName })).not.toBeVisible()

    await deleteProjectList.getByRole('button', { name: `Delete project ${copiedName}` }).click()
    await page.getByRole('button', { name: /^delete$/i }).click()
    await expect(deleteProjectList.getByRole('option', { name: copiedName })).not.toBeVisible()
  })
})
