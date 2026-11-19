import type { Page } from '@playwright/test'

export const E2E_EMAIL = process.env.E2E_EMAIL
export const E2E_PASSWORD = process.env.E2E_PASSWORD

export const hasCredentials = Boolean(E2E_EMAIL && E2E_PASSWORD)

/**
 * Inicia sesión con las credenciales de entorno.
 * Debe llamarse solo cuando `hasCredentials` es true.
 */
export async function login(page: Page) {
  await page.goto('/auth')

  const loginHeading = page.getByRole('heading', { name: 'Iniciar sesión' })
  if (await loginHeading.isVisible().catch(() => false)) {
    await page.getByPlaceholder(/correo|email/i).fill(E2E_EMAIL!)
    await page.getByPlaceholder(/contraseña|password/i).fill(E2E_PASSWORD!)
    await page.getByRole('button', { name: /iniciar|entrar/i }).first().click()
  }

  // Espera al dashboard o a cualquier layout autenticado
  await page.waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: 30_000 })
}

export function uniqueSuffix() {
  return `${Date.now()}-${Math.floor(Math.random() * 1000)}`
}
