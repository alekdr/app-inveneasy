import { useEffect, useState } from 'react'
import {
  IoAddSharp as Add,
  IoTrashSharp as Trash,
  IoPencilSharp as Edit2,
  IoCameraSharp as Camera,
  IoImageSharp as Gallery,
  IoCloseCircleSharp as CloseCircle,
  IoCheckmarkSharp as Check,
  IoHeartSharp as Heart,
  IoCartSharp as Cart,
  IoSearchSharp as Search,
  IoOpenOutline as OpenLink,
} from 'react-icons/io5'
import {
  fetchWishlist,
  createWishlistItem,
  updateWishlistItem,
  deleteWishlistItem,
} from '../services/supabase'
import { uploadImage } from '../services/api'
import { takePhoto, triggerHaptic } from '../services/capacitor'
import { formatCurrency, getSavedCurrency, type CurrencyCode } from '../services/currency'
import { toast } from 'sonner'
import type { WishlistItem } from '../types'

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([])
  const [filter, setFilter] = useState<'all' | 'pending' | 'purchased'>('pending')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const currency: CurrencyCode = getSavedCurrency()

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null)
  const [title, setTitle] = useState('')
  const [estimatedPrice, setEstimatedPrice] = useState('')
  const [category, setCategory] = useState('General')
  const [linkUrl, setLinkUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedBlob, setSelectedBlob] = useState<Blob | File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [saving, setSaving] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await fetchWishlist()
      setItems(data || [])
    } catch {
      toast.error('Error al cargar la lista de deseos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const openCreateModal = () => {
    setEditingItem(null)
    setTitle('')
    setEstimatedPrice('')
    setCategory('General')
    setLinkUrl('')
    setNotes('')
    setSelectedBlob(null)
    setPreviewUrl('')
    setIsModalOpen(true)
  }

  const openEditModal = (item: WishlistItem) => {
    setEditingItem(item)
    setTitle(item.title)
    setEstimatedPrice(item.estimated_price > 0 ? item.estimated_price.toString() : '')
    setCategory(item.category || 'General')
    setLinkUrl(item.link_url || '')
    setNotes(item.notes || '')
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
    if (!title.trim()) return

    setSaving(true)
    try {
      let finalImageUrl = editingItem?.image_url || undefined
      let finalPublicId = editingItem?.cloudinary_public_id || undefined

      if (selectedBlob) {
        try {
          const fileToUpload =
            selectedBlob instanceof File
              ? selectedBlob
              : new File([selectedBlob], 'wishlist.jpg', { type: 'image/jpeg' })

          const uploadRes = await uploadImage(fileToUpload)
          finalImageUrl = uploadRes.image_url
          finalPublicId = uploadRes.public_id
        } catch {
          toast.warning('No se pudo subir la foto a Cloudinary, guardando sin foto')
        }
      }

      const priceNum = estimatedPrice ? parseFloat(estimatedPrice) : 0

      if (editingItem) {
        await updateWishlistItem(editingItem.id, {
          title: title.trim(),
          estimated_price: priceNum,
          category,
          link_url: linkUrl.trim() || undefined,
          notes: notes.trim() || undefined,
          image_url: finalImageUrl,
          cloudinary_public_id: finalPublicId,
        })
        toast.success('Deseo actualizado')
      } else {
        await createWishlistItem({
          title: title.trim(),
          estimated_price: priceNum,
          category,
          link_url: linkUrl.trim() || undefined,
          notes: notes.trim() || undefined,
          image_url: finalImageUrl,
          cloudinary_public_id: finalPublicId,
        })
        toast.success('Añadido a tu lista de deseos')
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

  const handleTogglePurchased = async (item: WishlistItem) => {
    try {
      await triggerHaptic()
      const nextStatus = !item.is_purchased
      await updateWishlistItem(item.id, {
        is_purchased: nextStatus,
        purchased_date: nextStatus ? new Date().toISOString().split('T')[0] : null,
      })
      toast.success(nextStatus ? '¡Marcado como comprado!' : 'Movido a pendientes')
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? { ...i, is_purchased: nextStatus, purchased_date: nextStatus ? new Date().toISOString() : null }
            : i
        )
      )
    } catch {
      toast.error('Error al actualizar estado')
    }
  }

  const handleDelete = async (item: WishlistItem) => {
    if (!confirm(`¿Eliminar "${item.title}" de tu lista de deseos?`)) return
    try {
      await deleteWishlistItem(item.id)
      await triggerHaptic()
      toast.success('Eliminado de la lista')
      setItems((prev) => prev.filter((i) => i.id !== item.id))
    } catch {
      toast.error('Error al eliminar')
    }
  }

  // Filtrado
  const filtered = items.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase())
    if (!matchesSearch) return false

    if (filter === 'pending') return !item.is_purchased
    if (filter === 'purchased') return item.is_purchased
    return true
  })

  const pendingCount = items.filter((i) => !i.is_purchased).length
  const purchasedCount = items.filter((i) => i.is_purchased).length
  const totalPendingCost = items
    .filter((i) => !i.is_purchased)
    .reduce((sum, i) => sum + Number(i.estimated_price || 0), 0)

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Lista de Deseos
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            Artículos, productos y prendas que planeas comprar
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 active:scale-95 dark:bg-white dark:text-slate-900"
        >
          <Add size={16} />
          <span>Añadir deseo</span>
        </button>
      </div>

      {/* Resumen Superior */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Deseos Pendientes
          </span>
          <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {pendingCount}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-[#fae8df]/40 p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#9c5936] dark:text-rose-300">
            Total Estimado
          </span>
          <p className="mt-1 text-xl font-bold tracking-tight text-[#9c5936] dark:text-rose-300">
            {formatCurrency(totalPendingCost, currency)}
          </p>
        </div>
      </div>

      {/* Filtros y Buscador */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Buscador */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar deseo o categoría..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-slate-200/80 bg-white py-2.5 pl-11 pr-4 text-xs font-semibold outline-none shadow-xs transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          />
        </div>

        {/* Píldoras de Filtro */}
        <div className="flex items-center rounded-2xl border border-slate-200/90 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900">
          <button
            onClick={() => setFilter('pending')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              filter === 'pending'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            Por comprar ({pendingCount})
          </button>
          <button
            onClick={() => setFilter('purchased')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              filter === 'purchased'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            Comprados ({purchasedCount})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              filter === 'all'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            Todos
          </button>
        </div>
      </div>

      {/* Grid de Cards: imagen arriba, nombre y precio abajo */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white/50 p-12 text-center dark:border-slate-800 dark:bg-slate-900/40">
          <Heart size={36} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            {filter === 'purchased' ? 'Aún no has marcado compras realizadas' : 'Tu lista de deseos está vacía'}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Pulsa el botón "Añadir deseo" para guardar artículos que quieres conseguir.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`group flex flex-col justify-between overflow-hidden rounded-3xl border bg-white shadow-xs transition-all hover:border-slate-300 hover:shadow-md dark:bg-slate-900 ${
                item.is_purchased
                  ? 'border-slate-100 opacity-60 dark:border-slate-800/60'
                  : 'border-slate-200/80 dark:border-slate-800'
              }`}
            >
              {/* Imagen arriba */}
              <div className="relative aspect-square w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-300 dark:text-slate-600">
                    <Cart size={36} />
                  </div>
                )}

                {/* Badge Comprado / Pendiente */}
                <button
                  type="button"
                  onClick={() => handleTogglePurchased(item)}
                  title={item.is_purchased ? 'Marcar como pendiente' : 'Marcar como comprado'}
                  className={`absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-2xl backdrop-blur-md transition-all active:scale-90 ${
                    item.is_purchased
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'border border-white/60 bg-white/80 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300'
                  }`}
                >
                  <Check size={16} />
                </button>

                {/* Enlace externo si existe */}
                {item.link_url && (
                  <a
                    href={item.link_url}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-2xl border border-white/60 bg-white/80 text-slate-600 backdrop-blur-md hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300"
                  >
                    <OpenLink size={14} />
                  </a>
                )}
              </div>

              {/* Nombre y acciones abajo */}
              <div className="flex flex-col justify-between p-3.5">
                <div>
                  <h4
                    className={`text-xs font-bold tracking-tight text-slate-900 dark:text-white line-clamp-1 ${
                      item.is_purchased ? 'line-through text-slate-400 dark:text-slate-500' : ''
                    }`}
                  >
                    {item.title}
                  </h4>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {item.category}
                    </span>
                    {item.estimated_price > 0 && (
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {formatCurrency(Number(item.estimated_price), currency)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Acciones Editar y Eliminar */}
                <div className="mt-3 flex items-center justify-end gap-1 border-t border-slate-100 pt-2 dark:border-slate-800">
                  <button
                    onClick={() => openEditModal(item)}
                    title="Editar deseo"
                    className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    title="Eliminar deseo"
                    className="rounded-xl p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                  >
                    <Trash size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Crear / Editar Deseo */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-sm my-auto max-h-[92vh] overflow-y-auto rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 scrollbar-thin">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {editingItem ? 'Editar Deseo' : 'Nuevo Deseo'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <CloseCircle size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex flex-col gap-3.5">
              {/* Vista previa de imagen */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <Gallery size={28} className="text-slate-300 dark:text-slate-600" />
                  )}
                </div>

                <div className="flex gap-2">
                  <label className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    <Gallery size={14} />
                    <span>Galería</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleNativeCamera}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <Camera size={14} />
                    <span>Cámara</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Nombre del artículo
                </label>
                <input
                  type="text"
                  placeholder="Ej. Zapatillas Nike Dunk, Perfume Dior..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  autoFocus
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                    Precio ({currency})
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={estimatedPrice}
                    onChange={(e) => setEstimatedPrice(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                    Categoría
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="General">General</option>
                    <option value="Ropa">Ropa</option>
                    <option value="Calzado">Calzado</option>
                    <option value="Accesorios">Accesorios</option>
                    <option value="Tecnología">Tecnología</option>
                    <option value="Aseo">Aseo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Enlace de compra (Opcional)
                </label>
                <input
                  type="url"
                  placeholder="https://tienda.com/producto..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
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
