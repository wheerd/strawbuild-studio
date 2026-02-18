import { expect, test } from '@playwright/test'

import {
  TEST_USER_EMAIL,
  TEST_USER_PASSWORD,
  ensureTestUserExists,
  expectAnonymous,
  expectAuthenticated,
  isSupabaseConfiguredForTests,
  openAuthModal,
  setupAnonymousPage,
  setupAuthenticatedPage,
  signInViaUI,
  signOut
} from './fixtures/auth'

const describe = test.describe
const authDescribe = isSupabaseConfiguredForTests() ? describe : describe.skip

authDescribe('Authentication', () => {
  test.describe.configure({ mode: 'parallel' })

  test.beforeAll(async () => {
    await ensureTestUserExists()
  })

  authDescribe('Sign In', () => {
    test('should sign in with valid credentials', async ({ page }) => {
      await setupAnonymousPage(page)
      await signInViaUI(page, TEST_USER_EMAIL, TEST_USER_PASSWORD)
      await expect(page.getByRole('dialog')).not.toBeVisible()
      await expectAuthenticated(page, TEST_USER_EMAIL)
    })

    test('should show error for invalid credentials', async ({ page }) => {
      await setupAnonymousPage(page)
      await signInViaUI(page, 'wrong@example.com', 'wrongpassword')
      await expect(page.getByText(/invalid login credentials/i)).toBeVisible()
      await expect(page.getByRole('dialog')).toBeVisible()
    })

    test('should show error for invalid email format', async ({ page }) => {
      await setupAnonymousPage(page)
      await openAuthModal(page)
      await page.locator('#sign-in-email').fill('not-an-email')
      await page.locator('#sign-in-password').fill('anypassword')
      await page.getByRole('button', { name: /^sign in$/i }).click()
      await expect(page.getByRole('dialog')).toBeVisible()
    })
  })

  authDescribe('Sign Out', () => {
    test('should sign out successfully', async ({ page }) => {
      await setupAuthenticatedPage(page)
      await signOut(page)
      await expectAnonymous(page)
    })
  })

  authDescribe('Sign Up', () => {
    test('should show error when passwords do not match', async ({ page }) => {
      await setupAnonymousPage(page)
      await openAuthModal(page)
      await page.getByRole('tab', { name: /sign up/i }).click()
      await page.locator('#sign-up-email').fill('newuser@example.com')
      await page.locator('#sign-up-password').fill('password123')
      await page.locator('#sign-up-confirm').fill('differentpassword')
      await page.getByRole('button', { name: /create account/i }).click()
      await expect(page.getByText(/passwords do not match/i)).toBeVisible()
    })
  })

  authDescribe('Forgot Password', () => {
    test('should show forgot password form', async ({ page }) => {
      await setupAnonymousPage(page)
      await openAuthModal(page)
      await page.getByRole('button', { name: /forgot password/i }).click()
      await expect(page.getByRole('heading', { name: /forgot password/i })).toBeVisible()
      await expect(page.locator('#forgot-email')).toBeVisible()
    })

    test('should navigate back to sign in', async ({ page }) => {
      await setupAnonymousPage(page)
      await openAuthModal(page)
      await page.getByRole('button', { name: /forgot password/i }).click()
      await page.getByRole('button', { name: /back to sign in/i }).click()
      await expect(page.getByRole('tab', { name: /sign in/i })).toBeVisible()
    })

    test('should accept email and show success message', async ({ page }) => {
      await setupAnonymousPage(page)
      await openAuthModal(page)
      await page.getByRole('button', { name: /forgot password/i }).click()
      await page.locator('#forgot-email').fill(TEST_USER_EMAIL)
      await page.getByRole('button', { name: /send reset email/i }).click()
      await expect(page.getByText(/check your email/i)).toBeVisible({ timeout: 10000 })
    })
  })

  authDescribe('Session Persistence', () => {
    test('should persist session across page reload', async ({ page }) => {
      await setupAuthenticatedPage(page)
      await expectAuthenticated(page, TEST_USER_EMAIL)
      await page.reload()
      await expectAuthenticated(page, TEST_USER_EMAIL)
    })
  })

  authDescribe('Protected Features', () => {
    test('should show manage projects option when authenticated', async ({ page }) => {
      await setupAuthenticatedPage(page)
      await page.getByRole('button', { name: /project/i }).click()
      await expect(page.getByRole('menuitem', { name: /manage projects/i })).toBeEnabled()
    })

    test('should not show manage projects option when anonymous', async ({ page }) => {
      await setupAnonymousPage(page)
      await page.getByRole('button', { name: /project/i }).click()
      await expect(page.getByRole('menuitem', { name: /manage projects/i })).not.toBeVisible()
    })
  })
})
