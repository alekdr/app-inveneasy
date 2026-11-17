import { create } from 'zustand'
import { supabase } from '../services/supabase'
import type { User, Session } from '@supabase/supabase-js'
import type { UserProfile } from '../types'

interface AuthState {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  loading: boolean
  initialized: boolean

  // Actions
  initialize: () => Promise<void>
  signUp: (email: string, password: string, displayName: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  profile: null,
  loading: false,
  initialized: false,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        set({ user: session.user, session, initialized: true })
      } else {
        set({ initialized: true })
      }

      // Listener para cambios de auth (login, logout, token refresh)
      supabase.auth.onAuthStateChange((_event, session) => {
        set({
          user: session?.user ?? null,
          session: session ?? null,
        })
      })
    } catch (error) {
      console.error('Error inicializando auth:', error)
      set({ initialized: true })
    }
  },

  signUp: async (email, password, displayName) => {
    set({ loading: true })
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
        },
      })
      if (error) throw error
      set({ user: data.user, session: data.session })
    } finally {
      set({ loading: false })
    }
  },

  signIn: async (email, password) => {
    set({ loading: true })
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      set({ user: data.user, session: data.session })
    } finally {
      set({ loading: false })
    }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null, profile: null })
  },
}))
