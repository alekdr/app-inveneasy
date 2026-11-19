import { test, expect } from '@playwright/test'

/**
 * Tests de humo de la app (sin sesión real).
 */
test.describe('Auth', () => {
  test('la app carga y muestra la pantalla de acceso', async ({ page }) => {
    await page.goto('/')

    // Título de la marca
    await expect(page.getByText('InvenEasy').first()).toBeVisible({ timeout: 15_000 })

    // Formulario de login (si no hay sesión guardada)
    const loginHeading = page.getByRole('heading', { name: 'Iniciar sesión' })
    const dashboardHeading = page.getByRole('heading', { name: 'Hola de nuevo' })

    await expect(loginHeading.or(dashboardHeading)).toBeVisible({ timeout: 15_000 })
  })

  test('cambia a modo crear cuenta y muestra el campo de nombre', async ({ page }) => {
    await page.goto('/auth')

    const loginHeading = page.getByRole('heading', { name: 'Iniciar sesión' })
    if (!(await loginHeading.isVisible().catch(() => false))) {
      test.skip(true, 'Ya hay una sesión activa en este navegador')
    }

    await page.getByRole('button', { name: /reg[ií]strate|crear cuenta/i }).first().click()

    await expect(page.getByPlaceholder('Tu nombre')).toBeVisible()
  })

  test('muestra error con credenciales inválidas', async ({ page }) => {
    await page.goto('/auth')

    const loginHeading = page.getByRole('heading', { name: 'Iniciar sesión' })
    if (!(await loginHeading.isVisible().catch(() => false))) {
      test.skip(true, 'Ya hay una sesión activa en este navegador')
    }

    await page.getByPlaceholder(/correo|email/i).fill('no-existe-inveneasy@example.com')
    await page.getByPlaceholder(/contraseña|password/i).fill('clave-invalida-123')
    await page.getByRole('button', { name: /iniciar|entrar/i }).first().click()

    // Debe aparecer algún mensaje de error, no navegar al dashboard
    await expect(
      page.getByText(/incorrect|inválid|error/i).first()
    ).toBeVisible({ timeout: 20_000 })
  })
})
