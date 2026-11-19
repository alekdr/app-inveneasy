import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock de Supabase (evita llamadas reales)
const mockGetSession = vi.fn()
const mockOnAuthStateChange = vi.fn()
const mockSignUp = vi.fn()
const mockSignIn = vi.fn()
const mockSignOut = vi.fn()

vi.mock('../../services/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signInWithPassword: (...args: unknown[]) => mockSignIn(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
    },
  },
}))

import { useAuthStore } from '../authStore'

describe('authStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      user: null,
      session: null,
      profile: null,
      loading: false,
      initialized: false,
    })
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
  })

  it('inicializa sin sesión', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })

    await useAuthStore.getState().initialize()

    expect(mockGetSession).toHaveBeenCalledOnce()
    expect(useAuthStore.getState().initialized).toBe(true)
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('inicializa con sesión existente', async () => {
    const user = { id: 'u1', email: 'test@example.com' }
    const session = { user, access_token: 'token' }
    mockGetSession.mockResolvedValue({ data: { session } })

    await useAuthStore.getState().initialize()

    expect(useAuthStore.getState().user).toEqual(user)
    expect(useAuthStore.getState().session).toEqual(session)
    expect(useAuthStore.getState().initialized).toBe(true)
  })

  it('marca initialized aunque getSession falle', async () => {
    mockGetSession.mockRejectedValue(new Error('boom'))
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await useAuthStore.getState().initialize()

    expect(useAuthStore.getState().initialized).toBe(true)
    spy.mockRestore()
  })

  it('signIn guarda usuario y sesión', async () => {
    const user = { id: 'u1', email: 'test@example.com' }
    const session = { user, access_token: 'token' }
    mockSignIn.mockResolvedValue({ data: { user, session }, error: null })

    await useAuthStore.getState().signIn('test@example.com', 'secret')

    expect(mockSignIn).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'secret',
    })
    expect(useAuthStore.getState().user).toEqual(user)
    expect(useAuthStore.getState().loading).toBe(false)
  })

  it('signIn lanza error y libera loading', async () => {
    mockSignIn.mockResolvedValue({
      data: { user: null, session: null },
      error: new Error('Credenciales inválidas'),
    })

    await expect(useAuthStore.getState().signIn('x@y.com', 'bad')).rejects.toThrow(
      'Credenciales inválidas'
    )
    expect(useAuthStore.getState().loading).toBe(false)
  })

  it('signOut limpia el estado', async () => {
    useAuthStore.setState({
      user: { id: 'u1' } as never,
      session: { access_token: 't' } as never,
      profile: { id: 'u1' } as never,
    })
    mockSignOut.mockResolvedValue({ error: null })

    await useAuthStore.getState().signOut()

    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().session).toBeNull()
    expect(useAuthStore.getState().profile).toBeNull()
  })
})
