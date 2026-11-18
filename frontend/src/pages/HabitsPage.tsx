import { useState, useEffect } from 'react'
import {
  IoFlameSharp as Flame,
  IoAddSharp as Add,
  IoCheckmarkSharp as Check,
  IoPlayForwardSharp as Skip,
  IoTrashSharp as Trash,
  IoCloseCircleSharp as CloseCircle,
  IoAlertCircleOutline as WarningIcon,
} from 'react-icons/io5'
import {
  supabase,
  fetchHabits,
  createHabit,
  logHabitProgress,
  deleteHabit,
} from '../services/supabase'
import CustomTimePicker from '../components/CustomTimePicker'
import { triggerHaptic } from '../services/capacitor'
import { confirmDialog } from '../stores/confirmStore'
import { toast } from 'sonner'
import { isOnline, addToOfflineQueue } from '../services/offlineSync'
import type { HabitWithProgress } from '../types'

const PRESET_TEMPLATES = [
  { name: 'Beber 2L de Agua', unit: 'vasos', target: 8, is_measurable: true, color: '#38bdf8' },
  { name: 'Lectura 20 min', unit: 'min', target: 20, is_measurable: true, color: '#a855f7' },
  { name: 'Entrenamiento físico', unit: 'min', target: 45, is_measurable: true, color: '#f97316' },
  { name: 'Meditación', unit: 'min', target: 10, is_measurable: true, color: '#10b981' },
]

export default function HabitsPage() {
  const todayStr = new Date().toISOString().split('T')[0]
  const [habits, setHabits] = useState<HabitWithProgress[]>([])
  const [loading, setLoading] = useState(true)

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#6b5ce7')
  const [frequency, setFrequency] = useState('daily')
  const [reminderTime, setReminderTime] = useState('')
  const [isMeasurable, setIsMeasurable] = useState(false)
  const [targetValue, setTargetValue] = useState('1')
  const [unit, setUnit] = useState('veces')
  const [saving, setSaving] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await fetchHabits(todayStr)
      setHabits(data || [])
    } catch {
      toast.error('Error al cargar hábitos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const openCreateModal = () => {
    setName('')
    setColor('#6b5ce7')
    setFrequency('daily')
    setReminderTime('')
    setIsMeasurable(false)
    setTargetValue('1')
    setUnit('veces')
    setIsModalOpen(true)
  }

  const applyTemplate = (t: typeof PRESET_TEMPLATES[0]) => {
    setName(t.name)
    setColor(t.color)
    setIsMeasurable(t.is_measurable)
    setTargetValue(t.target.toString())
    setUnit(t.unit)
  }

  const handleCreateHabit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setSaving(true)
    try {
      await createHabit({
        name: name.trim(),
        color,
        frequency,
        reminder_time: reminderTime || undefined,
        is_measurable: isMeasurable,
        target_value: isMeasurable ? parseFloat(targetValue) || 1 : 1,
        unit: isMeasurable ? unit : undefined,
      })
      await triggerHaptic()
      toast.success('Hábito creado')
      setIsModalOpen(false)
      await loadData()
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar hábito')
    } finally {
      setSaving(false)
    }
  }

  // Marcar como completado
  const handleToggleComplete = async (habit: HabitWithProgress) => {
    const nextStatus = habit.status === 'completed' ? 'pending' : 'completed'
    const nextVal = nextStatus === 'completed' ? habit.target_value : 0
    try {
      await triggerHaptic()
      // Actualizar UI inmediatamente (optimistic update)
      setHabits((prev) =>
        prev.map((h) =>
          h.id === habit.id ? { ...h, status: nextStatus, progress_value: nextVal } : h
        )
      )
      if (!isOnline()) {
        const { data: { user } } = await supabase.auth.getUser()
        addToOfflineQueue({
          table: 'habit_logs',
          action: 'upsert',
          payload: {
            habit_id: habit.id,
            user_id: user?.id,
            log_date: todayStr,
            status: nextStatus,
            progress_value: nextVal,
            updated_at: new Date().toISOString(),
          },
          options: { onConflict: 'habit_id,log_date' },
        })
        if (nextStatus === 'completed') toast.success('¡Hábito completado! (sin conexión, se sincronizará)')
        return
      }
      await logHabitProgress(habit.id, todayStr, nextStatus, nextVal)
      await loadData()
      if (nextStatus === 'completed') toast.success('¡Hábito completado!')
    } catch {
      toast.error('Error al registrar progreso')
    }
  }

  // Incrementar meta medible (+1 toque)
  const handleIncrement = async (e: React.MouseEvent, habit: HabitWithProgress) => {
    e.stopPropagation()
    const nextVal = Math.min(habit.target_value, habit.progress_value + 1)
    const nextStatus = nextVal >= habit.target_value ? 'completed' : 'pending'
    try {
      await triggerHaptic()
      setHabits((prev) =>
        prev.map((h) =>
          h.id === habit.id ? { ...h, status: nextStatus, progress_value: nextVal } : h
        )
      )
      if (!isOnline()) {
        const { data: { user } } = await supabase.auth.getUser()
        addToOfflineQueue({
          table: 'habit_logs',
          action: 'upsert',
          payload: {
            habit_id: habit.id,
            user_id: user?.id,
            log_date: todayStr,
            status: nextStatus,
            progress_value: nextVal,
            updated_at: new Date().toISOString(),
          },
          options: { onConflict: 'habit_id,log_date' },
        })
        if (nextStatus === 'completed') toast.success('¡Meta diaria alcanzada! (sin conexión)')
        return
      }
      await logHabitProgress(habit.id, todayStr, nextStatus, nextVal)
      await loadData()
      if (nextStatus === 'completed') toast.success('¡Meta diaria alcanzada!')
    } catch {
      toast.error('Error al actualizar')
    }
  }

  // Saltar hábito con razón válida sin perder racha
  const handleSkipHabit = async (e: React.MouseEvent, habit: HabitWithProgress) => {
    e.stopPropagation()
    try {
      await triggerHaptic()
      await logHabitProgress(habit.id, todayStr, 'skipped', habit.progress_value)
      setHabits((prev) =>
        prev.map((h) => (h.id === habit.id ? { ...h, status: 'skipped' } : h))
      )
      toast.info('Hábito pausado hoy sin perder tu racha')
    } catch {
      toast.error('Error al saltar hábito')
    }
  }

  // Eliminar hábito
  const handleDeleteHabit = async (e: React.MouseEvent, habitId: string) => {
    e.stopPropagation()
    const ok = await confirmDialog({
      title: 'Eliminar Hábito',
      message: '¿Estás seguro de que deseas eliminar este hábito y todo su historial de progreso?',
      confirmText: 'Eliminar',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteHabit(habitId)
      await triggerHaptic()
      toast.success('Hábito eliminado')
      setHabits((prev) => prev.filter((h) => h.id !== habitId))
    } catch {
      toast.error('Error al eliminar')
    }
  }

  // Estadísticas del día
  const total = habits.length
  const completed = habits.filter((h) => h.status === 'completed').length
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0
  const maxStreak = habits.reduce((max, h) => Math.max(max, h.current_streak || 0), 0)
  const pendingHabits = habits.filter((h) => h.status === 'pending')

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Hábitos & Crecimiento
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            Construye disciplina, mide tus hábitos y mantén tus rachas
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 active:scale-95 dark:bg-white dark:text-slate-900"
        >
          <Add size={16} />
          <span>Crear hábito</span>
        </button>
      </div>

      {/* Cards de Resumen & Rachas */}
      <div className="grid grid-cols-2 gap-3">
        {/* Progreso del día */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Progreso de Hoy
            </span>
            <span className="text-xs font-extrabold text-slate-900 dark:text-white">
              {completed}/{total} ({progressPercent}%)
            </span>
          </div>

          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Mejor Racha */}
        <div className="rounded-3xl border border-slate-200/80 bg-[#fae8df]/40 p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#9c5936] dark:text-rose-300">
              Racha Activa
            </span>
            <Flame size={16} className="text-amber-500" />
          </div>
          <p className="mt-1 text-2xl font-bold tracking-tight text-[#9c5936] dark:text-rose-300">
            {maxStreak} <span className="text-xs font-semibold">días seguidos</span>
          </p>
        </div>
      </div>

      {/* Aviso de Racha en Peligro (si quedan hábitos pendientes del día) */}
      {pendingHabits.length > 0 && total > 0 && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-rose-200/80 bg-rose-50/70 p-3.5 text-xs text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300">
          <WarningIcon size={18} className="text-rose-500 shrink-0" />
          <p className="font-semibold">
            ¡Tienes {pendingHabits.length} hábito{pendingHabits.length > 1 ? 's' : ''} pendiente{pendingHabits.length > 1 ? 's' : ''} hoy! Complétalos para no arriesgar tu racha.
          </p>
        </div>
      )}

      {/* Lista de Hábitos */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
        </div>
      ) : habits.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white/50 p-12 text-center dark:border-slate-800 dark:bg-slate-900/40">
          <Flame size={36} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            No tienes hábitos registrados
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Pulsa el botón "Crear hábito" o elige una plantilla rápida.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {habits.map((habit) => {
            const isCompleted = habit.status === 'completed'
            const isSkipped = habit.status === 'skipped'

            return (
              <div
                key={habit.id}
                onClick={() => handleToggleComplete(habit)}
                className={`group flex cursor-pointer items-center justify-between rounded-2xl border p-4 transition-all ${isCompleted
                  ? 'border-emerald-200 bg-emerald-50/30 dark:border-emerald-900/40 dark:bg-emerald-950/10'
                  : isSkipped
                    ? 'border-slate-200 bg-slate-50/50 opacity-60 dark:border-slate-800 dark:bg-slate-800/40'
                    : 'border-slate-200/80 bg-white hover:border-slate-300 shadow-xs dark:border-slate-800 dark:bg-slate-900'
                  }`}
              >
                <div className="flex items-center gap-3.5">
                  {/* Círculo Check */}
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-xl border transition-all ${isCompleted
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : isSkipped
                        ? 'border-slate-300 bg-slate-200 text-slate-500 dark:border-slate-700 dark:bg-slate-800'
                        : 'border-slate-300 bg-white text-transparent hover:border-emerald-500 dark:border-slate-700 dark:bg-slate-900'
                      }`}
                  >
                    <Check size={16} />
                  </div>

                  <div>
                    <h4
                      className={`text-sm font-bold tracking-tight text-slate-900 dark:text-white ${isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : ''
                        }`}
                    >
                      {habit.name}
                    </h4>

                    <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400">
                      {habit.is_measurable ? (
                        <span>
                          {habit.progress_value} / {habit.target_value} {habit.unit}
                        </span>
                      ) : (
                        <span className="capitalize">{habit.frequency}</span>
                      )}

                      {habit.reminder_time && (
                        <span>• {habit.reminder_time.slice(0, 5)}</span>
                      )}

                      {isSkipped && (
                        <span className="text-amber-500 font-bold">• Saltado</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Botón de Toque Rápido para Hábitos Medibles (+1) */}
                  {habit.is_measurable && !isCompleted && !isSkipped && (
                    <button
                      type="button"
                      onClick={(e) => handleIncrement(e, habit)}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 shadow-2xs hover:bg-white active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      +1 {habit.unit}
                    </button>
                  )}

                  {/* Saltar hábito sin perder racha */}
                  {!isCompleted && !isSkipped && (
                    <button
                      type="button"
                      onClick={(e) => handleSkipHabit(e, habit)}
                      title="Saltar hoy sin perder racha"
                      className="rounded-xl p-1.5 text-slate-300 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                    >
                      <Skip size={16} />
                    </button>
                  )}

                  {/* Eliminar */}
                  <button
                    type="button"
                    onClick={(e) => handleDeleteHabit(e, habit.id)}
                    title="Eliminar hábito"
                    className="rounded-xl p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Crear Hábito */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-sm my-auto max-h-[92vh] overflow-y-auto rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 scrollbar-thin">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Nuevo Hábito
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <CloseCircle size={20} />
              </button>
            </div>

            {/* Plantillas Rápidas */}
            <div className="mb-4">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Plantillas para empezar
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_TEMPLATES.map((t) => (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => applyTemplate(t)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreateHabit} className="flex flex-col gap-3.5">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Nombre
                </label>
                <input
                  type="text"
                  placeholder="Ej. Salir a correr, Leer..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Frecuencia
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="daily">Todos los días</option>
                  <option value="weekdays">Días de semana (Lun a Vie)</option>
                  <option value="weekends">Fines de semana</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Hora de recordatorio (Opcional)
                </label>
                <CustomTimePicker
                  value={reminderTime}
                  onChange={(val) => setReminderTime(val)}
                  placeholder="Selecciona hora de alarma"
                />
              </div>

              {/* Hábito Medible con Contador */}
              <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                <div>
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                    Meta medible
                  </h5>
                  <p className="text-[11px] text-slate-400">Ej. Vasos de agua, minutos</p>
                </div>
                <input
                  type="checkbox"
                  checked={isMeasurable}
                  onChange={(e) => setIsMeasurable(e.target.checked)}
                  className="h-5 w-5 rounded-md text-slate-900"
                />
              </div>

              {isMeasurable && (
                <div className="grid grid-cols-2 gap-2 animate-in fade-in">
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                      Cantidad
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="8"
                      value={targetValue}
                      onChange={(e) => setTargetValue(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold outline-none focus:border-slate-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                      Unidad
                    </label>
                    <input
                      type="text"
                      placeholder="vasos, min..."
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold outline-none focus:border-slate-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              )}

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
                  disabled={saving || !name.trim()}
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
