import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IoAddSharp as Add,
  IoTrashSharp as Trash,
  IoSearchSharp as SearchNormal1,
  IoCloseCircleSharp as CloseCircle,
  IoFolderSharp as Folder2,
  IoChevronForwardSharp as ArrowRight2,
  IoPencilSharp as Edit2,
  IoCubeSharp as Box,
  IoSparklesSharp as Sparkles,
  IoRefreshSharp as Refresh,
} from 'react-icons/io5'
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  supabase,
} from '../services/supabase'
import { triggerHaptic } from '../services/capacitor'
import { toast } from 'sonner'
import type { ClosetCategory } from '../types'

// Paleta pastel suave para las tarjetas
const pastelThemes: Record<string, { bg: string; text: string }> = {
  Ropa: { bg: 'bg-[#e9e5f5]', text: 'text-[#5a48ab]' },
  Aseo: { bg: 'bg-[#e2f4ec]', text: 'text-[#2b7a5a]' },
  Calzado: { bg: 'bg-[#fae8df]', text: 'text-[#9c5936]' },
  Accesorios: { bg: 'bg-[#e3edf7]', text: 'text-[#38628b]' },
}

type OutfitSlot = {
  label: string
  emoji: string
  categoryNames: string[]
  item: { name: string; image_url: string | null } | null
}

export default function ClosetPage() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [categories, setCategories] = useState<ClosetCategory[]>([])
  const [loading, setLoading] = useState(true)

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCat, setEditingCat] = useState<ClosetCategory | null>(null)
  const [catName, setCatName] = useState('')
  const [saving, setSaving] = useState(false)

  const [outfitModalOpen, setOutfitModalOpen] = useState(false)
  const [outfitLoading, setOutfitLoading] = useState(false)
  const [occasion, setOccasion] = useState<'Casual' | 'Gym' | 'Elegante' | 'Trabajo'>('Casual')
  const [outfit, setOutfit] = useState<OutfitSlot[]>([])

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await fetchCategories()
      setCategories(data || [])
    } catch {
      toast.error('Error al cargar categorías')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const openCreateModal = () => {
    setEditingCat(null)
    setCatName('')
    setIsModalOpen(true)
  }

  const openEditModal = (e: React.MouseEvent, cat: ClosetCategory) => {
    e.stopPropagation()
    setEditingCat(cat)
    setCatName(cat.name)
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!catName.trim()) return

    setSaving(true)
    try {
      if (editingCat) {
        await updateCategory(editingCat.id, catName.trim())
        toast.success('Sección actualizada')
      } else {
        await createCategory(catName.trim())
        toast.success('Sección creada')
      }
      await triggerHaptic()
      setIsModalOpen(false)
      await loadData()
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (e: React.MouseEvent, cat: ClosetCategory) => {
    e.stopPropagation()
    if (!confirm(`¿Eliminar la sección "${cat.name}" y todos sus elementos?`)) return

    try {
      await deleteCategory(cat.id)
      await triggerHaptic()
      toast.success('Sección eliminada')
      setCategories(categories.filter((c) => c.id !== cat.id))
    } catch {
      toast.error('Error al eliminar sección')
    }
  }

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const generateOutfit = async (selectedOccasion: typeof occasion) => {
    setOutfitLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.error('Inicia sesión'); return }

      const occasionMap: Record<string, { slots: Array<{ label: string; emoji: string; keywords: string[] }> }> = {
        Casual: {
          slots: [
            { label: 'Superior', emoji: '👕', keywords: ['Ropa', 'Camisetas', 'Poleras', 'Torso', 'Camisas'] },
            { label: 'Pantalón', emoji: '👖', keywords: ['Pantalones', 'Jeans', 'Shorts', 'Bermudas'] },
            { label: 'Calzado', emoji: '👟', keywords: ['Calzado', 'Tenis', 'Zapatos', 'Sneakers'] },
            { label: 'Accesorio', emoji: '🕶️', keywords: ['Accesorios', 'Gorras', 'Relojes', 'Cinturones'] },
          ],
        },
        Gym: {
          slots: [
            { label: 'Top', emoji: '🏋️', keywords: ['Gym', 'Deportivo', 'Ropa', 'Camisetas', 'Torso'] },
            { label: 'Pants', emoji: '🩱', keywords: ['Deportivo', 'Pantalones', 'Leggins', 'Shorts'] },
            { label: 'Calzado', emoji: '👟', keywords: ['Calzado', 'Tenis', 'Deportivo'] },
          ],
        },
        Elegante: {
          slots: [
            { label: 'Superior', emoji: '👔', keywords: ['Ropa', 'Camisas', 'Torso', 'Blazer', 'Formal'] },
            { label: 'Pantalón', emoji: '👖', keywords: ['Pantalones', 'Formal', 'Jeans'] },
            { label: 'Calzado', emoji: '👞', keywords: ['Calzado', 'Zapatos', 'Formal'] },
            { label: 'Accesorio', emoji: '⌚', keywords: ['Accesorios', 'Relojes', 'Cinturones', 'Corbatas'] },
          ],
        },
        Trabajo: {
          slots: [
            { label: 'Superior', emoji: '👔', keywords: ['Ropa', 'Camisas', 'Torso', 'Formal'] },
            { label: 'Pantalón', emoji: '👖', keywords: ['Pantalones', 'Formal'] },
            { label: 'Calzado', emoji: '👞', keywords: ['Calzado', 'Zapatos'] },
            { label: 'Accesorio', emoji: '💼', keywords: ['Accesorios', 'Bolsos', 'Maletines'] },
          ],
        },
      }

      const slots = occasionMap[selectedOccasion]?.slots || occasionMap.Casual.slots

      const { data: allItems } = await supabase
        .from('closet_items')
        .select('*, closet_subcategories(name, closet_categories(name))')
        .eq('user_id', user.id)

      const result: OutfitSlot[] = slots.map((slot) => {
        const matching = (allItems || []).filter((item: any) => {
          const catName = item.closet_subcategories?.closet_categories?.name || ''
          const subcatName = item.closet_subcategories?.name || ''
          return slot.keywords.some(
            (kw) =>
              catName.toLowerCase().includes(kw.toLowerCase()) ||
              subcatName.toLowerCase().includes(kw.toLowerCase())
          )
        })

        const withImg = matching.filter((i: any) => i.image_url)
        const pool = withImg.length > 0 ? withImg : matching

        if (pool.length === 0) return { label: slot.label, emoji: slot.emoji, categoryNames: slot.keywords, item: null }

        const picked = pool[Math.floor(Math.random() * pool.length)]
        return {
          label: slot.label,
          emoji: slot.emoji,
          categoryNames: slot.keywords,
          item: { name: picked.name, image_url: picked.image_url },
        }
      })

      setOutfit(result)
    } catch {
      toast.error('Error al generar outfit')
    } finally {
      setOutfitLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Armario
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            Organiza tus prendas, productos y accesorios por categorías
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => { setOutfitModalOpen(true); generateOutfit(occasion) }}
            className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-violet-700 active:scale-95"
          >
            <Sparkles size={16} />
            <span>¿Qué me pongo? ✨</span>
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 active:scale-95 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            <Add size={16} />
            <span>Añadir sección</span>
          </button>
        </div>
      </div>

      {/* Buscador */}
      <div className="relative">
        <SearchNormal1
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          placeholder="Buscar sección..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-2xl border border-slate-200/80 bg-white py-3 pl-11 pr-4 text-xs font-semibold outline-none shadow-xs transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
        />
      </div>

      {/* Grid de Secciones */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800 dark:border-slate-700 dark:border-t-white" />
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white/50 p-12 text-center dark:border-slate-800 dark:bg-slate-900/40">
          <Box size={36} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            No tienes secciones creadas
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Inicia sesión o añade una con el botón superior.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((cat) => {
            const theme = pastelThemes[cat.name] || {
              bg: 'bg-[#f5f2eb]',
              text: 'text-[#615949]',
            }

            return (
              <div
                key={cat.id}
                onClick={() => navigate(`/closet/${cat.id}`)}
                className="group relative flex flex-col justify-between rounded-3xl border border-slate-200/70 bg-white p-5 shadow-xs transition-all hover:border-slate-300 hover:shadow-md active:scale-[0.98] cursor-pointer dark:border-slate-800 dark:bg-slate-900"
              >
                {/* Header card: Icono pastel + Acciones */}
                <div className="flex items-start justify-between">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl ${theme.bg} ${theme.text}`}
                  >
                    <Folder2 size={22} />
                  </div>

                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                    <button
                      onClick={(e) => openEditModal(e, cat)}
                      title="Editar sección"
                      className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, cat)}
                      title="Eliminar sección"
                      className="rounded-xl p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="mt-5">
                  <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                    {cat.name}
                  </h3>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                    <span>Ver subcategorías</span>
                    <ArrowRight2 size={12} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Crear / Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {editingCat ? 'Editar sección' : 'Nueva sección'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <CloseCircle size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Nombre
                </label>
                <input
                  type="text"
                  placeholder="Ej. Ropa, Calzado, Perfumería..."
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  required
                  autoFocus
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-violet-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 rounded-2xl border border-slate-200 py-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !catName.trim()}
                  className="flex-1 rounded-2xl bg-slate-900 py-3 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Outfit Suggester */}
      {outfitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-xs animate-in fade-in sm:items-center p-4">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200/80 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
            {/* Header modal */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">¿Qué me pongo hoy? ✨</h3>
                <p className="text-xs text-slate-400 mt-0.5">Selecciona la ocasión</p>
              </div>
              <button
                onClick={() => setOutfitModalOpen(false)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <span className="text-lg font-bold">✕</span>
              </button>
            </div>

            {/* Selector ocasión */}
            <div className="px-6 pb-4 flex gap-2 flex-wrap">
              {(['Casual', 'Gym', 'Elegante', 'Trabajo'] as const).map((occ) => (
                <button
                  key={occ}
                  onClick={() => { setOccasion(occ); generateOutfit(occ) }}
                  className={`rounded-2xl px-3 py-1.5 text-xs font-bold transition ${
                    occasion === occ
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-violet-100 hover:text-violet-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {occ === 'Casual' ? '😎 Casual' : occ === 'Gym' ? '🏋️ Gym' : occ === 'Elegante' ? '✨ Elegante' : '💼 Trabajo'}
                </button>
              ))}
            </div>

            {/* Grid de prendas */}
            <div className="px-6 pb-4">
              {outfitLoading ? (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-300 border-t-violet-600" />
                </div>
              ) : outfit.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-6">No se encontraron prendas. Agrega items en tu armario.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {outfit.map((slot, i) => (
                    <div key={i} className="rounded-2xl border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50 overflow-hidden">
                      {slot.item?.image_url ? (
                        <img
                          src={slot.item.image_url}
                          alt={slot.item.name}
                          className="w-full h-28 object-cover"
                        />
                      ) : (
                        <div className="w-full h-28 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800">
                          <span className="text-3xl">{slot.emoji}</span>
                          <span className="text-[10px] text-slate-400 mt-1">{slot.item ? slot.item.name : 'Sin prenda'}</span>
                        </div>
                      )}
                      <div className="px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{slot.label}</p>
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {slot.item ? slot.item.name : 'Sin coincidencia'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Botón otra combinación */}
            <div className="px-6 pb-6">
              <button
                onClick={() => generateOutfit(occasion)}
                disabled={outfitLoading}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-violet-600 py-3 text-xs font-bold text-white transition hover:bg-violet-700 active:scale-95 disabled:opacity-50"
              >
                <Refresh size={15} />
                Otra combinación 🔀
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
