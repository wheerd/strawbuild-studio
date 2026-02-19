import { type Page, expect } from '@playwright/test'

import { setupEditorPage } from './editor'

export const TEST_USER_EMAIL = 'test@strawbaler.dev'
export const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD ?? 'test-password-123'

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

async function signInViaApi(
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

async function injectAuthSession(
  page: Page,
  session: { accessToken: string; refreshToken: string; expiresAt: number }
): Promise<void> {
  const storageKey = `strawbuild-auth`

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
  const session = await signInViaApi(config, TEST_USER_EMAIL, TEST_USER_PASSWORD)
  await injectAuthSession(page, session)
  await setupEditorPage(page)
  await expect(page.getByRole('button', { name: /account/i })).toBeVisible()
}

export async function setupAnonymousPage(page: Page): Promise<void> {
  await setupEditorPage(page)
  await expect(page.getByRole('button', { name: /account/i })).toBeVisible()
}

export async function cleanupTestProjects(namePrefix: string): Promise<void> {
  const config = getSupabaseConfig()
  if (!config) {
    return
  }

  const session = await signInViaApi(config, TEST_USER_EMAIL, TEST_USER_PASSWORD)

  const listResponse = await fetch(`${config.url}/rest/v1/projects?name=like.${namePrefix}*&select=id,name`, {
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${session.accessToken}`,
      'Content-Type': 'application/json'
    }
  })

  if (!listResponse.ok) {
    console.error('Failed to list projects for cleanup:', await listResponse.text())
    return
  }

  const projects = (await listResponse.json()) as Array<{ id: string; name: string }>

  for (const project of projects) {
    const deleteResponse = await fetch(`${config.url}/rest/v1/projects?id=eq.${project.id}`, {
      method: 'DELETE',
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${session.accessToken}`,
        Prefer: 'return=minimal'
      }
    })

    if (!deleteResponse.ok) {
      console.error(`Failed to delete project ${project.name}:`, await deleteResponse.text())
    }
  }
}
