import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from './stores/authStore'

// Layout
import AppLayout from './components/AppLayout'

// Pages
import DashboardPage from './pages/DashboardPage'
import AuthPage from './pages/AuthPage'
import ClosetPage from './pages/ClosetPage'
import SubcategoriesPage from './pages/SubcategoriesPage'
import ItemsPage from './pages/ItemsPage'
import RoutinesPage from './pages/RoutinesPage'
import FinancesPage from './pages/FinancesPage'
import HabitsPage from './pages/HabitsPage'
import CalendarPage from './pages/CalendarPage'

function App() {
  const initialize = useAuthStore((s) => s.initialize)
  const initialized = useAuthStore((s) => s.initialized)
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    initialize()
  }, [initialize])

  if (!initialized) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
          <p className="text-sm text-slate-500">Cargando InvenEasy...</p>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Auth (sin layout) */}
        <Route path="/auth" element={!user ? <AuthPage /> : <Navigate to="/" />} />

        {/* App principal (con layout + tab bar) */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          
          {/* Flujo Armario */}
          <Route path="/closet" element={<ClosetPage />} />
          <Route path="/closet/:categoryId" element={<SubcategoriesPage />} />
          <Route path="/closet/:categoryId/:subId" element={<ItemsPage />} />

          {/* Rutinas Diarias */}
          <Route path="/routines" element={<RoutinesPage />} />

          {/* Finanzas */}
          <Route path="/finances" element={<FinancesPage />} />

          {/* Hábitos y Calendario */}
          <Route path="/habits" element={<HabitsPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
