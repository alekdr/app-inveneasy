import { test, expect } from '@playwright/test'
import { login, hasCredentials, uniqueSuffix } from './helpers'

test.describe('Recetas (requiere sesión)', () => {
  test.skip(!hasCredentials, 'Define E2E_EMAIL y E2E_PASSWORD para correr estos tests')

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('navega a Recetas desde el menú y muestra el encabezado', async ({ page }) => {
    await page.goto('/recipes')

    await expect(page.getByRole('heading', { name: 'Recetas' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: /nueva receta/i })).toBeVisible()
  })

  test('crea, busca y elimina una receta', async ({ page }) => {
    const suffix = uniqueSuffix()
    const title = `Receta E2E ${suffix}`

    await page.goto('/recipes/new')

    await page.getByLabel('Nombre de la receta').fill(title)
    await page.getByLabel('Descripción (opcional)').fill('Receta creada por Playwright')

    // Ingrediente
    await page.getByLabel('Ingrediente 1').fill('Agua')
    await page.getByLabel('Cantidad del ingrediente 1').fill('200')
    await page.getByLabel('Unidad del ingrediente 1').selectOption('ml')

    // Paso
    await page.getByLabel('Paso 1').fill('Hervir el agua y dejar reposar.')

    await page.getByRole('button', { name: /crear receta/i }).click()

    // Redirige al detalle
    await page.waitForURL(/\/recipes\/[0-9a-f-]+$/, { timeout: 20_000 })
    await expect(page.getByRole('heading', { name: title })).toBeVisible()
    await expect(page.getByText('Hervir el agua y dejar reposar.')).toBeVisible()

    // Vuelve a la lista y busca
    await page.goto('/recipes')
    await page.getByPlaceholder(/buscar por nombre, ingrediente o etiqueta/i).fill(title)
    await expect(page.getByText(title)).toBeVisible()

    // Abrir y eliminar
    await page.getByText(title).first().click()
    await page.getByRole('button', { name: 'Eliminar receta' }).click()
    await page.getByRole('button', { name: /^eliminar$/i }).click()

    await expect(page).toHaveURL(/\/recipes$/, { timeout: 15_000 })
    await expect(page.getByText(title)).toHaveCount(0)
  })

  test('marca y desmarca una receta como favorita', async ({ page }) => {
    const suffix = uniqueSuffix()
    const title = `Favorita E2E ${suffix}`

    await page.goto('/recipes/new')
    await page.getByLabel('Nombre de la receta').fill(title)
    await page.getByRole('button', { name: /crear receta/i }).click()
    await page.waitForURL(/\/recipes\/[0-9a-f-]+$/, { timeout: 20_000 })

    const favButton = page.getByRole('button', { name: /marcar como favorita/i })
    await favButton.click()
    await expect(page.getByRole('button', { name: /quitar de favoritas/i })).toBeVisible()

    // Limpieza
    await page.getByRole('button', { name: 'Eliminar receta' }).click()
    await page.getByRole('button', { name: /^eliminar$/i }).click()
    await expect(page).toHaveURL(/\/recipes$/, { timeout: 15_000 })
  })

  test('registra una receta como cocinada con rating', async ({ page }) => {
    const suffix = uniqueSuffix()
    const title = `Cocinada E2E ${suffix}`

    await page.goto('/recipes/new')
    await page.getByLabel('Nombre de la receta').fill(title)
    await page.getByRole('button', { name: /crear receta/i }).click()
    await page.waitForURL(/\/recipes\/[0-9a-f-]+$/, { timeout: 20_000 })

    await page.getByRole('button', { name: /cocinar ahora/i }).click()
    await page.getByRole('button', { name: /5 estrellas/i }).click()
    await page.getByRole('button', { name: /^registrar$/i }).click()

    // Debe aparecer en el historial
    await expect(page.getByText(/veces cocinada|vez cocinada/)).toBeVisible({ timeout: 15_000 })

    // Limpieza
    await page.getByRole('button', { name: 'Eliminar receta' }).click()
    await page.getByRole('button', { name: /^eliminar$/i }).click()
    await expect(page).toHaveURL(/\/recipes$/, { timeout: 15_000 })
  })
})
