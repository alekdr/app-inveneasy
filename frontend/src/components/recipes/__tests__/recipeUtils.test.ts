import { describe, it, expect } from 'vitest'
import { formatMinutes, totalTime } from '../RecipeCard'
import type { Recipe } from '../../../types'

function makeRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 'r1',
    user_id: 'u1',
    title: 'Receta',
    description: null,
    category: 'comida',
    difficulty: 'facil',
    prep_time_minutes: null,
    cook_time_minutes: null,
    servings: 1,
    ingredients: [],
    instructions: [],
    image_url: null,
    cloudinary_public_id: null,
    tags: [],
    is_favorite: false,
    source_url: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('formatMinutes', () => {
  it('devuelve null para valores vacíos o cero', () => {
    expect(formatMinutes(null)).toBeNull()
    expect(formatMinutes(undefined)).toBeNull()
    expect(formatMinutes(0)).toBeNull()
    expect(formatMinutes(-5)).toBeNull()
  })

  it('formatea menos de una hora en minutos', () => {
    expect(formatMinutes(1)).toBe('1 min')
    expect(formatMinutes(45)).toBe('45 min')
    expect(formatMinutes(59)).toBe('59 min')
  })

  it('formatea horas exactas', () => {
    expect(formatMinutes(60)).toBe('1 h')
    expect(formatMinutes(120)).toBe('2 h')
  })

  it('formatea horas y minutos', () => {
    expect(formatMinutes(61)).toBe('1 h 1 min')
    expect(formatMinutes(90)).toBe('1 h 30 min')
  })
})

describe('totalTime', () => {
  it('suma preparación y cocción', () => {
    expect(totalTime(makeRecipe({ prep_time_minutes: 10, cook_time_minutes: 20 }))).toBe(30)
  })

  it('devuelve null si no hay tiempos', () => {
    expect(totalTime(makeRecipe())).toBeNull()
  })

  it('usa solo el tiempo disponible', () => {
    expect(totalTime(makeRecipe({ cook_time_minutes: 15 }))).toBe(15)
  })
})
