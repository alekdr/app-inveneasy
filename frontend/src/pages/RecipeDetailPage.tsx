import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  IoChevronBackOutline,
  IoHeartSharp,
  IoHeartOutline,
  IoPencilSharp,
  IoTrashSharp,
  IoTimeOutline,
  IoPeopleOutline,
  IoFlameOutline,
  IoCheckmarkSharp,
  IoStarSharp,
  IoStarOutline,
  IoCloseCircleSharp,
  IoRestaurantOutline,
  IoListOutline,
  IoLeafOutline,
  IoCalendarOutline,
} from 'react-icons/io5'
import { CATEGORY_META, DIFFICULTY_META, formatMinutes, totalTime } from '../components/recipes/RecipeCard'
import {
  fetchRecipe,
  fetchRecipeLogs,
  deleteRecipe,
  toggleRecipeFavorite,
  cookRecipe,
} from '../services/supabase'
import { triggerHaptic } from '../services/capacitor'
import { confirmDialog } from '../stores/confirmStore'
import { toast } from 'sonner'
import type { Recipe, RecipeLog } from '../types'

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [logs, setLogs] = useState<RecipeLog[]>([])
  const [loading, setLoading] = useState(true)
  const [isCookModalOpen, setIsCookModalOpen] = useState(false)
  const [rating, setRating] = useState<number>(0)
  const [cookNotes, setCookNotes] = useState('')
  const [cookDate, setCookDate] = useState(new Date().toISOString().split('T')[0])
  const [savingCook, setSavingCook] = useState(false)

  const loadData = async () => {
    if (!id) return
    setLoading(true)
    try {
      const [r, l] = await Promise.all([fetchRecipe(id), fetchRecipeLogs(id)])
      setRecipe(r)
      setLogs(l)
    } catch {
      toast.error('No se pudo cargar la receta')
      navigate('/recipes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div
          role="status"
          aria-live="polite"
          className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800"
        >
          <span className="sr-only">Cargando receta...</span>
        </div>
      </div>
    )
  }

  if (!recipe) return null

  const category = CATEGORY_META[recipe.category] || CATEGORY_META.otro
  const difficulty = DIFFICULTY_META[recipe.difficulty] || DIFFICULTY_META.facil
  const time = formatMinutes(totalTime(recipe))
  const totalSteps = recipe.instructions.filter((s) => s.trim()).length
  const avgRating =
    logs.length > 0
      ? logs.filter((l) => l.rating).reduce((sum, l) => sum + (l.rating || 0), 0) /
        Math.max(1, logs.filter((l) => l.rating).length)
      : null

  const handleToggleFavorite = async () => {
    const next = !recipe.is_favorite
    setRecipe({ ...recipe, is_favorite: next })
    try {
      await triggerHaptic()
      await toggleRecipeFavorite(recipe.id, next)
      toast.success(next ? 'Añadida a favoritas' : 'Quitada de favoritas')
    } catch {
      setRecipe({ ...recipe, is_favorite: !next })
      toast.error('No se pudo actualizar')
    }
  }

  const handleDelete = async () => {
    const ok = await confirmDialog({
      title: 'Eliminar receta',
      message: `¿Eliminar "${recipe.title}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteRecipe(recipe.id)
      await triggerHaptic()
      toast.success('Receta eliminada')
      navigate('/recipes')
    } catch {
      toast.error('Error al eliminar')
    }
  }

  const handleSaveCookLog = async () => {
    setSavingCook(true)
    try {
      await cookRecipe(recipe.id, {
        rating: rating > 0 ? rating : null,
        notes: cookNotes.trim() || null,
        cooked_date: cookDate,
      })
      await triggerHaptic()
      toast.success('¡Registrado! Buen provecho 🍽️')
      setIsCookModalOpen(false)
      setRating(0)
      setCookNotes('')
      await loadData()
    } catch {
      toast.error('No se pudo registrar')
    } finally {
      setSavingCook(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header / Back */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/recipes')}
          className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200/80 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
        >
          <IoChevronBackOutline size={15} />
          Recetas
        </button>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleToggleFavorite}
            aria-label={recipe.is_favorite ? 'Quitar de favoritas' : 'Marcar como favorita'}
            className={`flex h-9 w-9 items-center justify-center rounded-2xl border transition ${
              recipe.is_favorite
                ? 'border-rose-200 bg-rose-500 text-white'
                : 'border-slate-200/80 bg-white text-slate-500 hover:text-rose-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            {recipe.is_favorite ? <IoHeartSharp size={16} /> : <IoHeartOutline size={16} />}
          </button>
          <button
            onClick={() => navigate(`/recipes/${recipe.id}/edit`)}
            aria-label="Editar receta"
            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200/80 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          >
            <IoPencilSharp size={15} />
          </button>
          <button
            onClick={handleDelete}
            aria-label="Eliminar receta"
            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200/80 bg-white text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-rose-950/40"
          >
            <IoTrashSharp size={15} />
          </button>
        </div>
      </div>

      {/* Hero */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
          {recipe.image_url ? (
            <img
              src={recipe.image_url}
              alt={recipe.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-300 dark:text-slate-600">
              <span className="scale-[4] opacity-60">{category.icon}</span>
            </div>
          )}
          <span
            className={`absolute left-4 top-4 inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-bold backdrop-blur-md ${category.chip}`}
          >
            {category.icon}
            {category.label}
          </span>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {recipe.title}
              </h1>
              {recipe.description && (
                <p className="mt-1.5 text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                  {recipe.description}
                </p>
              )}
            </div>

            <button
              onClick={() => setIsCookModalOpen(true)}
              className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-amber-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-amber-700 active:scale-95"
            >
              <IoRestaurantOutline size={16} />
              Cocinar ahora
            </button>
          </div>

          {/* Meta chips */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {recipe.prep_time_minutes ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/70 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <IoTimeOutline size={12} />
                Prep: {formatMinutes(recipe.prep_time_minutes)}
              </span>
            ) : null}
            {recipe.cook_time_minutes ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/70 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <IoFlameOutline size={12} />
                Cocción: {formatMinutes(recipe.cook_time_minutes)}
              </span>
            ) : null}
            {time && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/70 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <IoTimeOutline size={12} />
                Total: {time}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/70 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <IoPeopleOutline size={12} />
              {recipe.servings} {recipe.servings === 1 ? 'porción' : 'porciones'}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border border-slate-200/70 bg-slate-50 px-3 py-1.5 text-[11px] font-bold dark:border-slate-700 dark:bg-slate-800 ${difficulty.className}`}
            >
              <IoLeafOutline size={12} />
              {difficulty.label}
            </span>
            {avgRating && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/70 bg-amber-50 px-3 py-1.5 text-[11px] font-bold text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                <IoStarSharp size={12} />
                {avgRating.toFixed(1)} / 5
              </span>
            )}
            {logs.length > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/70 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <IoRestaurantOutline size={12} />
                {logs.length} {logs.length === 1 ? 'vez cocinada' : 'veces cocinada'}
              </span>
            )}
          </div>

          {/* Tags */}
          {recipe.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {recipe.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {recipe.source_url && (
            <a
              href={recipe.source_url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-[11px] font-bold text-violet-600 underline-offset-2 hover:underline dark:text-violet-400"
            >
              Ver fuente original ↗
            </a>
          )}
        </div>
      </div>

      {/* Contenido: ingredientes + pasos */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        {/* Ingredientes */}
        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
              <IoLeafOutline size={14} />
            </span>
            Ingredientes
            {recipe.ingredients.length > 0 && (
              <span className="ml-auto text-[10px] font-bold text-slate-400">
                {recipe.ingredients.length}
              </span>
            )}
          </h2>

          {recipe.ingredients.length === 0 ? (
            <p className="mt-4 text-xs text-slate-400">Sin ingredientes registrados.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {recipe.ingredients.map((ing, idx) => (
                <li
                  key={`${ing.name}-${idx}`}
                  className="flex items-start gap-2.5 rounded-2xl border border-slate-100 bg-slate-50/60 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/40"
                >
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                    <IoCheckmarkSharp size={11} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-100">
                        {ing.name}
                      </p>
                      {(ing.amount !== null || ing.unit) && (
                        <span className="shrink-0 text-xs font-bold text-slate-500 dark:text-slate-400">
                          {ing.amount ?? ''} {ing.unit || ''}
                        </span>
                      )}
                    </div>
                    {ing.notes && (
                      <p className="mt-0.5 text-[11px] font-medium text-slate-400">{ing.notes}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Instrucciones */}
        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
              <IoListOutline size={14} />
            </span>
            Preparación
            {totalSteps > 0 && (
              <span className="ml-auto text-[10px] font-bold text-slate-400">
                {totalSteps} {totalSteps === 1 ? 'paso' : 'pasos'}
              </span>
            )}
          </h2>

          {totalSteps === 0 ? (
            <p className="mt-4 text-xs text-slate-400">Sin pasos registrados.</p>
          ) : (
            <ol className="mt-4 flex flex-col gap-3">
              {recipe.instructions
                .filter((s) => s.trim())
                .map((step, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white dark:bg-white dark:text-slate-900">
                      {idx + 1}
                    </span>
                    <p className="pt-0.5 text-xs font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                      {step}
                    </p>
                  </li>
                ))}
            </ol>
          )}
        </section>
      </div>

      {/* Historial */}
      {logs.length > 0 && (
        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <IoCalendarOutline size={14} />
            </span>
            Historial
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {logs.map((log) => (
              <li
                key={log.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 px-3.5 py-2.5 dark:border-slate-800 dark:bg-slate-800/40"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {new Date(log.cooked_date + 'T00:00:00').toLocaleDateString('es-CO', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                  {log.notes && (
                    <p className="truncate text-[11px] font-medium text-slate-400">{log.notes}</p>
                  )}
                </div>
                {log.rating ? (
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i}>
                        {i < (log.rating || 0) ? (
                          <IoStarSharp size={12} className="text-amber-500" />
                        ) : (
                          <IoStarOutline size={12} className="text-slate-300 dark:text-slate-600" />
                        )}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-[10px] font-bold text-slate-300 dark:text-slate-600">
                    Sin rating
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Modal Cocinar ahora */}
      {isCookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-xs sm:items-center">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  ¡Buen provecho!
                </h3>
                <p className="text-xs text-slate-400">{recipe.title}</p>
              </div>
              <button
                onClick={() => setIsCookModalOpen(false)}
                aria-label="Cerrar"
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <IoCloseCircleSharp size={20} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Fecha
                </label>
                <input
                  type="date"
                  value={cookDate}
                  onChange={(e) => setCookDate(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  ¿Qué tal quedó?
                </label>
                <div className="flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 py-3 dark:border-slate-700 dark:bg-slate-800">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star === rating ? 0 : star)}
                      aria-label={`${star} estrella${star > 1 ? 's' : ''}`}
                      className="transition active:scale-90"
                    >
                      {star <= rating ? (
                        <IoStarSharp size={24} className="text-amber-500" />
                      ) : (
                        <IoStarOutline size={24} className="text-slate-300 dark:text-slate-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Notas (opcional)
                </label>
                <textarea
                  value={cookNotes}
                  onChange={(e) => setCookNotes(e.target.value)}
                  rows={2}
                  placeholder="Quedó excelente, la próxima uso menos sal..."
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCookModalOpen(false)}
                  className="flex-1 rounded-2xl border border-slate-200 py-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveCookLog}
                  disabled={savingCook}
                  className="flex-1 rounded-2xl bg-amber-600 py-3 text-xs font-bold text-white transition hover:bg-amber-700 disabled:opacity-50"
                >
                  {savingCook ? 'Guardando...' : 'Registrar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
