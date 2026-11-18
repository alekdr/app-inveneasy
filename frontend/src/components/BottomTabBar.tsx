import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  IoGridOutline,
  IoAddSharp,
  IoSettingsOutline,
  IoCloseOutline,
  IoArrowDownOutline,
  IoArrowUpOutline,
} from 'react-icons/io5'
import { supabase } from '../services/supabase'
import { isOnline, addToOfflineQueue } from '../services/offlineSync'
import { triggerHaptic } from '../services/capacitor'
import { toast } from 'sonner'

export default function BottomTabBar() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Alimentación')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const handleOpenModal = async () => {
    await triggerHaptic()
    setIsModalOpen(true)
  }

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanAmount = parseFloat(amount.replace(/\./g, '').replace(',', '.'))
    if (!cleanAmount || isNaN(cleanAmount) || cleanAmount <= 0) {
      toast.error('Ingresa un monto válido')
      return
    }

    setSaving(true)
    const todayStr = new Date().toISOString().split('T')[0]

    try {
      await triggerHaptic()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Inicia sesión para registrar transacciones')
        return
      }

      const payload = {
        user_id: user.id,
        type,
        amount: cleanAmount,
        category,
        description: description.trim() || null,
        transaction_date: todayStr,
      }

      if (!isOnline()) {
        addToOfflineQueue({
          table: 'financial_transactions',
          action: 'insert',
          payload,
        })
        toast.success('Transacción guardada localmente (se sincronizará al conectar)')
      } else {
        const { error } = await supabase.from('financial_transactions').insert(payload)
        if (error) throw error
        toast.success(type === 'expense' ? 'Gasto registrado' : 'Ingreso registrado')
      }

      // Reset y cerrar
      setAmount('')
      setDescription('')
      setIsModalOpen(false)

      // Disparar evento para que si la página actual escucha o está en finanzas/dashboard se actualice
      window.dispatchEvent(new CustomEvent('inven_transaction_created'))
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-50 border-t border-[#eeece8] bg-white/95 backdrop-blur-xl dark:bg-[#18181b]/95 dark:border-[#222226]">
        <div className="mx-auto flex max-w-md items-center justify-around px-6 py-2">
          {/* 1. Inicio */}
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-1 text-[11px] font-bold transition-all ${
                isActive
                  ? 'text-slate-900 dark:text-white'
                  : 'text-slate-400 hover:text-slate-600 dark:text-slate-500'
              }`
            }
          >
            <IoGridOutline size={22} />
            <span>Inicio</span>
          </NavLink>

          {/* 2. Botón Central [+] para Registro Rápido en Finanzas */}
          <button
            type="button"
            onClick={handleOpenModal}
            title="Registrar en finanzas"
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg transition active:scale-90 hover:bg-slate-800 dark:bg-white dark:text-slate-900 -mt-3 border-2 border-white dark:border-[#18181b]"
          >
            <IoAddSharp size={28} />
          </button>

          {/* 3. Configuración */}
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-1 text-[11px] font-bold transition-all ${
                isActive
                  ? 'text-slate-900 dark:text-white'
                  : 'text-slate-400 hover:text-slate-600 dark:text-slate-500'
              }`
            }
          >
            <IoSettingsOutline size={22} />
            <span>Ajustes</span>
          </NavLink>
        </div>
      </nav>

      {/* Modal Registro Rápido en Finanzas */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs animate-in fade-in sm:items-center p-4">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Nuevo Registro</h3>
                <p className="text-xs text-slate-400">Registra un movimiento en tus finanzas</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <IoCloseOutline size={20} />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSaveTransaction} className="flex flex-col gap-4">
              {/* Selector Gasto / Ingreso */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { triggerHaptic(); setType('expense') }}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-2xl py-2.5 text-xs font-bold transition ${
                    type === 'expense'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  <IoArrowUpOutline size={14} />
                  <span>Gasto</span>
                </button>
                <button
                  type="button"
                  onClick={() => { triggerHaptic(); setType('income') }}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-2xl py-2.5 text-xs font-bold transition ${
                    type === 'income'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  <IoArrowDownOutline size={14} />
                  <span>Ingreso</span>
                </button>
              </div>

              {/* Monto */}
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Monto
                </label>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                  <span className="text-xs font-bold text-slate-400">$</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    required
                    autoFocus
                    className="flex-1 bg-transparent text-sm font-bold text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              {/* Categoría */}
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Categoría
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {type === 'expense' ? (
                    <>
                      <option value="Alimentación">Alimentación</option>
                      <option value="Transporte">Transporte</option>
                      <option value="Servicios">Servicios</option>
                      <option value="Ocio">Ocio</option>
                      <option value="Ropa">Ropa</option>
                      <option value="Salud">Salud</option>
                      <option value="Hogar">Hogar</option>
                      <option value="Otros">Otros</option>
                    </>
                  ) : (
                    <>
                      <option value="Salario">Salario</option>
                      <option value="Ventas">Ventas</option>
                      <option value="Regalo">Regalo</option>
                      <option value="Inversión">Inversión</option>
                      <option value="Otros">Otros</option>
                    </>
                  )}
                </select>
              </div>

              {/* Descripción */}
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Descripción (opcional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ej. Almuerzo, Uber, etc."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Botones */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 rounded-2xl border border-slate-200 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !amount}
                  className="flex-1 rounded-2xl bg-slate-900 py-3 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
