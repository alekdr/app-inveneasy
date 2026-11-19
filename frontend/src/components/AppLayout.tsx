import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Outlet } from 'react-router-dom'
import {
  IoGridOutline,
  IoShirtOutline,
  IoCheckboxOutline,
  IoWalletOutline,
  IoFlameOutline,
  IoCalendarOutline,
  IoHeartOutline,
  IoFlagOutline,
  IoLogOutOutline,
  IoSettingsOutline,
  IoSearchOutline,
  IoRestaurantOutline,
} from 'react-icons/io5'
import BottomTabBar from './BottomTabBar'
import SpotlightSearch from './SpotlightSearch'
import ConfirmModal from './ConfirmModal'
import { confirmDialog } from '../stores/confirmStore'
import { useAuthStore } from '../stores/authStore'
import { Toaster, toast } from 'sonner'
import { motion } from 'motion/react'
import { useState, useEffect } from 'react'

const navItems = [
  { path: '/', label: 'Inicio', icon: <IoGridOutline size={18} /> },
  { path: '/closet', label: 'Armario', icon: <IoShirtOutline size={18} /> },
  { path: '/routines', label: 'Rutinas', icon: <IoCheckboxOutline size={18} /> },
  { path: '/finances', label: 'Finanzas', icon: <IoWalletOutline size={18} /> },
  { path: '/habits', label: 'Hábitos', icon: <IoFlameOutline size={18} /> },
  { path: '/calendar', label: 'Calendario', icon: <IoCalendarOutline size={18} /> },
  { path: '/goals', label: 'Metas', icon: <IoFlagOutline size={18} /> },
  { path: '/wishlist', label: 'Deseos', icon: <IoHeartOutline size={18} /> },
  { path: '/recipes', label: 'Recetas', icon: <IoRestaurantOutline size={18} /> },
  { path: '/settings', label: 'Configuración', icon: <IoSettingsOutline size={18} /> },
]

export default function AppLayout() {
  const { user, signOut } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [isSpotlightOpen, setIsSpotlightOpen] = useState(false)

  // Atajo de teclado (Cmd+K / Ctrl+K) y evento personalizado
  useEffect(() => {
    const handleOpen = () => setIsSpotlightOpen(true)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsSpotlightOpen((prev) => !prev)
      }
    }
    window.addEventListener('inven_open_spotlight', handleOpen)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('inven_open_spotlight', handleOpen)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const handleSignOut = async () => {
    const ok = await confirmDialog({
      title: 'Cerrar Sesión',
      message: '¿Estás seguro de que deseas cerrar sesión?',
      confirmText: 'Cerrar sesión',
      danger: true,
    })
    if (!ok) return
    await signOut()
    toast.success('Sesión finalizada')
    navigate('/auth')
  }

  return (
    <div className="flex min-h-dvh w-full max-w-full overflow-x-hidden bg-[#fbfaf8] text-[#222224] transition-colors dark:bg-[#121214] dark:text-[#f3f3f5]">
      {/* Toast provider de Sonner */}
      <Toaster position="top-center" richColors theme="system" />

      {/* Accesibilidad: saltar al contenido principal */}
      <a href="#main-content" className="skip-link">
        Saltar al contenido
      </a>

      {/* ============================================================== */}
      {/* DESKTOP SIDEBAR                                                */}
      {/* ============================================================== */}
      <aside className="hidden md:flex md:w-64 lg:w-72 flex-col justify-between border-r border-[#eeece8] bg-white/70 p-5 backdrop-blur-xl dark:border-[#222226] dark:bg-[#18181b]/70 sticky top-0 h-dvh">
        <div className="flex flex-col gap-7">
          {/* Logo y título Web */}
          <div className="flex items-center gap-3 px-2">
            <img
              src="/logo.png"
              alt="InvenEasy"
              className="h-8 w-8 rounded-xl object-contain shadow-xs"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none'
              }}
            />
            <div>
              {/* Botón de búsqueda en sidebar desktop */}
              <button
                onClick={() => setIsSpotlightOpen(true)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                aria-label="Buscar en InvenEasy"
                title="Buscar (Cmd+K / Ctrl+K)"
              >
                <IoSearchOutline size={16} className="text-slate-500 dark:text-slate-400" />
              </button>
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                InvenEasy
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">Personal Vault</p>
            </div>
          </div>

          {/* Menú de navegación lateral */}
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`relative flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-bold transition-all select-none ${
                    isActive
                      ? 'text-slate-900 dark:text-white'
                      : 'text-slate-500 hover:bg-slate-100/60 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/40 dark:hover:text-slate-200'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-pill-desktop"
                      transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                      className="absolute inset-0 rounded-2xl bg-[#f0eeff] dark:bg-violet-950/40 border border-[#e2dcfc] dark:border-violet-800/50"
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-3">
                    {item.icon}
                    {item.label}
                  </span>
                </NavLink>
              )
            })}
          </nav>
        </div>

        {/* Footer Sidebar Usuario */}
        {user ? (
          <div className="rounded-2xl border border-slate-200/60 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-xs font-bold text-white uppercase shrink-0 dark:bg-white dark:text-slate-900">
                  {user.email?.charAt(0) || 'U'}
                </div>
                <div className="truncate">
                  <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-100">
                    {user.user_metadata?.display_name || user.email?.split('@')[0]}
                  </p>
                  <p className="truncate text-[10px] text-slate-400 font-medium">
                    {user.email}
                  </p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                title="Cerrar sesión"
                className="rounded-xl p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition"
              >
                <IoLogOutOutline size={18} />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => navigate('/auth')}
            className="w-full rounded-2xl bg-slate-900 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition dark:bg-white dark:text-slate-900"
          >
            Iniciar Sesión
          </button>
        )}
      </aside>

      {/* ============================================================== */}
      {/* CONTENEDOR PRINCIPAL: Responsive                               */}
      {/* ============================================================== */}
      <div className="flex flex-1 flex-col min-w-0 overflow-x-hidden">
        {/* Top Navbar en Móvil */}
        <header className="safe-top sticky top-0 z-40 border-b border-[#eeece8] bg-white/80 backdrop-blur-xl md:hidden dark:border-[#222226] dark:bg-[#18181b]/80">
          <div className="flex h-14 items-center justify-center gap-2 px-4">
            <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
              InvenEasy
            </span>
            <button
              onClick={() => setIsSpotlightOpen(true)}
              className="rounded-lg p-2 hover:bg-slate-100 transition dark:hover:bg-slate-800"
              aria-label="Buscar en InvenEasy"
              title="Buscar (Cmd+K / Ctrl+K)"
            >
              <IoSearchOutline size={18} className="text-slate-500 dark:text-slate-400" />
            </button>
          </div>
        </header>

        {/* Contenido Adaptativo */}
        <main
          id="main-content"
          tabIndex={-1}
          className="pb-safe-tabbar flex-1 px-4 py-5 md:px-8 md:py-8 lg:px-12 max-w-6xl w-full mx-auto min-w-0"
        >
          <Outlet />
        </main>

        {/* Bottom Tab Bar en Móviles */}
        <div className="md:hidden">
          <BottomTabBar />
        </div>
      </div>

      {/* Global Spotlight Search */}
      <SpotlightSearch
        isOpen={isSpotlightOpen}
        onClose={() => setIsSpotlightOpen(false)}
      />

      {/* Global In-App Confirm Dialog */}
      <ConfirmModal />
    </div>
  )
}
