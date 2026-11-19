import { useEffect, useMemo, useState } from 'react'
import {
  IoAddOutline,
  IoCheckmarkCircleOutline,
  IoCloseOutline,
  IoFlagOutline,
  IoTimeOutline,
  IoTrashOutline,
} from 'react-icons/io5'
import { supabase } from '../services/supabase'
import { confirmDialog } from '../stores/confirmStore'
import { triggerHaptic } from '../services/capacitor'
import { toast } from 'sonner'
import CustomDatePicker from '../components/CustomDatePicker'
import type { Goal, GoalType } from '../types'

type GoalFilter = 'all' | GoalType

const GOAL_TYPE_LABEL: Record<GoalType, string> = {
  short_term: 'Corto plazo',
  medium_term: 'Mediano plazo',
  long_term: 'Largo plazo',
}

const GOAL_TYPE_STYLES: Record<
  GoalType,
  { badge: string; icon: string; bar: string; ring: string }
> = {
  short_term: {
    badge:
      'bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60',
    icon: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    bar: 'bg-emerald-500',
    ring: 'hover:border-emerald-300 dark:hover:border-emerald-800',
  },
  medium_term: {
    badge:
      'bg-amber-50 text-amber-700 border-amber-200/70 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60',
    icon: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    bar: 'bg-amber-500',
    ring: 'hover:border-amber-300 dark:hover:border-amber-800',
  },
  long_term: {
    badge:
      'bg-violet-50 text-violet-700 border-violet-200/70 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900/60',
    icon: 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300',
    bar: 'bg-violet-500',
    ring: 'hover:border-violet-300 dark:hover:border-violet-800',
  },
}

const FILTERS: Array<{ value: GoalFilter; label: string }> = [
  { value: 'all', label: 'Todas' },
  { value: 'short_term', label: 'Corto' },
  { value: 'medium_term', label: 'Mediano' },
  { value: 'long_term', label: 'Largo' },
]

const EMPTY_FORM = {
  title: '',
  description: '',
  goal_type: 'short_term' as GoalType,
  category: 'personal',
  target_date: '',
  target_value: '',
  current_value: '',
  unit: '',
}

type GoalForm = typeof EMPTY_FORM

function getProgress(goal: Goal): number {
  if (goal.is_completed) return 100
  const target = Number(goal.target_value ?? 0)
  if (!Number.isFinite(target) || target <= 0) return 0
  const current = Number(goal.current_value ?? 0)
  const percent = (current / target) * 100
  return Math.max(0, Math.min(100, Math.round(percent)))
}

function getDaysRemaining(targetDate: string): number {
  const target = new Date(targetDate).getTime()
  if (Number.isNaN(target)) return 0
  return Math.ceil((target - Date.now()) / 86_400_000)
}

function formatPercent(value: number): string {
  return `${value}%`
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<GoalFilter>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [form, setForm] = useState<GoalForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const loadGoals = async () => {
    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        toast.error('Inicia sesión para ver tus metas')
        return
      }

      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .order('is_completed', { ascending: true })
        .order('target_date', { ascending: true })

      if (error) throw error
      setGoals((data ?? []) as Goal[])
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error al cargar las metas'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadGoals()
  }, [])

  const summary = useMemo(() => {
    const total = goals.length
    const completed = goals.filter((goal) => goal.is_completed).length
    const average =
      total > 0
        ? Math.round(
            goals.reduce((acc, goal) => acc + getProgress(goal), 0) / total
          )
        : 0

    return {
      total,
      completed,
      inProgress: total - completed,
      average,
    }
  }, [goals])

  const filteredGoals = useMemo(
    () =>
      goals.filter((goal) => filter === 'all' || goal.goal_type === filter),
    [goals, filter]
  )

  const openCreateModal = async () => {
    await triggerHaptic()
    setEditingGoal(null)
    setForm(EMPTY_FORM)
    setIsModalOpen(true)
  }

  const openEditModal = async (goal: Goal) => {
    await triggerHaptic()
    setEditingGoal(goal)
    setForm({
      title: goal.title,
      description: goal.description ?? '',
      goal_type: goal.goal_type,
      category: goal.category ?? 'personal',
      target_date: goal.target_date.slice(0, 10),
      target_value: goal.target_value != null ? String(goal.target_value) : '',
      current_value: String(goal.current_value ?? 0),
      unit: goal.unit ?? '',
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    if (saving) return
    setIsModalOpen(false)
    setEditingGoal(null)
  }

  const updateField = <K extends keyof GoalForm>(
    key: K,
    value: GoalForm[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!form.title.trim()) {
      toast.error('Escribe un título para la meta')
      return
    }
    if (!form.target_date) {
      toast.error('Selecciona una fecha objetivo')
      return
    }

    setSaving(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        toast.error('Inicia sesión para guardar la meta')
        return
      }

      const targetValue = form.target_value.trim()
        ? Number(form.target_value.replace(',', '.'))
        : null
      const currentValue = form.current_value.trim()
        ? Number(form.current_value.replace(',', '.'))
        : 0

      if (targetValue !== null && !Number.isFinite(targetValue)) {
        toast.error('El valor objetivo no es válido')
        return
      }
      if (!Number.isFinite(currentValue)) {
        toast.error('El valor actual no es válido')
        return
      }

      const isCompleted =
        targetValue !== null && targetValue > 0 && currentValue >= targetValue

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        goal_type: form.goal_type,
        category: form.category.trim() || 'personal',
        target_date: new Date(`${form.target_date}T12:00:00`).toISOString(),
        target_value: targetValue,
        current_value: currentValue,
        unit: form.unit.trim() || null,
        is_completed: isCompleted,
        completed_date: isCompleted ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }

      if (editingGoal) {
        const { error } = await supabase
          .from('goals')
          .update(payload)
          .eq('id', editingGoal.id)
          .eq('user_id', user.id)
        if (error) throw error
        toast.success('Meta actualizada')
      } else {
        const { error } = await supabase.from('goals').insert({
          ...payload,
          user_id: user.id,
        })
        if (error) throw error
        toast.success('Meta creada')
      }

      setIsModalOpen(false)
      setEditingGoal(null)
      await loadGoals()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error al guardar la meta'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!editingGoal) return

    const ok = await confirmDialog({
      title: 'Eliminar meta',
      message: `¿Deseas eliminar "${editingGoal.title}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      danger: true,
    })
    if (!ok) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', editingGoal.id)
        .eq('user_id', editingGoal.user_id)
      if (error) throw error

      toast.success('Meta eliminada')
      setIsModalOpen(false)
      setEditingGoal(null)
      await loadGoals()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error al eliminar la meta'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-200/60 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-violet-600 dark:focus:ring-violet-900/40'

  return (
    <div className="flex w-full min-w-0 max-w-full flex-col gap-4 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Mis Metas
          </h2>
          <p className="text-xs font-medium text-slate-400">
            Controla tus objetivos a corto, mediano y largo plazo
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex items-center gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800/60"
            role="group"
            aria-label="Filtrar metas por plazo"
          >
            {FILTERS.map((item) => {
              const isActive = filter === item.value
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFilter(item.value)}
                  aria-pressed={isActive}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-slate-800 active:scale-95 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            <IoAddOutline size={16} />
            Nueva meta
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Total
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {summary.total}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Completadas
          </p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {summary.completed}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            En progreso
          </p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {summary.inProgress}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Promedio
          </p>
          <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">
            {formatPercent(summary.average)}
          </p>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div
          className="flex flex-col items-center justify-center gap-3 py-16"
          role="status"
          aria-live="polite"
        >
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800 dark:border-slate-700 dark:border-t-white" />
          <p className="text-xs font-medium text-slate-400">
            Cargando metas...
          </p>
        </div>
      ) : filteredGoals.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white/50 p-12 text-center dark:border-slate-800 dark:bg-slate-900/40">
          <IoFlagOutline
            size={48}
            className="mx-auto mb-3 text-slate-300 dark:text-slate-600"
          />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            {filter === 'all'
              ? 'No tienes metas registradas'
              : 'No hay metas en este plazo'}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Pulsa "Nueva meta" para crear tu primer objetivo
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredGoals.map((goal) => {
            const progress = getProgress(goal)
            const daysRemaining = getDaysRemaining(goal.target_date)
            const styles = GOAL_TYPE_STYLES[goal.goal_type]
            const isOverdue = !goal.is_completed && daysRemaining < 0

            return (
              <button
                key={goal.id}
                type="button"
                onClick={() => openEditModal(goal)}
                aria-label={`Abrir meta ${goal.title}`}
                className={`w-full rounded-2xl border border-slate-200/80 bg-white p-4 text-left shadow-xs transition-all hover:shadow-sm active:scale-[0.995] dark:border-slate-800 dark:bg-slate-900 ${styles.ring}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}
                    >
                      {goal.is_completed ? (
                        <IoCheckmarkCircleOutline size={18} />
                      ) : (
                        <IoFlagOutline size={18} />
                      )}
                    </span>
                    <div className="min-w-0">
                      <h4 className="truncate font-bold text-slate-900 dark:text-white">
                        {goal.title}
                      </h4>
                      <p className="truncate text-[11px] font-medium text-slate-400 dark:text-slate-500">
                        {goal.description || 'Sin descripción'}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${styles.badge}`}
                    >
                      {GOAL_TYPE_LABEL[goal.goal_type]}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-medium ${
                        isOverdue
                          ? 'text-rose-500 dark:text-rose-400'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      <IoTimeOutline size={12} />
                      {goal.is_completed
                        ? 'Completada'
                        : isOverdue
                          ? `Vencida por ${Math.abs(daysRemaining)} d`
                          : `${daysRemaining} d restantes`}
                    </span>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-[10px] font-bold">
                    <span className="text-slate-400 dark:text-slate-500">
                      Avance
                    </span>
                    <span className="text-slate-700 dark:text-slate-200">
                      {formatPercent(progress)}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        goal.is_completed ? 'bg-emerald-500' : styles.bar
                      }`}
                      style={{ width: formatPercent(progress) }}
                    />
                  </div>
                  {goal.target_value != null && (
                    <p className="mt-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                      {Number(goal.current_value)} / {Number(goal.target_value)}{' '}
                      {goal.unit || ''}
                    </p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Modal crear / editar */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-xs sm:items-center"
          onClick={closeModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="goal-modal-title"
            className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h3
                  id="goal-modal-title"
                  className="text-base font-bold text-slate-900 dark:text-white"
                >
                  {editingGoal ? 'Editar meta' : 'Nueva meta'}
                </h3>
                <p className="text-xs text-slate-400">
                  {editingGoal
                    ? 'Actualiza el avance o los datos de la meta'
                    : 'Define un objetivo claro y medible'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Cerrar"
                className="rounded-xl p-1 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <IoCloseOutline size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label
                  htmlFor="goal-title"
                  className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400"
                >
                  Título
                </label>
                <input
                  id="goal-title"
                  type="text"
                  value={form.title}
                  onChange={(event) => updateField('title', event.target.value)}
                  placeholder="Ej. Ahorrar para un viaje"
                  maxLength={200}
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="goal-description"
                  className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400"
                >
                  Descripción
                </label>
                <textarea
                  id="goal-description"
                  value={form.description}
                  onChange={(event) =>
                    updateField('description', event.target.value)
                  }
                  placeholder="¿Cómo vas a lograrlo?"
                  maxLength={500}
                  rows={2}
                  className={`${inputClass} resize-none`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="goal-type"
                    className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400"
                  >
                    Plazo
                  </label>
                  <select
                    id="goal-type"
                    value={form.goal_type}
                    onChange={(event) =>
                      updateField('goal_type', event.target.value as GoalType)
                    }
                    className={inputClass}
                  >
                    <option value="short_term">Corto plazo</option>
                    <option value="medium_term">Mediano plazo</option>
                    <option value="long_term">Largo plazo</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="goal-category"
                    className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400"
                  >
                    Categoría
                  </label>
                  <input
                    id="goal-category"
                    type="text"
                    value={form.category}
                    onChange={(event) =>
                      updateField('category', event.target.value)
                    }
                    placeholder="personal"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label
                  className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400"
                >
                  Fecha objetivo
                </label>
                <CustomDatePicker
                  value={form.target_date}
                  onChange={(date) => updateField('target_date', date)}
                  label="Fecha objetivo"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor="goal-target"
                    className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400"
                  >
                    Objetivo
                  </label>
                  <input
                    id="goal-target"
                    type="number"
                    step="any"
                    min="0"
                    value={form.target_value}
                    onChange={(event) =>
                      updateField('target_value', event.target.value)
                    }
                    placeholder="0"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="goal-current"
                    className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400"
                  >
                    Actual
                  </label>
                  <input
                    id="goal-current"
                    type="number"
                    step="any"
                    min="0"
                    value={form.current_value}
                    onChange={(event) =>
                      updateField('current_value', event.target.value)
                    }
                    placeholder="0"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="goal-unit"
                    className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400"
                  >
                    Unidad
                  </label>
                  <input
                    id="goal-unit"
                    type="text"
                    value={form.unit}
                    onChange={(event) => updateField('unit', event.target.value)}
                    placeholder="COP, kg..."
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                {editingGoal && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={saving}
                    aria-label="Eliminar meta"
                    className="rounded-2xl border border-rose-200 p-3 text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/40"
                  >
                    <IoTrashOutline size={16} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="flex-1 rounded-2xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !form.title.trim() || !form.target_date}
                  className="flex-1 rounded-2xl bg-slate-900 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  {saving ? 'Guardando...' : editingGoal ? 'Guardar' : 'Crear meta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
