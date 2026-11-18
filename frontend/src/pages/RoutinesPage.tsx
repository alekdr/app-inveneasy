import { useState, useEffect } from 'react'
import {
  IoAddOutline,
  IoCheckmarkOutline,
  IoCloseOutline,
  IoTimeOutline,
  IoTrashOutline,
  IoCalendarOutline,
  IoFlameOutline,
  IoStatsChartOutline,
} from 'react-icons/io5'
import CustomTimePicker from '../components/CustomTimePicker'
import { supabase } from '../services/supabase'
import { triggerHaptic, scheduleRoutineNotification } from '../services/capacitor'
import { toast } from 'sonner'
import { isOnline, addToOfflineQueue } from '../services/offlineSync'
import type { Routine, RoutineLog, RoutineWithStatus } from '../types'

export default function RoutinesPage() {
  const [routines, setRoutines] = useState<RoutineWithStatus[]>([])
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)

  // Estadísticas de consistencia
  const [completedDaysStreak, setCompletedDaysStreak] = useState(0)
  const [totalCompletedLogs, setTotalCompletedLogs] = useState(0)

  // Modal nueva rutina
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [timeOfDay, setTimeOfDay] = useState('')
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [saving, setSaving] = useState(false)

  const loadRoutines = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userRoutines, error: rError } = await supabase
        .from('routines')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true })

      if (rError) throw rError

      const { data: logs, error: lError } = await supabase
        .from('routine_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('log_date', selectedDate)

      if (lError) throw lError

      const mapped: RoutineWithStatus[] = (userRoutines || []).map((r: Routine) => {
        const foundLog = (logs || []).find((l: RoutineLog) => l.routine_id === r.id)
        return {
          ...r,
          status: foundLog ? foundLog.status : 'pending',
          logId: foundLog?.id,
        }
      })

      setRoutines(mapped)

      // Cargar logs históricos para racha de consistencia
      const { data: allLogs } = await supabase
        .from('routine_logs')
        .select('log_date, status')
        .eq('user_id', user.id)
        .eq('status', 'completed')

      if (allLogs) {
        setTotalCompletedLogs(allLogs.length)

        // Contar días consecutivos con al menos una rutina completada
        const uniqueDates = Array.from(new Set(allLogs.map(l => l.log_date))).sort().reverse()
        let streak = 0
        const checkDate = new Date()

        for (let i = 0; i < 30; i++) {
          const dStr = checkDate.toISOString().split('T')[0]
          if (uniqueDates.includes(dStr)) {
            streak++
            checkDate.setDate(checkDate.getDate() - 1)
          } else {
            // Permitir que hoy aún no esté completado si apenas está empezando el día
            if (i === 0) {
              checkDate.setDate(checkDate.getDate() - 1)
              continue
            }
            break
          }
        }
        setCompletedDaysStreak(streak)
      }
    } catch {
      toast.error('Error cargando rutinas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRoutines()
  }, [selectedDate])

  const handleToggleStatus = async (routine: RoutineWithStatus, newStatus: 'completed' | 'uncompleted' | 'pending') => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await triggerHaptic()
      const targetStatus = routine.status === newStatus ? 'pending' : newStatus

      // Actualizar UI inmediatamente
      setRoutines((prev) =>
        prev.map((r) => (r.id === routine.id ? { ...r, status: targetStatus } : r))
      )

      if (!isOnline()) {
        addToOfflineQueue({
          table: 'routine_logs',
          action: 'upsert',
          payload: {
            routine_id: routine.id,
            user_id: user.id,
            log_date: selectedDate,
            status: targetStatus,
            updated_at: new Date().toISOString(),
          },
          options: { onConflict: 'routine_id,log_date' },
        })
        if (targetStatus === 'completed') toast.success('Rutina completada (sin conexión, se sincronizará)')
        return
      }

      const { error } = await supabase
        .from('routine_logs')
        .upsert(
          {
            routine_id: routine.id,
            user_id: user.id,
            log_date: selectedDate,
            status: targetStatus,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'routine_id,log_date' }
        )

      if (error) throw error

      if (targetStatus === 'completed') {
        toast.success('Rutina completada')
        setTotalCompletedLogs(prev => prev + 1)
      }
    } catch {
      toast.error('Error al actualizar rutina')
    }
  }

  const handleCreateRoutine = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Inicia sesión para crear rutinas')

      const { error } = await supabase
        .from('routines')
        .insert({
          user_id: user.id,
          title: title.trim(),
          time_of_day: timeOfDay || null,
          frequency,
        })

      if (error) throw error

      // Programar recordatorio local si tiene hora
      if (timeOfDay && timeOfDay.includes(':')) {
        const [h, m] = timeOfDay.split(':').map(Number)
        if (!isNaN(h) && !isNaN(m)) {
          const notifId = Math.floor(Math.random() * 100000)
          await scheduleRoutineNotification(
            notifId,
            `Recordatorio: ${title.trim()}`,
            'Es hora de realizar tu rutina diaria en InvenEasy.',
            h,
            m
          )
        }
      }

      await triggerHaptic()
      toast.success('Rutina creada')
      setIsModalOpen(false)
      setTitle('')
      setTimeOfDay('')
      await loadRoutines()
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteRoutine = async (id: string) => {
    if (!confirm('¿Eliminar esta rutina?')) return
    try {
      await supabase.from('routines').delete().eq('id', id)
      await triggerHaptic()
      toast.success('Rutina eliminada')
      setRoutines((prev) => prev.filter((r) => r.id !== id))
    } catch {
      toast.error('Error al eliminar')
    }
  }

  const total = routines.length
  const completed = routines.filter((r) => r.status === 'completed').length
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Rutinas Diarias
          </h2>
          <p className="text-xs text-slate-400 font-medium">Historial, consistencia y progreso</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 active:scale-95 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
        >
          <IoAddOutline size={16} />
          <span>Nueva rutina</span>
        </button>
      </div>

      {/* Panel de Estadísticas y Consistencia */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#e2f4ec] text-[#2b7a5a]">
            <IoFlameOutline size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Racha de días</span>
            <p className="text-base font-extrabold text-slate-900 dark:text-white">
              {completedDaysStreak} {completedDaysStreak === 1 ? 'día' : 'días'} seguidos
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#e9e5f5] text-[#5a48ab]">
            <IoStatsChartOutline size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Completadas</span>
            <p className="text-base font-extrabold text-slate-900 dark:text-white">
              {totalCompletedLogs} rutinas
            </p>
          </div>
        </div>
      </div>

      {/* Selector de Fecha */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
          <IoCalendarOutline size={16} className="text-[#6b5ce7]" />
          <span>Fecha seleccionada</span>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        />
      </div>

      {/* Progreso del día */}
      <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Cumplimiento del día
          </span>
          <span className="text-xs font-bold text-[#6b5ce7] dark:text-violet-400">
            {completed} de {total} ({progressPercent}%)
          </span>
        </div>

        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-[#6b5ce7] transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Lista de rutinas */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800 dark:border-slate-700 dark:border-t-white" />
        </div>
      ) : routines.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white/50 p-12 text-center text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-900/40">
          No tienes rutinas registradas. Pulsa "Nueva rutina" para empezar.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {routines.map((routine) => {
            const isDone = routine.status === 'completed'
            const isUncompleted = routine.status === 'uncompleted'

            return (
              <div
                key={routine.id}
                className={`flex items-center justify-between rounded-2xl border p-4 shadow-xs transition ${
                  isDone
                    ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20'
                    : isUncompleted
                    ? 'border-rose-200 bg-rose-50/40 dark:border-rose-900/40 dark:bg-rose-950/20'
                    : 'border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <button
                    onClick={() => handleToggleStatus(routine, 'completed')}
                    className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition ${
                      isDone
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-slate-300 hover:border-slate-600 dark:border-slate-600'
                    }`}
                  >
                    {isDone && <IoCheckmarkOutline size={16} strokeWidth={2.5} />}
                  </button>

                  <div>
                    <p
                      className={`text-xs font-bold transition ${
                        isDone
                          ? 'text-slate-400 line-through dark:text-slate-500'
                          : 'text-slate-800 dark:text-slate-100'
                      }`}
                    >
                      {routine.title}
                    </p>
                    {routine.time_of_day && (
                      <p className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                        <IoTimeOutline size={12} />
                        {routine.time_of_day.slice(0, 5)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleStatus(routine, 'uncompleted')}
                    title="No cumplida"
                    className={`rounded-xl p-1.5 transition ${
                      isUncompleted
                        ? 'bg-rose-500 text-white'
                        : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <IoCloseOutline size={16} />
                  </button>

                  <button
                    onClick={() => handleDeleteRoutine(routine.id)}
                    className="rounded-xl p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 transition"
                  >
                    <IoTrashOutline size={16} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Nueva Rutina */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-sm my-auto max-h-[92vh] overflow-y-auto rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 scrollbar-thin">
            <h3 className="mb-4 font-bold text-slate-900 dark:text-white text-base">
              Nueva Rutina
            </h3>

            <form onSubmit={handleCreateRoutine} className="flex flex-col gap-3.5">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Nombre
                </label>
                <input
                  type="text"
                  placeholder="Ej. Meditación, Lectura 20 min..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  autoFocus
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Hora (Opcional - Notificación móvil)
                </label>
                <CustomTimePicker
                  value={timeOfDay}
                  onChange={(val) => setTimeOfDay(val)}
                  placeholder="Elige una hora (ej. 08:30 AM)"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Frecuencia
                </label>
                <select
                  value={frequency}
                  onChange={(e: any) => setFrequency(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="daily">Diaria</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensual</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 rounded-2xl border border-slate-200 py-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !title.trim()}
                  className="flex-1 rounded-2xl bg-slate-900 py-3 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900"
                >
                  {saving ? 'Guardando...' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
