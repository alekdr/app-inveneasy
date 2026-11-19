import { useNavigate } from 'react-router-dom'
import {
  IoRestaurantOutline,
  IoMedkitOutline,
  IoNutritionOutline,
  IoWaterOutline,
  IoBookOutline,
  IoTimeOutline,
  IoPeopleOutline,
  IoHeartSharp,
  IoHeartOutline,
} from 'react-icons/io5'
import type { Recipe, RecipeCategory, RecipeDifficulty } from '../../types'

export const CATEGORY_META: Record<
  RecipeCategory,
  { label: string; icon: React.ReactNode; chip: string }
> = {
  comida: {
    label: 'Comida',
    icon: <IoRestaurantOutline size={13} />,
    chip: 'bg-amber-50 text-amber-700 border-amber-200/70 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
  },
  medicinal: {
    label: 'Medicinal',
    icon: <IoMedkitOutline size={13} />,
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
  },
  postre: {
    label: 'Postre',
    icon: <IoNutritionOutline size={13} />,
    chip: 'bg-pink-50 text-pink-700 border-pink-200/70 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800/60',
  },
  bebida: {
    label: 'Bebida',
    icon: <IoWaterOutline size={13} />,
    chip: 'bg-sky-50 text-sky-700 border-sky-200/70 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60',
  },
  otro: {
    label: 'Otra',
    icon: <IoBookOutline size={13} />,
    chip: 'bg-violet-50 text-violet-700 border-violet-200/70 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800/60',
  },
}

export const DIFFICULTY_META: Record<
  RecipeDifficulty,
  { label: string; className: string }
> = {
  facil: { label: 'Fácil', className: 'text-emerald-600 dark:text-emerald-400' },
  media: { label: 'Media', className: 'text-amber-600 dark:text-amber-400' },
  dificil: { label: 'Difícil', className: 'text-rose-600 dark:text-rose-400' },
}

export function formatMinutes(minutes: number | null | undefined): string | null {
  if (!minutes || minutes <= 0) return null
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

export function totalTime(recipe: Recipe): number | null {
  const prep = recipe.prep_time_minutes || 0
  const cook = recipe.cook_time_minutes || 0
  const total = prep + cook
  return total > 0 ? total : null
}

interface RecipeCardProps {
  recipe: Recipe
  onToggleFavorite?: (recipe: Recipe) => void
}

export default function RecipeCard({ recipe, onToggleFavorite }: RecipeCardProps) {
  const navigate = useNavigate()
  const category = CATEGORY_META[recipe.category] || CATEGORY_META.otro
  const difficulty = DIFFICULTY_META[recipe.difficulty] || DIFFICULTY_META.facil
  const time = formatMinutes(totalTime(recipe))

  return (
    <article
      onClick={() => navigate(`/recipes/${recipe.id}`)}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
    >
      {/* Imagen */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
        {recipe.image_url ? (
          <img
            src={recipe.image_url}
            alt={recipe.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300 dark:text-slate-600">
            <span className="scale-[2.4] opacity-70">{category.icon}</span>
          </div>
        )}

        {/* Categoría */}
        <span
          className={`absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold backdrop-blur-md ${category.chip}`}
        >
          {category.icon}
          {category.label}
        </span>

        {/* Favorito */}
        <button
          type="button"
          aria-label={recipe.is_favorite ? 'Quitar de favoritas' : 'Marcar como favorita'}
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorite?.(recipe)
          }}
          className={`absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-2xl backdrop-blur-md transition-all active:scale-90 ${
            recipe.is_favorite
              ? 'bg-rose-500 text-white shadow-xs'
              : 'border border-white/60 bg-white/80 text-slate-500 hover:text-rose-500 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300'
          }`}
        >
          {recipe.is_favorite ? <IoHeartSharp size={15} /> : <IoHeartOutline size={15} />}
        </button>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col justify-between p-3.5">
        <div>
          <h4 className="line-clamp-1 text-sm font-bold tracking-tight text-slate-900 dark:text-white">
            {recipe.title}
          </h4>
          {recipe.description && (
            <p className="mt-0.5 line-clamp-1 text-[11px] font-medium text-slate-400">
              {recipe.description}
            </p>
          )}
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-2 text-[10px] font-bold text-slate-400">
          <span className="inline-flex items-center gap-1">
            {time && (
              <>
                <IoTimeOutline size={12} />
                {time}
              </>
            )}
          </span>
          <span className="inline-flex items-center gap-1">
            <IoPeopleOutline size={12} />
            {recipe.servings} {recipe.servings === 1 ? 'porción' : 'porciones'}
          </span>
          <span className={`font-bold ${difficulty.className}`}>{difficulty.label}</span>
        </div>
      </div>
    </article>
  )
}
