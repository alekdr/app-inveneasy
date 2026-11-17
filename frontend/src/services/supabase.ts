import { createClient } from '@supabase/supabase-js'

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

  const { data: logs, error: logsError } = await supabase
    .from('habit_logs')
    .select('*')
    .eq('user_id', user.id)
    .eq('log_date', dateStr)

  if (logsError) throw logsError

  return (habits || []).map((h) => {
    const log = logs?.find((l) => l.habit_id === h.id)
    return {
      ...h,
      status: log?.status || 'pending',
      progress_value: Number(log?.progress_value || 0),
      logId: log?.id,
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
