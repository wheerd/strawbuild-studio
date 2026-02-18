import { type Page, expect } from '@playwright/test'

import { setupEditorPage } from './editor'

export const TEST_USER_EMAIL = 'test@strawbaler.dev'
export const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'test-password-123'

export interface SupabaseConfig {
  url: string
  anonKey: string
}

export function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

  if (!url || !anonKey) {
    return null
  }

  return { url, anonKey }
}

export function isSupabaseConfiguredForTests(): boolean {
  return getSupabaseConfig() !== null
}

export async function signInViaApi(
  config: SupabaseConfig,
  email: string,
  password: string
): Promise<{
  accessToken: string
  refreshToken: string
  expiresAt: number
}> {
  const response = await fetch(`${config.url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: config.anonKey
    },
    body: JSON.stringify({ email, password })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Sign in failed: ${error}`)
  }

  const data = (await response.json()) as {
    access_token: string
    refresh_token: string
    expires_at: number
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at
  }
}

export async function signUpViaApi(config: SupabaseConfig, email: string, password: string): Promise<void> {
  const response = await fetch(`${config.url}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: config.anonKey
    },
    body: JSON.stringify({ email, password })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Sign up failed: ${error}`)
  }
}

export async function ensureTestUser(config: SupabaseConfig): Promise<void> {
  try {
    await signInViaApi(config, TEST_USER_EMAIL, TEST_USER_PASSWORD)
    return
  } catch {
    // Sign-in failed, try to sign up
  }

  try {
    await signUpViaApi(config, TEST_USER_EMAIL, TEST_USER_PASSWORD)
  } catch (error) {
    // If user already exists (race condition with parallel workers), sign-in should now work
    if (error instanceof Error && error.message.includes('duplicate key')) {
      try {
        await signInViaApi(config, TEST_USER_EMAIL, TEST_USER_PASSWORD)
        return
      } catch (signInError) {
        throw new Error(
          `Test user "${TEST_USER_EMAIL}" exists but sign-in failed. ` +
            `Check that TEST_USER_PASSWORD in .env.test.local matches the user's password.`
        )
      }
    }
    throw error
  }
}

let testUserEnsured = false

export async function ensureTestUserExists(): Promise<void> {
  if (testUserEnsured) return

  const config = getSupabaseConfig()
  if (!config) {
    throw new Error('Supabase not configured for tests')
  }

  await ensureTestUser(config)
  testUserEnsured = true
}

export async function injectAuthSession(
  page: Page,
  config: SupabaseConfig,
  session: { accessToken: string; refreshToken: string; expiresAt: number }
): Promise<void> {
  const supabaseUrl = config.url
  const storageKey = `sb-${new URL(supabaseUrl).host.split('.')[0]}-auth-token`

  const authData = {
    access_token: session.accessToken,
    refresh_token: session.refreshToken,
    expires_at: session.expiresAt,
    expires_in: session.expiresAt - Math.floor(Date.now() / 1000),
    token_type: 'bearer',
    user: null
  }

  await page.addInitScript(
    ({ key, data }) => {
      localStorage.setItem(key, JSON.stringify(data))
    },
    { key: storageKey, data: authData }
  )
}

export async function setupAuthenticatedPage(page: Page): Promise<void> {
  const config = getSupabaseConfig()
  if (!config) {
    throw new Error('Supabase not configured for tests')
  }
  await ensureTestUser(config)
  const session = await signInViaApi(config, TEST_USER_EMAIL, TEST_USER_PASSWORD)
  await injectAuthSession(page, config, session)
  await setupEditorPage(page)
  await expect(page.getByRole('button', { name: /account/i })).toBeVisible()
}

export async function setupAnonymousPage(page: Page): Promise<void> {
  await setupEditorPage(page)
  await expect(page.getByRole('button', { name: /account/i })).toBeVisible()
}

export async function openAuthModal(page: Page): Promise<void> {
  await page.getByRole('button', { name: /account/i }).click()
  await page.getByRole('menuitem', { name: /sign in/i }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
}

export async function signInViaUI(page: Page, email: string, password: string): Promise<void> {
  await openAuthModal(page)
  await page.locator('#sign-in-email').fill(email)
  await page.locator('#sign-in-password').fill(password)
  await page.getByRole('button', { name: /^sign in$/i }).click()
}

export async function signUpViaUI(page: Page, email: string, password: string): Promise<void> {
  await openAuthModal(page)
  await page.getByRole('tab', { name: /sign up/i }).click()
  await page.locator('#sign-up-email').fill(email)
  await page.locator('#sign-up-password').fill(password)
  await page.locator('#sign-up-confirm').fill(password)
  await page.getByRole('button', { name: /create account/i }).click()
}

export async function signOut(page: Page): Promise<void> {
  await page.getByRole('button', { name: /account/i }).click()
  await page.getByRole('menuitem', { name: /sign out/i }).click()
}

export async function expectAuthenticated(page: Page, email: string): Promise<void> {
  await page.getByRole('button', { name: /account/i }).click()
  await expect(page.getByTestId('user-email')).toHaveText(email)
  await page.keyboard.press('Escape')
}

export async function expectAnonymous(page: Page): Promise<void> {
  await page.getByRole('button', { name: /account/i }).click()
  await expect(page.getByRole('menuitem', { name: /sign in/i })).toBeVisible()
  await page.keyboard.press('Escape')
}
