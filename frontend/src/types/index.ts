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

// ===== Navigation =====
export type TabId = 'home' | 'closet' | 'routines' | 'finances' | 'habits' | 'calendar'
