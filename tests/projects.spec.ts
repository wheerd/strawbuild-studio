import { expect, test } from '@playwright/test'

import { isSupabaseConfiguredForTests, setupAnonymousPage, setupAuthenticatedPage } from './fixtures/auth'

const authDescribe = isSupabaseConfiguredForTests() ? test.describe : test.describe.skip

authDescribe('Project Management', () => {
  authDescribe('Projects Modal', () => {
    test.beforeEach(async ({ page }) => {
      await setupAuthenticatedPage(page)
    })

    test('should open projects modal from project menu', async ({ page }) => {
      await page.getByRole('button', { name: /project/i }).click()
      await page.getByRole('menuitem', { name: /manage projects/i }).click()
      await expect(page.getByRole('dialog', { name: /manage projects/i })).toBeVisible()
    })

    test('should show current project indicator', async ({ page }) => {
      await page.getByRole('button', { name: /project/i }).click()
      await page.getByRole('menuitem', { name: /manage projects/i }).click()
      await expect(page.getByText(/current/i)).toBeVisible()
    })

    test('should close projects modal with cancel button', async ({ page }) => {
      await page.getByRole('button', { name: /project/i }).click()
      await page.getByRole('menuitem', { name: /manage projects/i }).click()
      await page.getByRole('button', { name: /cancel/i }).click()
      await expect(page.getByRole('dialog', { name: /manage projects/i })).not.toBeVisible()
    })
  })

  authDescribe('Edit Project', () => {
    test.beforeEach(async ({ page }) => {
      await setupAuthenticatedPage(page)
    })

    test('should open edit project dialog', async ({ page }) => {
      await page.getByRole('button', { name: /project/i }).click()
      await page.getByRole('menuitem', { name: /edit project/i }).click()
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByLabel(/name/i)).toBeVisible()
    })

    test('should update project name', async ({ page }) => {
      const uniqueName = `Test Project ${Date.now()}`

      await page.getByRole('button', { name: /project/i }).click()
      await page.getByRole('menuitem', { name: /edit project/i }).click()

      await page.getByLabel(/name/i).fill(uniqueName)
      await page.getByRole('button', { name: /^save$/i }).click()

      await expect(page.getByRole('button', { name: uniqueName })).toBeVisible()
    })
  })

  authDescribe('Create Project', () => {
    test.beforeEach(async ({ page }) => {
      await setupAuthenticatedPage(page)
    })

    test('should open new project dialog', async ({ page }) => {
      await page.getByRole('button', { name: /project/i }).click()
      await page.getByRole('menuitem', { name: /manage projects/i }).click()
      await page.getByRole('button', { name: /new project/i }).click()

      await expect(page.getByRole('dialog', { name: /new project/i })).toBeVisible()
    })

    test('should create new empty project', async ({ page }) => {
      const projectName = `New Project ${Date.now()}`

      await page.getByRole('button', { name: /project/i }).click()
      await page.getByRole('menuitem', { name: /manage projects/i }).click()
      await page.getByRole('button', { name: /new project/i }).click()

      await page.getByLabel(/name/i).fill(projectName)
      await page.getByRole('radio', { name: /start empty/i }).check()
      await page.getByRole('button', { name: /^create$/i }).click()

      await expect(page.getByRole('dialog', { name: /manage projects/i })).not.toBeVisible()
      await expect(page.getByRole('button', { name: projectName })).toBeVisible()
    })

    test('should create project with copy of current', async ({ page }) => {
      const projectName = `Copied Project ${Date.now()}`

      await page.getByRole('button', { name: /project/i }).click()
      await page.getByRole('menuitem', { name: /manage projects/i }).click()
      await page.getByRole('button', { name: /new project/i }).click()

      await page.getByLabel(/name/i).fill(projectName)
      await page.getByRole('radio', { name: /copy current/i }).check()
      await page.getByRole('button', { name: /^create$/i }).click()

      await expect(page.getByRole('dialog', { name: /manage projects/i })).not.toBeVisible()
      await expect(page.getByRole('button', { name: projectName })).toBeVisible()
    })
  })

  authDescribe('Switch Project', () => {
    test.beforeEach(async ({ page }) => {
      await setupAuthenticatedPage(page)
    })

    test('should switch to another project', async ({ page }) => {
      const firstProjectName = `First ${Date.now()}`
      const secondProjectName = `Second ${Date.now()}`

      await page.getByRole('button', { name: /project/i }).click()
      await page.getByRole('menuitem', { name: /manage projects/i }).click()
      await page.getByRole('button', { name: /new project/i }).click()
      await page.getByLabel(/name/i).fill(firstProjectName)
      await page.getByRole('button', { name: /^create$/i }).click()

      await page.waitForTimeout(500)

      await page.getByRole('button', { name: firstProjectName }).click()
      await page.getByRole('menuitem', { name: /manage projects/i }).click()
      await page.getByRole('button', { name: /new project/i }).click()
      await page.getByLabel(/name/i).fill(secondProjectName)
      await page.getByRole('button', { name: /^create$/i }).click()

      await page.waitForTimeout(500)

      await page.getByRole('button', { name: secondProjectName }).click()
      await page.getByRole('menuitem', { name: /manage projects/i }).click()

      await page.getByText(firstProjectName).first().click()

      await expect(page.getByRole('button', { name: firstProjectName })).toBeVisible({ timeout: 10000 })
    })
  })

  authDescribe('Delete Project', () => {
    test.beforeEach(async ({ page }) => {
      await setupAuthenticatedPage(page)
    })

    test('should delete project with confirmation', async ({ page }) => {
      const projectName = `To Delete ${Date.now()}`

      await page.getByRole('button', { name: /project/i }).click()
      await page.getByRole('menuitem', { name: /manage projects/i }).click()
      await page.getByRole('button', { name: /new project/i }).click()
      await page.getByLabel(/name/i).fill(projectName)
      await page.getByRole('button', { name: /^create$/i }).click()

      await page.waitForTimeout(500)

      await page.getByRole('button', { name: projectName }).click()
      await page.getByRole('menuitem', { name: /manage projects/i }).click()

      const projectRow = page.locator('div', { hasText: projectName }).first()
      await projectRow.getByRole('button', { name: /delete/i }).click()

      await page.getByRole('button', { name: /^delete$/i }).click()

      await expect(page.getByText(projectName)).not.toBeVisible()
    })
  })

  authDescribe('Anonymous User', () => {
    test('should not show manage projects option', async ({ page }) => {
      await setupAnonymousPage(page)
      await page.getByRole('button', { name: /project/i }).click()
      await expect(page.getByRole('menuitem', { name: /manage projects/i })).not.toBeVisible()
    })
  })
})
