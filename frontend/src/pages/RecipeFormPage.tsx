import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  IoChevronBackOutline,
  IoCameraSharp,
  IoImageSharp,
  IoAddSharp,
  IoTrashSharp,
  IoRestaurantOutline,
  IoLeafOutline,
  IoListOutline,
  IoCloseCircleSharp,
  IoArrowUpOutline,
  IoArrowDownOutline,
} from 'react-icons/io5'
import { fetchRecipe, createRecipe, updateRecipe } from '../services/supabase'
import { uploadImage, getUploadErrorMessage } from '../services/api'
import { takePhoto, triggerHaptic } from '../services/capacitor'
import { toast } from 'sonner'
import type { RecipeCategory, RecipeDifficulty, RecipeIngredient } from '../types'

const UNIT_OPTIONS = ['', 'g', 'kg', 'ml', 'l', 'taza', 'cda', 'cdta', 'unidad', 'pizca', 'al gusto']

const CATEGORY_OPTIONS: { value: RecipeCategory; label: string }[] = [
  { value: 'comida', label: 'Comida' },
  { value: 'medicinal', label: 'Medicinal' },
  { value: 'postre', label: 'Postre' },
  { value: 'bebida', label: 'Bebida' },
  { value: 'otro', label: 'Otra' },
]

const DIFFICULTY_OPTIONS: { value: RecipeDifficulty; label: string }[] = [
  { value: 'facil', label: 'Fácil' },
  { value: 'media', label: 'Media' },
  { value: 'dificil', label: 'Difícil' },
]

const emptyIngredient: RecipeIngredient = { name: '', amount: null, unit: null, notes: null }

export default function RecipeFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEditing = Boolean(id)

  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<RecipeCategory>('comida')
  const [difficulty, setDifficulty] = useState<RecipeDifficulty>('facil')
  const [prepTime, setPrepTime] = useState('')
  const [cookTime, setCookTime] = useState('')
  const [servings, setServings] = useState('2')
  const [tagsInput, setTagsInput] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([{ ...emptyIngredient }])
  const [instructions, setInstructions] = useState<string[]>([''])

  const [selectedBlob, setSelectedBlob] = useState<Blob | File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [existingCloudinaryId, setExistingCloudinaryId] = useState<string | undefined>(undefined)

  useEffect(() => {
    const load = async () => {
      if (!id) return
      try {
        const recipe = await fetchRecipe(id)
        setTitle(recipe.title)
        setDescription(recipe.description || '')
        setCategory(recipe.category)
        setDifficulty(recipe.difficulty)
        setPrepTime(recipe.prep_time_minutes?.toString() || '')
        setCookTime(recipe.cook_time_minutes?.toString() || '')
        setServings(recipe.servings?.toString() || '1')
        setTagsInput(recipe.tags.join(', '))
        setSourceUrl(recipe.source_url || '')
        setIngredients(
          recipe.ingredients.length > 0 ? recipe.ingredients : [{ ...emptyIngredient }]
        )
        setInstructions(recipe.instructions.length > 0 ? recipe.instructions : [''])
        setPreviewUrl(recipe.image_url || '')
        setExistingCloudinaryId(recipe.cloudinary_public_id || undefined)
      } catch {
        toast.error('No se pudo cargar la receta')
        navigate('/recipes')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, navigate])

  // ===== Ingredientes =====
  const updateIngredient = (index: number, patch: Partial<RecipeIngredient>) => {
    setIngredients((prev) => prev.map((ing, i) => (i === index ? { ...ing, ...patch } : ing)))
  }

  const addIngredient = () => {
    setIngredients((prev) => [...prev, { ...emptyIngredient }])
  }

  const removeIngredient = (index: number) => {
    setIngredients((prev) => (prev.length === 1 ? [{ ...emptyIngredient }] : prev.filter((_, i) => i !== index)))
  }

  // ===== Instrucciones =====
  const updateInstruction = (index: number, value: string) => {
    setInstructions((prev) => prev.map((s, i) => (i === index ? value : s)))
  }

  const addInstruction = () => setInstructions((prev) => [...prev, ''])

  const removeInstruction = (index: number) => {
    setInstructions((prev) => (prev.length === 1 ? [''] : prev.filter((_, i) => i !== index)))
  }

  const moveInstruction = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= instructions.length) return
    const next = [...instructions]
    ;[next[index], next[target]] = [next[target], next[index]]
    setInstructions(next)
  }

  // ===== Imagen =====
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setSelectedBlob(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleNativeCamera = async () => {
    const photo = await takePhoto()
    if (photo.dataUrl && photo.blob) {
      setPreviewUrl(photo.dataUrl)
      setSelectedBlob(photo.blob)
    }
  }

  // ===== Guardar =====
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.error('Ponle un nombre a tu receta')
      return
    }

    setSaving(true)
    try {
      let finalImageUrl: string | undefined = previewUrl || undefined
      let finalPublicId: string | undefined = existingCloudinaryId

      if (selectedBlob) {
        try {
          const fileToUpload =
            selectedBlob instanceof File
              ? selectedBlob
              : new File([selectedBlob], 'recipe.jpg', { type: 'image/jpeg' })
          const uploadRes = await uploadImage(fileToUpload)
          finalImageUrl = uploadRes.image_url
          finalPublicId = uploadRes.public_id
        } catch (err) {
          toast.warning(getUploadErrorMessage(err))
        }
      }

      const cleanedIngredients = ingredients
        .filter((ing) => ing.name.trim())
        .map((ing) => ({
          name: ing.name.trim(),
          amount: ing.amount,
          unit: ing.unit?.trim() ? ing.unit.trim() : null,
          notes: ing.notes?.trim() ? ing.notes.trim() : null,
        }))

      const cleanedInstructions = instructions.map((s) => s.trim()).filter(Boolean)

      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        difficulty,
        prep_time_minutes: prepTime ? parseInt(prepTime, 10) : null,
        cook_time_minutes: cookTime ? parseInt(cookTime, 10) : null,
        servings: servings ? parseInt(servings, 10) || 1 : 1,
        ingredients: cleanedIngredients,
        instructions: cleanedInstructions,
        image_url: finalImageUrl,
        cloudinary_public_id: finalPublicId,
        tags: tagsInput
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean),
        source_url: sourceUrl.trim() || undefined,
      }

      if (isEditing && id) {
        await updateRecipe(id, payload)
        toast.success('Receta actualizada')
      } else {
        const created = await createRecipe(payload)
        toast.success('Receta guardada')
        await triggerHaptic()
        navigate(`/recipes/${created.id}`)
        return
      }

      await triggerHaptic()
      navigate(`/recipes/${id}`)
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar la receta')
    } finally {
      setSaving(false)
    }
  }

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

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(isEditing && id ? `/recipes/${id}` : '/recipes')}
          className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200/80 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
        >
          <IoChevronBackOutline size={15} />
          {isEditing ? 'Volver a la receta' : 'Recetas'}
        </button>

        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {isEditing ? 'Editar receta' : 'Nueva receta'}
        </span>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-4">
        {/* Imagen */}
        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col items-center gap-3">
            <div className="relative flex h-32 w-full max-w-xs items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
              {previewUrl ? (
                <img src={previewUrl} alt="Vista previa" className="h-full w-full object-cover" />
              ) : (
                <IoRestaurantOutline size={32} className="text-slate-300 dark:text-slate-600" />
              )}
            </div>

            <div className="flex gap-2">
              <label className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <IoImageSharp size={14} />
                <span>Galería</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </label>

              <button
                type="button"
                onClick={handleNativeCamera}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <IoCameraSharp size={14} />
                <span>Cámara</span>
              </button>
            </div>
          </div>
        </section>

        {/* Información básica */}
        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-sm font-bold text-slate-900 dark:text-white">Información básica</h2>

          <div className="flex flex-col gap-3">
            <div>
              <label
                htmlFor="recipe-title"
                className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400"
              >
                Nombre de la receta
              </label>
              <input
                id="recipe-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Pasta al pesto, Té de jengibre..."
                required
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="recipe-description"
                className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400"
              >
                Descripción (opcional)
              </label>
              <textarea
                id="recipe-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Una receta rápida para cualquier día..."
                className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label
                  htmlFor="recipe-category"
                  className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400"
                >
                  Categoría
                </label>
                <select
                  id="recipe-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as RecipeCategory)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="recipe-difficulty"
                  className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400"
                >
                  Dificultad
                </label>
                <select
                  id="recipe-difficulty"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as RecipeDifficulty)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {DIFFICULTY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label
                  htmlFor="recipe-prep"
                  className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400"
                >
                  Prep (min)
                </label>
                <input
                  id="recipe-prep"
                  type="number"
                  min={0}
                  value={prepTime}
                  onChange={(e) => setPrepTime(e.target.value)}
                  placeholder="10"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="recipe-cook"
                  className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400"
                >
                  Cocción (min)
                </label>
                <input
                  id="recipe-cook"
                  type="number"
                  min={0}
                  value={cookTime}
                  onChange={(e) => setCookTime(e.target.value)}
                  placeholder="20"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="recipe-servings"
                  className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400"
                >
                  Porciones
                </label>
                <input
                  id="recipe-servings"
                  type="number"
                  min={1}
                  value={servings}
                  onChange={(e) => setServings(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="recipe-tags"
                className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400"
              >
                Etiquetas (separadas por coma)
              </label>
              <input
                id="recipe-tags"
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="rápida, vegetariana, desayuno"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="recipe-source"
                className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400"
              >
                Enlace de origen (opcional)
              </label>
              <input
                id="recipe-source"
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>
        </section>

        {/* Ingredientes */}
        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                <IoLeafOutline size={14} />
              </span>
              Ingredientes
            </h2>
            <button
              type="button"
              onClick={addIngredient}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <IoAddSharp size={13} />
              Añadir
            </button>
          </div>

          <div className="flex flex-col gap-2.5">
            {ingredients.map((ing, index) => (
              <div
                key={index}
                className="rounded-2xl border border-slate-100 bg-slate-50/60 p-2.5 dark:border-slate-800 dark:bg-slate-800/40"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={ing.name}
                    onChange={(e) => updateIngredient(index, { name: e.target.value })}
                    placeholder="Ingrediente"
                    aria-label={`Ingrediente ${index + 1}`}
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                  <input
                    type="number"
                    value={ing.amount ?? ''}
                    onChange={(e) =>
                      updateIngredient(index, {
                        amount: e.target.value === '' ? null : parseFloat(e.target.value),
                      })
                    }
                    placeholder="Cant."
                    aria-label={`Cantidad del ingrediente ${index + 1}`}
                    className="w-16 shrink-0 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                  <select
                    value={ing.unit || ''}
                    onChange={(e) => updateIngredient(index, { unit: e.target.value || null })}
                    aria-label={`Unidad del ingrediente ${index + 1}`}
                    className="w-20 shrink-0 rounded-xl border border-slate-200 bg-white px-1.5 py-2 text-xs font-semibold outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u} value={u}>
                        {u || '—'}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeIngredient(index)}
                    aria-label={`Eliminar ingrediente ${index + 1}`}
                    className="shrink-0 rounded-xl p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                  >
                    <IoTrashSharp size={14} />
                  </button>
                </div>
                <input
                  type="text"
                  value={ing.notes ?? ''}
                  onChange={(e) => updateIngredient(index, { notes: e.target.value || null })}
                  placeholder="Notas (opcional): picado fino, sin sal..."
                  aria-label={`Notas del ingrediente ${index + 1}`}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Instrucciones */}
        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
                <IoListOutline size={14} />
              </span>
              Preparación
            </h2>
            <button
              type="button"
              onClick={addInstruction}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <IoAddSharp size={13} />
              Añadir paso
            </button>
          </div>

          <div className="flex flex-col gap-2.5">
            {instructions.map((step, index) => (
              <div key={index} className="flex items-start gap-2">
                <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white dark:bg-white dark:text-slate-900">
                  {index + 1}
                </span>
                <textarea
                  value={step}
                  onChange={(e) => updateInstruction(index, e.target.value)}
                  rows={2}
                  placeholder="Describe este paso..."
                  aria-label={`Paso ${index + 1}`}
                  className="min-w-0 flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <div className="mt-1 flex shrink-0 flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => moveInstruction(index, -1)}
                    disabled={index === 0}
                    aria-label={`Mover paso ${index + 1} arriba`}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                  >
                    <IoArrowUpOutline size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveInstruction(index, 1)}
                    disabled={index === instructions.length - 1}
                    aria-label={`Mover paso ${index + 1} abajo`}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                  >
                    <IoArrowDownOutline size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeInstruction(index)}
                    aria-label={`Eliminar paso ${index + 1}`}
                    className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                  >
                    <IoCloseCircleSharp size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Acciones */}
        <div className="sticky bottom-20 z-10 flex gap-2 rounded-3xl border border-slate-200/80 bg-white/95 p-3 shadow-lg backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95 md:bottom-4">
          <button
            type="button"
            onClick={() => navigate(isEditing && id ? `/recipes/${id}` : '/recipes')}
            className="flex-1 rounded-2xl border border-slate-200 py-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="flex-1 rounded-2xl bg-slate-900 py-3 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900"
          >
            {saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear receta'}
          </button>
        </div>
      </form>
    </div>
  )
}
