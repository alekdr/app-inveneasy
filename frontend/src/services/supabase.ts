import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️ Supabase no configurado. Añade VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env'
  )
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)

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
