import { useEffect, useState } from 'react'
import {
  IoSparklesOutline,
  IoCheckboxOutline,
  IoWalletOutline,
  IoFlameOutline,
  IoCloseOutline,
} from 'react-icons/io5'
import { supabase } from '../services/supabase'
import { formatCurrency } from '../services/currency'

interface WeeklyWrapData {
  routinesPercent: number
  totalSavedOrNet: number
  maxStreak: number
}

export default function WeeklyWrapCard() {
  const [data, setData] = useState<WeeklyWrapData | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(true)

  // Verificamos si es domingo (0 = Domingo) o si ya fue descartado en esta sesión
  const isSunday = new Date().getDay() === 0

  useEffect(() => {
    // Si ya lo cerró en esta semana, no mostrar
    const dismissedWeek = localStorage.getItem('inven_weekly_wrap_dismissed')
    const currentWeekKey = getWeekKey(new Date())
    if (dismissedWeek === currentWeekKey) {
      setDismissed(true)
      setLoading(false)
      return
    }

    loadWeeklyStats()
  }, [])

  function getWeekKey(d: Date) {
    const year = d.getFullYear()
    const firstDayOfYear = new Date(year, 0, 1)
    const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000
    const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
    return `${year}-W${weekNum}`
  }

  const loadWeeklyStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // Fecha de hace 7 días
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const sevenDaysStr = sevenDaysAgo.toISOString().split('T')[0]
      const todayStr = new Date().toISOString().split('T')[0]

      // 1. Rutinas de la semana
      const { data: routineLogs } = await supabase
        .from('routine_logs')
        .select('status')
        .eq('user_id', user.id)
        .gte('log_date', sevenDaysStr)
        .lte('log_date', todayStr)

      let routinesPercent = 100
      if (routineLogs && routineLogs.length > 0) {
        const completed = routineLogs.filter((l) => l.status === 'completed').length
        routinesPercent = Math.round((completed / routineLogs.length) * 100)
      }

      // 2. Transacciones de la semana (Neto ahorrado)
      const { data: trans } = await supabase
        .from('financial_transactions')
        .select('type, amount')
        .eq('user_id', user.id)
        .gte('transaction_date', sevenDaysStr)
        .lte('transaction_date', todayStr)

      let totalSavedOrNet = 0
      if (trans && trans.length > 0) {
        const inc = trans.filter((t) => t.type === 'income').reduce((acc, t) => acc + Number(t.amount || 0), 0)
        const exp = trans.filter((t) => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount || 0), 0)
        totalSavedOrNet = Math.max(0, inc - exp)
      }

      // 3. Rachas de hábitos
      const { data: habitLogs } = await supabase
        .from('habit_logs')
        .select('status')
        .eq('user_id', user.id)
        .eq('status', 'completed')

      // Cálculo aproximado o lectura de racha
      const maxStreak = habitLogs ? Math.min(30, habitLogs.length) : 0

      setData({
        routinesPercent,
        totalSavedOrNet,
        maxStreak,
      })
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const handleDismiss = () => {
    const currentWeekKey = getWeekKey(new Date())
    localStorage.setItem('inven_weekly_wrap_dismissed', currentWeekKey)
    setDismissed(true)
  }

  if (dismissed || loading || !data) return null

  // Mostrar los domingos por la noche (o si hay datos relevantes para revisar)
  // Siempre visible los domingos, o con badge si el usuario quiere inspeccionar
  return (
    <div className="relative overflow-hidden rounded-3xl border border-violet-200/90 bg-gradient-to-br from-[#f2efff] via-[#f7f5ff] to-white p-5 shadow-xs transition-all dark:border-violet-900/40 dark:from-[#1d1b2e] dark:via-[#181622] dark:to-[#121214]">
      {/* Botón cerrar */}
      <button
        onClick={handleDismiss}
        className="absolute top-4 right-4 rounded-xl p-1.5 text-slate-400 hover:bg-black/5 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200"
        title="Ocultar resumen"
      >
        <IoCloseOutline size={18} />
      </button>

      {/* Header */}
      <div className="flex items-center gap-2 text-violet-700 dark:text-violet-400">
        <IoSparklesOutline size={16} />
        <span className="text-[11px] font-bold uppercase tracking-wider">
          {isSunday ? 'Resumen Dominical Automático' : 'Resumen Semanal'}
        </span>
      </div>

      {/* Frase central pedida por el usuario */}
      <h3 className="mt-2 text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
        Esta semana completaste el <span className="text-emerald-600 dark:text-emerald-400">{data.routinesPercent}%</span> de tus rutinas,{' '}
        ahorraste <span className="text-violet-600 dark:text-violet-400">{formatCurrency(data.totalSavedOrNet, 'COP')}</span> y tu racha de hábitos es de{' '}
        <span className="text-amber-600 dark:text-amber-400">{data.maxStreak} {data.maxStreak === 1 ? 'día' : 'días'}</span>.
      </h3>

      {/* Métricas en pastillas */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center justify-center rounded-2xl bg-white/80 p-2.5 text-center shadow-2xs dark:bg-slate-900/60">
          <IoCheckboxOutline size={16} className="text-emerald-600" />
          <span className="mt-1 text-[10px] font-bold text-slate-400 uppercase">Rutinas</span>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{data.routinesPercent}%</span>
        </div>

        <div className="flex flex-col items-center justify-center rounded-2xl bg-white/80 p-2.5 text-center shadow-2xs dark:bg-slate-900/60">
          <IoWalletOutline size={16} className="text-violet-600" />
          <span className="mt-1 text-[10px] font-bold text-slate-400 uppercase">Ahorro</span>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate w-full">
            {formatCurrency(data.totalSavedOrNet, 'COP')}
          </span>
        </div>

        <div className="flex flex-col items-center justify-center rounded-2xl bg-white/80 p-2.5 text-center shadow-2xs dark:bg-slate-900/60">
          <IoFlameOutline size={16} className="text-amber-600" />
          <span className="mt-1 text-[10px] font-bold text-slate-400 uppercase">Racha</span>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{data.maxStreak}d</span>
        </div>
      </div>
    </div>
  )
}
