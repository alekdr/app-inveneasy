import { createClient } from '@supabase/supabase-js'
import type { Recipe, RecipeLog, RecipeCategory, RecipeDifficulty } from '../types'

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://wpanurtrwzenzembfivt.supabase.co'
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_kKQoyKCvm_GUNUMdbpI2MA_Zb3FKR24'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
})

// ===== Servicios de Categorías =====

export async function fetchCategories() {
  const { data, error } = await supabase
    .from('closet_categories')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data
}

export async function createCategory(name: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuario no autenticado')

  const { data, error } = await supabase
    .from('closet_categories')
    .insert({
      user_id: user.id,
      name,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateCategory(categoryId: string, name: string) {
  const { data, error } = await supabase
    .from('closet_categories')
    .update({ name })
    .eq('id', categoryId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteCategory(categoryId: string) {
  const { error } = await supabase
    .from('closet_categories')
    .delete()
    .eq('id', categoryId)

  if (error) throw error
  return true
}

// ===== Servicios de Subcategorías =====

export async function fetchSubcategories(categoryId: string) {
  const { data, error } = await supabase
    .from('closet_subcategories')
    .select('*')
    .eq('category_id', categoryId)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data
}

export async function createSubcategory(categoryId: string, name: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuario no autenticado')

  const { data, error } = await supabase
    .from('closet_subcategories')
    .insert({
      category_id: categoryId,
      user_id: user.id,
      name,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateSubcategory(subcategoryId: string, name: string) {
  const { data, error } = await supabase
    .from('closet_subcategories')
    .update({ name })
    .eq('id', subcategoryId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteSubcategory(subcategoryId: string) {
  const { error } = await supabase
    .from('closet_subcategories')
    .delete()
    .eq('id', subcategoryId)

  if (error) throw error
  return true
}

// ===== Servicios de Items =====

export async function fetchItems(subcategoryId: string) {
  const { data, error } = await supabase
    .from('closet_items')
    .select('*')
    .eq('subcategory_id', subcategoryId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function createItem(subcategoryId: string, name: string, imageUrl?: string, cloudinaryPublicId?: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuario no autenticado')

  const { data, error } = await supabase
    .from('closet_items')
    .insert({
      subcategory_id: subcategoryId,
      user_id: user.id,
      name,
      image_url: imageUrl || null,
      cloudinary_public_id: cloudinaryPublicId || null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateItem(itemId: string, updates: { name?: string; image_url?: string; cloudinary_public_id?: string }) {
  const { data, error } = await supabase
    .from('closet_items')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', itemId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteItem(itemId: string) {
  const { error } = await supabase
    .from('closet_items')
    .delete()
    .eq('id', itemId)

  if (error) throw error
  return true
}

// ===== Servicios de Lista de Deseos (Wishlist) =====

export async function fetchWishlist() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('wishlist_items')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function createWishlistItem(item: {
  title: string
  estimated_price?: number
  image_url?: string
  cloudinary_public_id?: string
  category?: string
  link_url?: string
  notes?: string
}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuario no autenticado')

  const { data, error } = await supabase
    .from('wishlist_items')
    .insert({
      user_id: user.id,
      title: item.title,
      estimated_price: item.estimated_price || 0,
      image_url: item.image_url || null,
      cloudinary_public_id: item.cloudinary_public_id || null,
      category: item.category || 'General',
      link_url: item.link_url || null,
      notes: item.notes || null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateWishlistItem(id: string, updates: Partial<{
  title: string
  estimated_price: number
  image_url: string
  cloudinary_public_id: string
  category: string
  link_url: string
  is_purchased: boolean
  purchased_date: string | null
  notes: string
}>) {
  const { data, error } = await supabase
    .from('wishlist_items')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteWishlistItem(id: string) {
  const { error } = await supabase
    .from('wishlist_items')
    .delete()
    .eq('id', id)

  if (error) throw error
  return true
}

// ===== Servicios de Calendario =====

export async function fetchCalendarEvents(startDate: string, endDate: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', user.id)
    .gte('event_date', startDate)
    .lte('event_date', endDate)
    .order('event_time', { ascending: true, nullsFirst: false })

  if (error) throw error
  return data
}

export async function createCalendarEvent(event: {
  title: string
  description?: string
  event_date: string
  event_time?: string
  event_type: string
}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuario no autenticado')

  const { data, error } = await supabase
    .from('calendar_events')
    .insert({
      user_id: user.id,
      title: event.title,
      description: event.description || null,
      event_date: event.event_date,
      event_time: event.event_time || null,
      event_type: event.event_type,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateCalendarEvent(id: string, updates: Partial<{
  title: string
  description: string
  event_date: string
  event_time: string | null
  event_type: string
  is_completed: boolean
}>) {
  const { data, error } = await supabase
    .from('calendar_events')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteCalendarEvent(id: string) {
  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', id)

  if (error) throw error
  return true
}

// ===== Servicios de Hábitos (Mogged) =====

export async function fetchHabits(dateStr: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: habits, error: habitsError } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  if (habitsError) throw habitsError

  // Logs de hoy (para el estado del día)
  const { data: logs, error: logsError } = await supabase
    .from('habit_logs')
    .select('*')
    .eq('user_id', user.id)
    .eq('log_date', dateStr)

  if (logsError) throw logsError

  // Logs recientes (para calcular rachas en el cliente)
  const startDate = new Date(dateStr + 'T00:00:00')
  startDate.setDate(startDate.getDate() - 400)
  const startDateStr = startDate.toISOString().slice(0, 10)

  const { data: recentLogs, error: recentError } = await supabase
    .from('habit_logs')
    .select('habit_id, log_date, status')
    .eq('user_id', user.id)
    .gte('log_date', startDateStr)

  if (recentError) throw recentError

  const logsByHabit = new Map<string, Map<string, string>>()
  for (const l of recentLogs || []) {
    if (!logsByHabit.has(l.habit_id)) logsByHabit.set(l.habit_id, new Map())
    logsByHabit.get(l.habit_id)!.set(l.log_date, l.status)
  }

  const toStr = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const appliesOn = (frequency: string | null, d: Date) => {
    const iso = d.getDay() // 0=domingo, 6=sábado
    if (frequency === 'weekdays') return iso >= 1 && iso <= 5
    if (frequency === 'weekends') return iso === 0 || iso === 6
    return true
  }

  const computeStreaks = (
    habitId: string,
    frequency: string | null,
    today: string
  ): { current: number; best: number } => {
    const dayMap = logsByHabit.get(habitId)
    if (!dayMap || dayMap.size === 0) return { current: 0, best: 0 }

    // Racha actual: retroceder desde el último día completado
    let lastDone: string | null = null
    for (const [logDate, status] of dayMap) {
      if (status === 'completed' && (!lastDone || logDate > lastDone)) {
        lastDone = logDate
      }
    }

    let current = 0
    if (lastDone) {
      const cursor = new Date(lastDone + 'T00:00:00')
      for (let guard = 0; guard < 400; guard++) {
        if (!appliesOn(frequency, cursor)) {
          cursor.setDate(cursor.getDate() - 1)
          continue
        }
        const status = dayMap.get(toStr(cursor))
        if (status === 'completed') current++
        else if (status === 'skipped') {
          /* no rompe */
        } else break
        cursor.setDate(cursor.getDate() - 1)
      }
    }

    // Mejor racha histórica
    let best = 0
    let run = 0
    const todayDate = new Date(today + 'T00:00:00')
    const first = [...dayMap.keys()].sort()[0]
    const firstDate = new Date(first + 'T00:00:00')
    for (let d = new Date(firstDate.getTime()); d <= todayDate; d.setDate(d.getDate() + 1)) {
      if (!appliesOn(frequency, d)) continue
      const status = dayMap.get(toStr(d))
      if (status === 'completed') {
        run++
        if (run > best) best = run
      } else if (status === 'skipped') {
        /* no rompe */
      } else {
        run = 0
      }
    }

    return { current, best: Math.max(best, current) }
  }

  return (habits || []).map((h) => {
    const log = logs?.find((l) => l.habit_id === h.id)
    const { current, best } = computeStreaks(h.id, h.frequency, dateStr)
    return {
      ...h,
      status: log?.status || 'pending',
      progress_value: Number(log?.progress_value || 0),
      logId: log?.id,
      current_streak: current,
      best_streak: best,
    }
  })
}

export async function createHabit(habit: {
  name: string
  color?: string
  frequency?: string
  reminder_time?: string
  is_measurable?: boolean
  target_value?: number
  unit?: string
}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuario no autenticado')

  const { data, error } = await supabase
    .from('habits')
    .insert({
      user_id: user.id,
      name: habit.name,
      color: habit.color || '#6b5ce7',
      frequency: habit.frequency || 'daily',
      reminder_time: habit.reminder_time || null,
      is_measurable: habit.is_measurable || false,
      target_value: habit.target_value || 1,
      unit: habit.unit || null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function logHabitProgress(
  habitId: string,
  dateStr: string,
  status: 'completed' | 'skipped' | 'pending',
  progressValue: number
) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuario no autenticado')

  const { data, error } = await supabase
    .from('habit_logs')
    .upsert(
      {
        habit_id: habitId,
        user_id: user.id,
        log_date: dateStr,
        status,
        progress_value: progressValue,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'habit_id,log_date' }
    )
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteHabit(habitId: string) {
  const { error } = await supabase
    .from('habits')
    .delete()
    .eq('id', habitId)

  if (error) throw error
  return true
}

// ===== Servicios de Recetas =====

export interface RecipeCreateInput {
  title: string
  description?: string
  category?: RecipeCategory
  difficulty?: RecipeDifficulty
  prep_time_minutes?: number | null
  cook_time_minutes?: number | null
  servings?: number
  ingredients?: Recipe['ingredients']
  instructions?: string[]
  image_url?: string
  cloudinary_public_id?: string
  tags?: string[]
  is_favorite?: boolean
  source_url?: string
}

export type RecipeUpdateInput = Partial<RecipeCreateInput>

export async function fetchRecipes(filters?: {
  category?: RecipeCategory
  difficulty?: RecipeDifficulty
  onlyFavorites?: boolean
  search?: string
}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  let query = supabase
    .from('recipes')
    .select('*')
    .eq('user_id', user.id)

  if (filters?.category) query = query.eq('category', filters.category)
  if (filters?.difficulty) query = query.eq('difficulty', filters.difficulty)
  if (filters?.onlyFavorites) query = query.eq('is_favorite', true)

  if (filters?.search?.trim()) {
    const term = filters.search.trim().replace(/[%,]/g, '')
    query = query.or(
      `title.ilike.%${term}%,description.ilike.%${term}%`
    )
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as Recipe[]
}

export async function fetchRecipe(recipeId: string) {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', recipeId)
    .single()

  if (error) throw error
  return data as Recipe
}

export async function createRecipe(recipe: RecipeCreateInput) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuario no autenticado')

  const { data, error } = await supabase
    .from('recipes')
    .insert({
      user_id: user.id,
      title: recipe.title,
      description: recipe.description || null,
      category: recipe.category || 'comida',
      difficulty: recipe.difficulty || 'facil',
      prep_time_minutes: recipe.prep_time_minutes ?? null,
      cook_time_minutes: recipe.cook_time_minutes ?? null,
      servings: recipe.servings || 1,
      ingredients: recipe.ingredients || [],
      instructions: recipe.instructions || [],
      image_url: recipe.image_url || null,
      cloudinary_public_id: recipe.cloudinary_public_id || null,
      tags: recipe.tags || [],
      is_favorite: recipe.is_favorite || false,
      source_url: recipe.source_url || null,
    })
    .select()
    .single()

  if (error) throw error
  return data as Recipe
}

export async function updateRecipe(recipeId: string, updates: RecipeUpdateInput) {
  const { data, error } = await supabase
    .from('recipes')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', recipeId)
    .select()
    .single()

  if (error) throw error
  return data as Recipe
}

export async function deleteRecipe(recipeId: string) {
  const { error } = await supabase
    .from('recipes')
    .delete()
    .eq('id', recipeId)

  if (error) throw error
  return true
}

export async function toggleRecipeFavorite(recipeId: string, isFavorite: boolean) {
  return updateRecipe(recipeId, { is_favorite: isFavorite })
}

// ===== Historial de recetas cocinadas =====

export async function cookRecipe(
  recipeId: string,
  log: { rating?: number | null; notes?: string | null; cooked_date?: string }
) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuario no autenticado')

  const { data, error } = await supabase
    .from('recipe_logs')
    .insert({
      recipe_id: recipeId,
      user_id: user.id,
      cooked_date: log.cooked_date || new Date().toISOString().split('T')[0],
      rating: log.rating ?? null,
      notes: log.notes || null,
    })
    .select()
    .single()

  if (error) throw error
  return data as RecipeLog
}

export async function fetchRecipeLogs(recipeId?: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  let query = supabase
    .from('recipe_logs')
    .select('*')
    .eq('user_id', user.id)

  if (recipeId) query = query.eq('recipe_id', recipeId)

  const { data, error } = await query
    .order('cooked_date', { ascending: false })
    .limit(50)

  if (error) throw error
  return (data || []) as RecipeLog[]
}

export async function fetchRecipesStats() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { total: 0, favorites: 0, cookedThisMonth: 0, byCategory: {} as Record<string, number> }
  }

  const [recipesRes, logsRes] = await Promise.all([
    supabase.from('recipes').select('id, category, is_favorite').eq('user_id', user.id),
    supabase
      .from('recipe_logs')
      .select('id, cooked_date')
      .eq('user_id', user.id)
      .gte('cooked_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]),
  ])

  if (recipesRes.error) throw recipesRes.error
  if (logsRes.error) throw logsRes.error

  const recipes = recipesRes.data || []
  const byCategory: Record<string, number> = {}
  for (const r of recipes) {
    byCategory[r.category] = (byCategory[r.category] || 0) + 1
  }

  return {
    total: recipes.length,
    favorites: recipes.filter((r) => r.is_favorite).length,
    cookedThisMonth: (logsRes.data || []).length,
    byCategory,
  }
}
