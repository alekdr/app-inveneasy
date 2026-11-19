import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IoAddSharp,
  IoSearchSharp,
  IoRestaurantOutline,
  IoMedkitOutline,
  IoNutritionOutline,
  IoWaterOutline,
  IoBookOutline,
  IoHeartSharp,
  IoHeartOutline,
  IoFlameOutline,
  IoChevronDownOutline,
} from 'react-icons/io5'
import RecipeCard from '../components/recipes/RecipeCard'
import {
  fetchRecipes,
  fetchRecipesStats,
  toggleRecipeFavorite,
} from '../services/supabase'
import { triggerHaptic } from '../services/capacitor'
import { toast } from 'sonner'
import type { Recipe, RecipeCategory, RecipeDifficulty } from '../types'

type CategoryFilter = RecipeCategory | 'all'
type DifficultyFilter = RecipeDifficulty | 'all'

const categoryOptions: { value: CategoryFilter; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'Todas', icon: <IoRestaurantOutline size={13} /> },
  { value: 'comida', label: 'Comida', icon: <IoRestaurantOutline size={13} /> },
  { value: 'medicinal', label: 'Medicinal', icon: <IoMedkitOutline size={13} /> },
  { value: 'postre', label: 'Postre', icon: <IoNutritionOutline size={13} /> },
  { value: 'bebida', label: 'Bebida', icon: <IoWaterOutline size={13} /> },
  { value: 'otro', label: 'Otra', icon: <IoBookOutline size={13} /> },
]

export default function RecipesPage() {
  const navigate = useNavigate()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [difficulty, setDifficulty] = useState<DifficultyFilter>('all')
  const [onlyFavorites, setOnlyFavorites] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    favorites: 0,
    cookedThisMonth: 0,
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const [list, summary] = await Promise.all([fetchRecipes(), fetchRecipesStats()])
      setRecipes(list)
      setStats({
        total: summary.total,
        favorites: summary.favorites,
        cookedThisMonth: summary.cookedThisMonth,
      })
    } catch {
      toast.error('Error al cargar tus recetas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleToggleFavorite = async (recipe: Recipe) => {
    const next = !recipe.is_favorite
    // Optimista
    setRecipes((prev) =>
      prev.map((r) => (r.id === recipe.id ? { ...r, is_favorite: next } : r))
    )
    setStats((prev) => ({ ...prev, favorites: Math.max(0, prev.favorites + (next ? 1 : -1)) }))
    try {
      await triggerHaptic()
      await toggleRecipeFavorite(recipe.id, next)
    } catch {
      // revertir
      setRecipes((prev) =>
        prev.map((r) => (r.id === recipe.id ? { ...r, is_favorite: !next } : r))
      )
      setStats((prev) => ({ ...prev, favorites: Math.max(0, prev.favorites + (next ? -1 : 1)) }))
      toast.error('No se pudo actualizar la favorita')
    }
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return recipes.filter((r) => {
      if (category !== 'all' && r.category !== category) return false
      if (difficulty !== 'all' && r.difficulty !== difficulty) return false
      if (onlyFavorites && !r.is_favorite) return false
      if (!term) return true
      const haystack = [
        r.title,
        r.description || '',
        ...r.tags,
        ...r.ingredients.map((i) => i.name),
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(term)
    })
  }, [recipes, search, category, difficulty, onlyFavorites])

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            <IoRestaurantOutline size={20} className="text-amber-600" />
            Recetas
          </h2>
          <p className="text-xs font-medium text-slate-400">
            Tu biblioteca personal de cocina, remedios y más
          </p>
        </div>

        <button
          onClick={() => navigate('/recipes/new')}
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 active:scale-95 dark:bg-white dark:text-slate-900"
        >
          <IoAddSharp size={16} />
          <span>Nueva receta</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Recetas
          </span>
          <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {stats.total}
          </p>
        </div>
        <div className="rounded-3xl border border-rose-200/60 bg-rose-50/50 p-4 shadow-xs dark:border-rose-900/40 dark:bg-rose-950/20">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 dark:text-rose-300">
            Favoritas
          </span>
          <p className="mt-1 flex items-center gap-1.5 text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-300">
            {stats.favorites}
            <IoHeartSharp size={16} />
          </p>
        </div>
        <div className="rounded-3xl border border-amber-200/60 bg-amber-50/50 p-4 shadow-xs dark:border-amber-900/40 dark:bg-amber-950/20">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-300">
            Este mes
          </span>
          <p className="mt-1 flex items-center gap-1.5 text-2xl font-bold tracking-tight text-amber-700 dark:text-amber-300">
            {stats.cookedThisMonth}
            <IoFlameOutline size={16} />
          </p>
        </div>
      </div>

      {/* Buscador + Favoritas */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <IoSearchSharp size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, ingrediente o etiqueta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-slate-200/80 bg-white py-2.5 pl-11 pr-4 text-xs font-semibold outline-none shadow-xs transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOnlyFavorites((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-2xl border px-3 py-2.5 text-xs font-bold transition ${
              onlyFavorites
                ? 'border-rose-200 bg-rose-500 text-white shadow-xs dark:border-rose-800'
                : 'border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            {onlyFavorites ? <IoHeartSharp size={14} /> : <IoHeartOutline size={14} />}
            Favoritas
          </button>

          <div className="relative">
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as DifficultyFilter)}
              className="appearance-none rounded-2xl border border-slate-200/80 bg-white py-2.5 pl-3.5 pr-8 text-xs font-bold text-slate-600 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              <option value="all">Dificultad</option>
              <option value="facil">Fácil</option>
              <option value="media">Media</option>
              <option value="dificil">Difícil</option>
            </select>
            <IoChevronDownOutline
              size={14}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>
        </div>
      </div>

      {/* Píldoras de categoría */}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 scrollbar-none">
        {categoryOptions.map((opt) => {
          const active = category === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setCategory(opt.value)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${
                active
                  ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                  : 'border-slate-200/80 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
              }`}
            >
              {opt.icon}
              {opt.label}
            </button>
          )
        })}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div
            role="status"
            aria-live="polite"
            className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800"
          >
            <span className="sr-only">Cargando recetas...</span>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white/50 p-12 text-center dark:border-slate-800 dark:bg-slate-900/40">
          <IoRestaurantOutline size={38} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            {recipes.length === 0 ? 'Tu recetario está vacío' : 'No hay recetas con esos filtros'}
          </p>
          <p className="mx-auto mt-1 max-w-xs text-xs text-slate-400">
            {recipes.length === 0
              ? 'Guarda tus recetas de comida, remedios medicinales y más para tenerlas siempre a mano.'
              : 'Prueba a cambiar la búsqueda o los filtros seleccionados.'}
          </p>
          {recipes.length === 0 && (
            <button
              onClick={() => navigate('/recipes/new')}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900"
            >
              <IoAddSharp size={15} />
              Crear mi primera receta
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onToggleFavorite={handleToggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  )
}
