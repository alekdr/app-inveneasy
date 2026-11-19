// frontend/src/types/index.ts

// ===== Auth =====
export interface UserProfile {
  id: string
  display_name: string | null
  avatar_url: string | null
  created_at: string
}

// ===== Armario =====
export interface ClosetCategory {
  id: string
  user_id: string
  name: string
  icon_url: string | null
  sort_order: number
  created_at: string
}

export interface ClosetSubcategory {
  id: string
  category_id: string
  user_id: string
  name: string
  icon_url: string | null
  sort_order: number
  created_at: string
}

export interface ClosetItem {
  id: string
  subcategory_id: string
  user_id: string
  name: string
  image_url: string | null
  cloudinary_public_id: string | null
  created_at: string
  updated_at: string
}

// ===== Rutinas =====
export interface Routine {
  id: string
  user_id: string
  title: string
  time_of_day: string | null
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom'
  is_active: boolean
  created_at: string
}

export interface RoutineLog {
  id: string
  routine_id: string
  user_id: string
  log_date: string
  status: 'completed' | 'uncompleted' | 'pending'
  updated_at: string
}

export interface RoutineWithStatus extends Routine {
  status: 'completed' | 'uncompleted' | 'pending'
  logId?: string
}

// ===== Finanzas =====
export interface FinancialTransaction {
  id: string
  user_id: string
  type: 'income' | 'expense'
  amount: number
  category: string
  description: string | null
  transaction_date: string
  created_at: string
}

export interface ShoppingItem {
  id: string
  user_id: string
  name: string
  estimated_price: number
  actual_price: number | null
  is_purchased: boolean
  purchased_date: string | null
  created_at: string
}

export interface Saving {
  id: string
  user_id: string
  amount: number
  saving_type: 'digital' | 'efectivo'
  saving_date: string
  notes: string | null
  created_at: string
}

// ===== Lista de Deseos (Wishlist) =====
export interface WishlistItem {
  id: string
  user_id: string
  title: string
  estimated_price: number
  image_url: string | null
  cloudinary_public_id: string | null
  category: string
  link_url: string | null
  is_purchased: boolean
  purchased_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// ===== Calendario =====
export type CalendarEventType =
  | 'Evento'
  | 'Recordatorio'
  | 'Tarea'
  | 'Urgente'
  | 'Importante'
  | 'Meta'
  | 'Idea'

export interface CalendarEvent {
  id: string
  user_id: string
  title: string
  description: string | null
  event_date: string // YYYY-MM-DD
  event_time: string | null // HH:MM
  event_type: CalendarEventType
  is_completed: boolean
  created_at: string
  updated_at: string
}

// ===== Hábitos (Mogged) =====
export interface Habit {
  id: string
  user_id: string
  name: string
  icon_name: string
  color: string
  frequency: 'daily' | 'weekdays' | 'weekends' | 'custom'
  reminder_time: string | null
  is_measurable: boolean
  target_value: number
  unit: string | null
  current_streak: number
  best_streak: number
  is_active: boolean
  created_at: string
}

export interface HabitLog {
  id: string
  habit_id: string
  user_id: string
  log_date: string
  progress_value: number
  status: 'completed' | 'skipped' | 'pending'
  updated_at: string
}

export interface HabitWithProgress extends Habit {
  status: 'completed' | 'skipped' | 'pending'
  progress_value: number
  logId?: string
}

// ===== Recetas =====
export type RecipeCategory = 'comida' | 'medicinal' | 'postre' | 'bebida' | 'otro'
export type RecipeDifficulty = 'facil' | 'media' | 'dificil'

export interface RecipeIngredient {
  name: string
  amount: number | null
  unit: string | null
  notes: string | null
}

export interface Recipe {
  id: string
  user_id: string
  title: string
  description: string | null
  category: RecipeCategory
  difficulty: RecipeDifficulty
  prep_time_minutes: number | null
  cook_time_minutes: number | null
  servings: number
  ingredients: RecipeIngredient[]
  instructions: string[]
  image_url: string | null
  cloudinary_public_id: string | null
  tags: string[]
  is_favorite: boolean
  source_url: string | null
  created_at: string
  updated_at: string
}

export interface RecipeLog {
  id: string
  recipe_id: string
  user_id: string
  cooked_date: string
  rating: number | null
  notes: string | null
  created_at: string
}

export interface RecipeFilters {
  category?: RecipeCategory | 'all'
  difficulty?: RecipeDifficulty | 'all'
  onlyFavorites?: boolean
  search?: string
}

// ===== Metas =====
export type GoalType = 'short_term' | 'medium_term' | 'long_term'

export interface Goal {
  id: string
  user_id: string
  title: string
  description: string | null
  target_date: string
  goal_type: GoalType
  category: string
  target_value: number | null
  current_value: number
  unit: string | null
  is_completed: boolean
  completed_date: string | null
  created_at: string
  updated_at: string
}

// ===== Navigation =====
export type TabId = 'home' | 'closet' | 'routines' | 'finances' | 'habits' | 'calendar' | 'wishlist' | 'goals' | 'recipes' | 'settings'
