import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  IoArrowBackSharp as ArrowLeft,
  IoAddSharp as Add,
  IoPencilSharp as Edit2,
  IoTrashSharp as Trash,
  IoFolderSharp as Folder2,
  IoChevronForwardSharp as ArrowRight2,
  IoSearchSharp as SearchNormal1,
  IoCloseCircleSharp as CloseCircle,
} from 'react-icons/io5'
import {
  fetchSubcategories,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
  supabase,
} from '../services/supabase'
import { triggerHaptic } from '../services/capacitor'
import { toast } from 'sonner'
import type { ClosetSubcategory } from '../types'

export default function SubcategoriesPage() {
  const { categoryId } = useParams<{ categoryId: string }>()
  const navigate = useNavigate()

  const [categoryName, setCategoryName] = useState<string>('')
  const [subcategories, setSubcategories] = useState<ClosetSubcategory[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSub, setEditingSub] = useState<ClosetSubcategory | null>(null)
  const [subName, setSubName] = useState('')
  const [saving, setSaving] = useState(false)

  const loadData = async () => {
    if (!categoryId) return
    setLoading(true)
    try {
      const { data: cat } = await supabase
        .from('closet_categories')
        .select('name')
        .eq('id', categoryId)
        .single()

      if (cat) setCategoryName(cat.name)

      const subs = await fetchSubcategories(categoryId)
      setSubcategories(subs || [])
    } catch (err: any) {
      toast.error('Error al cargar subcategorías')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [categoryId])

  const openCreateModal = () => {
    setEditingSub(null)
    setSubName('')
    setIsModalOpen(true)
  }

  const openEditModal = (e: React.MouseEvent, sub: ClosetSubcategory) => {
    e.stopPropagation()
    setEditingSub(sub)
    setSubName(sub.name)
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subName.trim() || !categoryId) return

    setSaving(true)
    try {
      if (editingSub) {
        await updateSubcategory(editingSub.id, subName.trim())
        toast.success('Subcategoría actualizada')
      } else {
        await createSubcategory(categoryId, subName.trim())
        toast.success('Subcategoría creada con éxito')
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

  const handleDelete = async (e: React.MouseEvent, sub: ClosetSubcategory) => {
    e.stopPropagation()
    if (!confirm(`¿Eliminar la subcategoría "${sub.name}" y todos sus elementos?`)) return

    try {
      await deleteSubcategory(sub.id)
      await triggerHaptic()
      toast.success('Subcategoría eliminada')
      setSubcategories(subcategories.filter((s) => s.id !== sub.id))
    } catch (err: any) {
      toast.error('Error al eliminar subcategoría')
    }
  }

  const filtered = subcategories.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/closet')}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/80 bg-white text-slate-700 shadow-xs transition hover:bg-slate-50 active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {categoryName || 'Subcategorías'}
            </h2>
            <p className="text-xs text-slate-400">
              {subcategories.length} subcategorías en esta sección
            </p>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 active:scale-95 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
        >
          <Add size={16} />
          <span>Añadir subcategoría</span>
        </button>
      </div>

      {/* Buscador minimalista */}
      <div className="relative">
        <SearchNormal1
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          placeholder="Filtrar subcategorías..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-2xl border border-slate-200/80 bg-white py-3 pl-11 pr-4 text-xs font-semibold outline-none shadow-xs transition focus:border-violet-400 focus:ring-4 focus:ring-violet-400/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
        />
      </div>

      {/* Lista de Subcategorías */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800 dark:border-slate-700 dark:border-t-white" />
        </div>
      ) : subcategories.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white/50 p-12 text-center dark:border-slate-800 dark:bg-slate-900/40">
          <Folder2 size={36} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            No hay subcategorías en esta sección
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Pulsa el botón "Añadir subcategoría" para crear la primera.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map((sub) => (
            <div
              key={sub.id}
              onClick={() => navigate(`/closet/${categoryId}/${sub.id}`)}
              className="group flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition-all hover:border-slate-300 hover:shadow-md active:scale-[0.99] dark:border-slate-800/80 dark:bg-slate-900 dark:hover:border-slate-700"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0eeff] text-[#6b5ce7] dark:bg-violet-950/40 dark:text-violet-300">
                  <Folder2 size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {sub.name}
                  </h4>
                  <p className="text-[11px] text-slate-400">Toca para abrir elementos</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Botón Editar */}
                <button
                  onClick={(e) => openEditModal(e, sub)}
                  title="Editar nombre"
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <Edit2 size={16} />
                </button>

                {/* Botón Eliminar */}
                <button
                  onClick={(e) => handleDelete(e, sub)}
                  title="Eliminar subcategoría"
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                >
                  <Trash size={16} />
                </button>

                <div className="pl-1 text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-600 dark:text-slate-600 dark:group-hover:text-slate-300">
                  <ArrowRight2 size={16} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Crear / Editar Subcategoría */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {editingSub ? 'Editar subcategoría' : 'Nueva subcategoría'}
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
                  placeholder="Ej. Pantalones, Chaquetas, Medias..."
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
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
                  disabled={saving || !subName.trim()}
                  className="flex-1 rounded-2xl bg-slate-900 py-3 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
