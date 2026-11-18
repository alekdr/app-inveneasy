import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IoShirtOutline,
  IoCheckboxOutline,
  IoWalletOutline,
  IoFlameOutline,
  IoCalendarOutline,
  IoHeartOutline,
  IoArrowForward,
  IoFlashSharp as ZapIcon,
} from 'react-icons/io5'
import { supabase } from '../services/supabase'
import { fetchHabits } from '../services/supabase'
import { triggerHaptic } from '../services/capacitor'
import { formatCurrency } from '../services/currency'
import { toast } from 'sonner'
import type { HabitWithProgress, FinancialTransaction } from '../types'

const spaces = [
  {
    name: 'Armario',
    description: 'Prendas, calzado, aseo y accesorios organizados',
    path: '/closet',
    tag: 'Colección',
    icon: <IoShirtOutline size={22} />,
    badgeColor: 'bg-[#e9e5f5] text-[#5a48ab]',
  },
  {
    name: 'Rutinas',
    description: 'Seguimiento por día con porcentaje de cumplimiento',
    path: '/routines',
    tag: 'Diario',
    icon: <IoCheckboxOutline size={22} />,
    badgeColor: 'bg-[#e2f4ec] text-[#2b7a5a]',
  },
  {
    name: 'Finanzas',
    description: 'Ingresos, gastos, compras, presupuestos y conversor',
    path: '/finances',
    tag: 'Orden',
    icon: <IoWalletOutline size={22} />,
    badgeColor: 'bg-[#fae8df] text-[#9c5936]',
  },
  {
    name: 'Hábitos',
    description: 'Rachas consecutivas y progreso personal medible',
    path: '/habits',
    tag: 'Enfoque',
    icon: <IoFlameOutline size={22} />,
    badgeColor: 'bg-[#e3edf7] text-[#38628b]',
  },
  {
    name: 'Calendario',
    description: 'Eventos, recordatorios y tareas por fecha',
    path: '/calendar',
    tag: 'Agenda',
    icon: <IoCalendarOutline size={22} />,
    badgeColor: 'bg-[#f5f2eb] text-[#615949]',
  },
  {
    name: 'Deseos',
    description: 'Lista de compras futuras con fotos y presupuesto',
    path: '/wishlist',
    tag: 'Wishlist',
    icon: <IoHeartOutline size={22} />,
    badgeColor: 'bg-[#fae8f3] text-[#8e3871]',
  },
]

function parseCOP(value: string): number {
  const v = value.trim().replace(/\./g, '').replace(/,/g, '.')
  return parseFloat(v) || 0
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const todayStr = new Date().toISOString().split('T')[0]

  // Resumen de Hoy
  const [habits, setHabits] = useState<HabitWithProgress[]>([])
  const [balance, setBalance] = useState<number>(0)
  const [todayExpense, setTodayExpense] = useState<number>(0)

  // Modal Gasto Rápido
  const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState(false)
  const [quickAmount, setQuickAmount] = useState('')
  const [quickCategory, setQuickCategory] = useState('Alimentación')
  const [quickDesc, setQuickDesc] = useState('')
  const [savingQuick, setSavingQuick] = useState(false)

  const loadTodayStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Hábitos de hoy
      const hbData = await fetchHabits(todayStr)
      setHabits(hbData || [])

      // Transacciones para balance y gasto de hoy
      const { data: trans } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('user_id', user.id)

      if (trans) {
        const typedTrans = trans as FinancialTransaction[]
        const inc = typedTrans.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount || 0), 0)
        const exp = typedTrans.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0)
        setBalance(inc - exp)

        const tdExp = typedTrans
          .filter(t => t.type === 'expense' && t.transaction_date === todayStr)
          .reduce((s, t) => s + Number(t.amount || 0), 0)
        setTodayExpense(tdExp)
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadTodayStats()
  }, [])

  const handleSaveQuickExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickAmount) return
    setSavingQuick(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await triggerHaptic()
      const rawValue = parseCOP(quickAmount)
      const { error } = await supabase.from('financial_transactions').insert({
        user_id: user.id,
        type: 'expense',
        amount: rawValue,
        category: quickCategory,
        description: quickDesc || null,
        transaction_date: todayStr,
      })
      if (error) throw error
      toast.success('Gasto rápido registrado')
      setIsQuickExpenseOpen(false)
      setQuickAmount('')
      setQuickDesc('')
      await loadTodayStats()
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar gasto')
    } finally {
      setSavingQuick(false)
    }
  }

  const completedHabits = habits.filter(h => h.status === 'completed').length
  const habitPercent = habits.length > 0 ? Math.round((completedHabits / habits.length) * 100) : 0

  return (
    <div className="flex flex-col gap-6">
      {/* Editorial Welcome Header */}
      <div className="rounded-3xl border border-[#eeece8] bg-white p-6 md:p-8 shadow-xs dark:border-[#222226] dark:bg-[#18181b]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col gap-1 max-w-xl">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              InvenEasy
            </span>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Hola de nuevo
            </h2>
            <p className="text-xs md:text-sm text-slate-500 font-medium leading-relaxed dark:text-slate-400">
              Tu centro de orden y crecimiento. Revisa tus pendientes y mantén tus cuentas al día.
            </p>
          </div>

          <button
            onClick={() => setIsQuickExpenseOpen(true)}
            className="self-start sm:self-auto inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-rose-700 active:scale-95"
          >
            <ZapIcon size={15} />
            <span>+ Gasto Rápido</span>
          </button>
        </div>
      </div>

      {/* Widgets de Resumen de Hoy */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Widget Hábitos de Hoy */}
        <div
          onClick={() => navigate('/habits')}
          className="cursor-pointer rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
              <IoFlameOutline size={15} className="text-amber-500" /> Hábitos de Hoy
            </span>
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              {completedHabits}/{habits.length}
            </span>
          </div>

          <div className="flex items-baseline justify-between mb-2">
            <span className="text-lg font-extrabold text-slate-900 dark:text-white">
              {habitPercent}% completado
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {habits.length - completedHabits} pendientes
            </span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-amber-500 transition-all duration-500"
              style={{ width: `${habitPercent}%` }}
            />
          </div>
        </div>

        {/* Widget Finanzas de Hoy */}
        <div
          onClick={() => navigate('/finances')}
          className="cursor-pointer rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
              <IoWalletOutline size={15} className="text-emerald-500" /> Finanzas
            </span>
            <span className="text-[11px] font-bold text-slate-400">Hoy</span>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Gasto de hoy</p>
              <p className="text-lg font-extrabold text-rose-600 dark:text-rose-400">
                {formatCurrency(todayExpense, 'COP')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 font-medium">Saldo disponible</p>
              <p className={`text-base font-bold ${balance >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600'}`}>
                {formatCurrency(balance, 'COP')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Secciones */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Espacios
          </h3>
          <span className="text-xs font-semibold text-slate-400">
            {spaces.length} módulos
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {spaces.map((space) => (
            <div
              key={space.name}
              onClick={() => navigate(space.path)}
              className="group flex flex-col justify-between rounded-3xl border border-slate-200/70 bg-white p-5 shadow-xs transition-all hover:border-slate-300 hover:shadow-md active:scale-[0.98] cursor-pointer dark:border-slate-800 dark:bg-slate-900"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl ${space.badgeColor}`}
                  >
                    {space.icon}
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    {space.tag}
                  </span>
                </div>

                <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                  {space.name}
                </h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed dark:text-slate-400">
                  {space.description}
                </p>
              </div>

              <div className="mt-5 flex items-center justify-between pt-3 border-t border-slate-100 text-xs font-bold text-slate-700 dark:border-slate-800 dark:text-slate-300">
                <span>Entrar</span>
                <div className="transition-transform group-hover:translate-x-1">
                  <IoArrowForward size={14} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Gasto Rápido */}
      {isQuickExpenseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
                <ZapIcon size={18} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Gasto Rápido</h3>
                <p className="text-[11px] text-slate-400">Se guardará con la fecha de hoy</p>
              </div>
            </div>

            <form onSubmit={handleSaveQuickExpense} className="flex flex-col gap-3.5">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Monto (COP)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Ej. 15.000"
                  value={quickAmount}
                  onChange={e => setQuickAmount(e.target.value)}
                  required
                  autoFocus
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-bold outline-none focus:border-slate-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Categoría
                </label>
                <select
                  value={quickCategory}
                  onChange={e => setQuickCategory(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="Alimentación">Alimentación</option>
                  <option value="Transporte">Transporte</option>
                  <option value="Ropa / Armario">Ropa / Armario</option>
                  <option value="Servicios">Servicios</option>
                  <option value="Ocio y Salidas">Ocio y Salidas</option>
                  <option value="General">General / Otro</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Descripción (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. Tinto, merienda, taxi..."
                  value={quickDesc}
                  onChange={e => setQuickDesc(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium outline-none focus:border-slate-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsQuickExpenseOpen(false)}
                  className="flex-1 rounded-2xl border border-slate-200 py-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingQuick}
                  className="flex-1 rounded-2xl bg-rose-600 py-3 text-xs font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"
                >
                  {savingQuick ? 'Guardando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
