import { useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useNavigate } from 'react-router-dom'
import {
  IoEyeSharp as Eye,
  IoEyeOffSharp as EyeOff,
  IoLogInSharp as LogIn,
  IoPersonAddSharp as UserPlus,
} from 'react-icons/io5'

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const { signIn, signUp, loading } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      if (isLogin) {
        await signIn(email, password)
      } else {
        if (!displayName.trim()) {
          setError('Ingresa tu nombre')
          return
        }
        await signUp(email, password, displayName)
      }
      navigate('/')
    } catch (err: any) {
      setError(err.message || 'Error de autenticación')
    }
  }

  return (
    <div className="flex min-h-[80dvh] flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-violet-600 dark:text-violet-400">
          InvenEasy
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Orden y crecimiento personal
        </p>
      </div>

      {/* Card del form */}
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 text-xl font-semibold text-slate-800 dark:text-slate-100">
          {isLogin ? 'Iniciar sesión' : 'Crear cuenta'}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* Nombre (solo registro) */}
          {!isLogin && (
            <input
              type="text"
              placeholder="Tu nombre"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:focus:ring-violet-900"
            />
          )}

          {/* Email */}
          <input
            type="email"
            placeholder="correo@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:focus:ring-violet-900"
          />

          {/* Password */}
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:focus:ring-violet-900"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Error */}
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : isLogin ? (
              <>
                <LogIn size={18} />
                Entrar
              </>
            ) : (
              <>
                <UserPlus size={18} />
                Crear cuenta
              </>
            )}
          </button>
        </form>

        {/* Toggle login/register */}
        <p className="mt-4 text-center text-xs text-slate-400">
          {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
          <button
            onClick={() => {
              setIsLogin(!isLogin)
              setError('')
            }}
            className="font-semibold text-violet-600 hover:underline dark:text-violet-400"
          >
            {isLogin ? 'Regístrate' : 'Inicia sesión'}
          </button>
        </p>
      </div>
    </div>
  )
}
