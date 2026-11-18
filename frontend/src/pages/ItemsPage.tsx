import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  IoArrowBackSharp as ArrowLeft,
  IoAddSharp as Add,
  IoTrashSharp as Trash,
  IoPencilSharp as Edit2,
  IoCameraSharp as Camera,
  IoImageSharp as Gallery,
  IoCloseCircleSharp as CloseCircle,
  IoCubeSharp as Box,
} from 'react-icons/io5'
import {
  fetchItems,
  createItem,
  updateItem,
  deleteItem,
  supabase,
} from '../services/supabase'
import { uploadImage, getUploadErrorMessage } from '../services/api'
import { takePhoto, triggerHaptic } from '../services/capacitor'
import { confirmDialog } from '../stores/confirmStore'
import { toast } from 'sonner'
import type { ClosetItem } from '../types'

export default function ItemsPage() {
  const { categoryId, subId } = useParams<{ categoryId: string; subId: string }>()
  const navigate = useNavigate()

  const [subName, setSubName] = useState<string>('')
  const [items, setItems] = useState<ClosetItem[]>([])
  const [loading, setLoading] = useState(true)

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ClosetItem | null>(null)
  const [itemName, setItemName] = useState('')
  const [selectedBlob, setSelectedBlob] = useState<Blob | File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [saving, setSaving] = useState(false)

  const loadData = async () => {
    if (!subId) return
    setLoading(true)
    try {
      const { data: sub } = await supabase
        .from('closet_subcategories')
        .select('name')
        .eq('id', subId)
        .single()
      if (sub) setSubName(sub.name)

      const fetched = await fetchItems(subId)
      setItems(fetched || [])
    } catch {
      toast.error('Error al cargar elementos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [subId])

  const openCreateModal = () => {
    setEditingItem(null)
    setItemName('')
    setSelectedBlob(null)
    setPreviewUrl('')
    setIsModalOpen(true)
  }

  const openEditModal = (item: ClosetItem) => {
    setEditingItem(item)
    setItemName(item.name)
    setSelectedBlob(null)
    setPreviewUrl(item.image_url || '')
    setIsModalOpen(true)
  }

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!itemName.trim() || !subId) return

    setSaving(true)
    try {
      let finalImageUrl = editingItem?.image_url || undefined
      let finalPublicId = editingItem?.cloudinary_public_id || undefined

      if (selectedBlob) {
        try {
          const fileToUpload =
            selectedBlob instanceof File
              ? selectedBlob
              : new File([selectedBlob], 'capture.jpg', { type: 'image/jpeg' })

          const uploadRes = await uploadImage(fileToUpload)
          finalImageUrl = uploadRes.image_url
          finalPublicId = uploadRes.public_id
        } catch (err) {
          toast.warning(getUploadErrorMessage(err))
        }
      }

      if (editingItem) {
        await updateItem(editingItem.id, {
          name: itemName.trim(),
          image_url: finalImageUrl,
          cloudinary_public_id: finalPublicId,
        })
        toast.success('Elemento actualizado')
      } else {
        await createItem(subId, itemName.trim(), finalImageUrl, finalPublicId)
        toast.success('Elemento creado')
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

  const handleDelete = async (itemId: string) => {
    const ok = await confirmDialog({
      title: 'Eliminar Prenda / Artículo',
      message: '¿Estás seguro de que deseas eliminar este elemento del armario?',
      confirmText: 'Eliminar',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteItem(itemId)
      await triggerHaptic()
      toast.success('Elemento eliminado')
      setItems(items.filter((i) => i.id !== itemId))
    } catch {
      toast.error('Error al eliminar')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/closet/${categoryId}`)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/80 bg-white text-slate-700 shadow-xs transition hover:bg-slate-50 active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {subName || 'Elementos'}
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              {items.length} artículos guardados
            </p>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 active:scale-95 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
        >
          <Add size={16} />
          <span>Añadir elemento</span>
        </button>
      </div>

      {/* Grid de Cards: imagen arriba, nombre abajo */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800 dark:border-slate-700 dark:border-t-white" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white/50 p-12 text-center dark:border-slate-800 dark:bg-slate-900/40">
          <Box size={36} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            No tienes elementos aún
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Pulsa el botón "Añadir elemento" para registrar tu primera prenda o accesorio.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="group relative flex flex-col overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-xs transition hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              {/* Imagen arriba */}
              <div className="relative aspect-square w-full bg-[#fbfaf8] dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <Gallery size={32} className="text-slate-300 dark:text-slate-600" />
                )}

                {/* Acciones flotantes */}
                <div className="absolute right-2.5 top-2.5 flex gap-1.5 opacity-90 transition sm:opacity-0 sm:group-hover:opacity-100">
                  <button
                    onClick={() => openEditModal(item)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/90 text-slate-700 shadow-xs backdrop-blur-md transition hover:bg-white dark:bg-slate-900/90 dark:text-slate-200"
                    title="Editar"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/90 text-rose-500 shadow-xs backdrop-blur-md transition hover:bg-rose-50 dark:bg-slate-900/90 dark:hover:bg-rose-950/40"
                    title="Eliminar"
                  >
                    <Trash size={14} />
                  </button>
                </div>
              </div>

              {/* Nombre abajo */}
              <div className="p-3.5">
                <p className="truncate font-bold text-slate-800 dark:text-slate-100 text-xs">
                  {item.name}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Añadir / Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {editingItem ? 'Editar elemento' : 'Nuevo elemento'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <CloseCircle size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="relative aspect-video w-full rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center dark:border-slate-700 dark:bg-slate-800/40">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center text-slate-400">
                      <Gallery size={24} className="mb-1" />
                      <span className="text-[11px] font-semibold">Sin imagen</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleNativeCamera}
                    className="flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <Camera size={15} />
                    <span>Cámara</span>
                  </button>

                  <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    <Gallery size={15} />
                    <span>Galería</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Nombre
                </label>
                <input
                  type="text"
                  placeholder="Ej. Jeans clásicos, Chaqueta de cuero..."
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
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
                  disabled={saving || !itemName.trim()}
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
