import { useState, useEffect } from 'react'
import {
  IoAddSharp as Plus,
  IoArrowDownOutline as ArrowDownLeft,
  IoArrowUpOutline as ArrowUpRight,
  IoWalletOutline as PiggyBank,
  IoCheckmarkSharp as Check,
  IoTrashSharp as Trash,
} from 'react-icons/io5'
import { supabase } from '../services/supabase'
import { triggerHaptic } from '../services/capacitor'
import { toast } from 'sonner'
import { formatCurrency } from '../services/currency'
import type { FinancialTransaction, ShoppingItem, Saving } from '../types'

// ── Tipos locales ───────────────────────────────────────────────────────────
interface Debt {
  id: string
  user_id: string
  creditor: string
  amount: number
  due_date: string | null
  note: string | null
  paid: boolean
  created_at: string
}

// ── Helpers ─────────────────────────────────────────────────────────────────
/** Elimina puntos de miles y convierte coma decimal → punto para COP */
function parseCOP(value: string): number {
  const v = value.trim().replace(/\./g, '').replace(/,/g, '.')
  return parseFloat(v) || 0
}

/** Muestra un monto en COP con separadores de miles */
function display(num: number): string {
  return formatCurrency(num, 'COP')
}

// ── Componente ───────────────────────────────────────────────────────────────
export default function FinancesPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'shopping' | 'savings' | 'debts'>('overview')

  // Datos principales
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([])
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([])
  const [savings, setSavings] = useState<Saving[]>([])
  const [debts, setDebts] = useState<Debt[]>([])
  const [loading, setLoading] = useState(true)

  // Estados modales – Transacción
  const [isTransModalOpen, setIsTransModalOpen] = useState(false)
  const [transType, setTransType] = useState<'income' | 'expense'>('expense')
  const [transAmount, setTransAmount] = useState('')
  const [transCategory, setTransCategory] = useState('General')
  const [transDesc, setTransDesc] = useState('')
  const [transDate] = useState(new Date().toISOString().split('T')[0])

  // Estados modales – Compra
  const [isShopModalOpen, setIsShopModalOpen] = useState(false)
  const [shopName, setShopName] = useState('')
  const [shopPrice, setShopPrice] = useState('')

  // Estados modales – Ahorro
  const [isSavingModalOpen, setIsSavingModalOpen] = useState(false)
  const [savingAmount, setSavingAmount] = useState('')
  const [savingType, setSavingType] = useState<'digital' | 'efectivo'>('digital')

  // Estados modales – Deuda (Paz y Salvo)
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false)
  const [debtCreditor, setDebtCreditor] = useState('')
  const [debtAmount, setDebtAmount] = useState('')
  const [debtDate, setDebtDate] = useState('')
  const [debtNote, setDebtNote] = useState('')

  // ── Cargar datos ────────────────────────────────────────────────────────
  const loadData = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: trans }, { data: shops }, { data: savs }, { data: dbs }] = await Promise.all([
        supabase.from('financial_transactions').select('*').eq('user_id', user.id).order('transaction_date', { ascending: false }),
        supabase.from('shopping_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('savings').select('*').eq('user_id', user.id).order('saving_date', { ascending: false }),
        supabase.from('debts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      ])

      setTransactions(trans || [])
      setShoppingItems(shops || [])
      setSavings(savs || [])
      setDebts((dbs || []) as Debt[])
    } catch (err) {
      console.error('Error cargando finanzas:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  // ── Métricas ────────────────────────────────────────────────────────────
  const totalIncome   = transactions.filter(t => t.type === 'income').reduce((s, t)  => s + Number(t.amount || 0), 0)
  const totalExpense  = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0)
  const balance       = totalIncome - totalExpense
  const todayStr      = new Date().toISOString().split('T')[0]
  const todayExpense  = transactions.filter(t => t.type === 'expense' && t.transaction_date === todayStr).reduce((s, t) => s + Number(t.amount || 0), 0)
  const totalSaved    = savings.reduce((s, sv) => s + Number(sv.amount || 0), 0)
  const totalDebt     = debts.filter(d => !d.paid).reduce((s, d) => s + Number(d.amount || 0), 0)

  // ── Guardar transacción ─────────────────────────────────────────────────
  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!transAmount) return
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await triggerHaptic()
      const rawValue = parseCOP(transAmount)
      const { error } = await supabase.from('financial_transactions').insert({
        user_id: user.id,
        type: transType,
        amount: rawValue,
        category: transCategory,
        description: transDesc || null,
        transaction_date: transDate,
      })
      if (error) throw error
      setIsTransModalOpen(false)
      setTransAmount('')
      setTransDesc('')
      await loadData()
      toast.success('Transacción registrada')
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar transacción')
    }
  }

  // ── Guardar compra ──────────────────────────────────────────────────────
  const handleSaveShoppingItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!shopName.trim()) return
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await triggerHaptic()
      const rawPrice = shopPrice ? parseCOP(shopPrice) : 0
      const { error } = await supabase.from('shopping_items').insert({
        user_id: user.id,
        name: shopName.trim(),
        estimated_price: rawPrice,
      })
      if (error) throw error
      setIsShopModalOpen(false)
      setShopName('')
      setShopPrice('')
      await loadData()
      toast.success('Artículo añadido')
    } catch (err: any) {
      toast.error(err.message || 'Error al añadir artículo')
    }
  }

  // ── Toggle compra ───────────────────────────────────────────────────────
  const handleToggleShopItem = async (item: ShoppingItem) => {
    try {
      await triggerHaptic()
      const nextStatus = !item.is_purchased
      const { error } = await supabase.from('shopping_items').update({
        is_purchased: nextStatus,
        purchased_date: nextStatus ? todayStr : null,
      }).eq('id', item.id)
      if (error) throw error
      setShoppingItems(prev => prev.map(i => i.id === item.id ? { ...i, is_purchased: nextStatus } : i))
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar')
    }
  }

  // ── Guardar ahorro ──────────────────────────────────────────────────────
  const handleSaveSaving = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!savingAmount) return
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await triggerHaptic()
      const rawSaving = parseCOP(savingAmount)
      const { error } = await supabase.from('savings').insert({
        user_id: user.id,
        amount: rawSaving,
        saving_type: savingType,
      })
      if (error) throw error
      setIsSavingModalOpen(false)
      setSavingAmount('')
      await loadData()
      toast.success('Ahorro registrado')
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar ahorro')
    }
  }

  // ── Guardar deuda ───────────────────────────────────────────────────────
  const handleSaveDebt = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!debtCreditor.trim() || !debtAmount) return
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await triggerHaptic()
      const rawDebt = parseCOP(debtAmount)
      const { error } = await supabase.from('debts').insert({
        user_id: user.id,
        creditor: debtCreditor.trim(),
        amount: rawDebt,
        due_date: debtDate || null,
        note: debtNote || null,
        paid: false,
      })
      if (error) throw error
      setIsDebtModalOpen(false)
      setDebtCreditor('')
      setDebtAmount('')
      setDebtDate('')
      setDebtNote('')
      await loadData()
      toast.success('Deuda registrada')
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar deuda')
    }
  }

  // ── Marcar deuda pagada/pendiente ───────────────────────────────────────
  const handleToggleDebt = async (debt: Debt) => {
    try {
      await triggerHaptic()
      const next = !debt.paid
      const { error } = await supabase.from('debts').update({ paid: next }).eq('id', debt.id)
      if (error) throw error
      setDebts(prev => prev.map(d => d.id === debt.id ? { ...d, paid: next } : d))
      toast.success(next ? '¡Deuda marcada como pagada!' : 'Deuda marcada como pendiente')
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar deuda')
    }
  }

  // ── Eliminar deuda ──────────────────────────────────────────────────────
  const handleDeleteDebt = async (id: string) => {
    if (!confirm('¿Eliminar esta deuda?')) return
    try {
      await triggerHaptic()
      const { error } = await supabase.from('debts').delete().eq('id', id)
      if (error) throw error
      setDebts(prev => prev.filter(d => d.id !== id))
      toast.success('Deuda eliminada')
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar')
    }
  }

  // ── UI ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Finanzas</h2>
          <p className="text-xs text-slate-400 font-medium">Control de gastos, metas y compras • COP</p>
        </div>
        <button
          onClick={() => { setTransType('expense'); setIsTransModalOpen(true) }}
          className="flex items-center gap-1.5 rounded-2xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 active:scale-95 dark:bg-white dark:text-slate-900"
        >
          <Plus size={16} />
          <span>Transacción</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex rounded-2xl border border-slate-200/90 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900">
        {([
          ['overview',  'Panel General'],
          ['shopping',  'Compras'],
          ['savings',   'Ahorros'],
          ['debts',     'Paz y Salvo'],
        ] as const).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
              activeTab === tab
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── PANEL GENERAL ─────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Saldo Disponible</span>
              <p className={`mt-1 text-xl font-bold tracking-tight ${balance >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600'}`}>
                {display(balance)}
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200/80 bg-[#fae8df]/40 p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9c5936] dark:text-rose-300">Gasto de Hoy</span>
              <p className="mt-1 text-xl font-bold tracking-tight text-rose-600 dark:text-rose-400">{display(todayExpense)}</p>
            </div>
            <div className="rounded-3xl border border-slate-200/80 bg-[#e2f4ec]/40 p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#2b7a5a] dark:text-emerald-300 flex items-center gap-1">
                <ArrowDownLeft size={13} className="text-emerald-600" /> Ingresos Totales
              </span>
              <p className="mt-1 text-base font-bold tracking-tight text-emerald-600">+{display(totalIncome)}</p>
            </div>
            <div className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <ArrowUpRight size={13} className="text-rose-500" /> Gastos Totales
              </span>
              <p className="mt-1 text-base font-bold tracking-tight text-rose-600">-{display(totalExpense)}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-white">Transacciones Recientes</h3>
            {loading ? (
              <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" /></div>
            ) : transactions.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">No hay transacciones registradas.</p>
            ) : (
              <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
                {transactions.slice(0, 15).map(t => (
                  <div key={t.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-2xl p-2.5 ${t.type === 'income' ? 'bg-[#e2f4ec] text-[#2b7a5a]' : 'bg-[#fae8df] text-[#9c5936]'}`}>
                        {t.type === 'income' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{t.description || t.category}</p>
                        <p className="text-[11px] text-slate-400">{t.category} • {t.transaction_date}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {t.type === 'income' ? '+' : '-'}{display(Number(t.amount))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── COMPRAS ───────────────────────────────────────────────────────── */}
      {activeTab === 'shopping' && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Por comprar ({shoppingItems.filter(i => !i.is_purchased).length})
            </span>
            <button onClick={() => setIsShopModalOpen(true)} className="text-xs font-bold text-slate-900 hover:underline dark:text-white">
              + Añadir artículo
            </button>
          </div>
          <div className="flex flex-col gap-2.5">
            {shoppingItems.filter(i => !i.is_purchased).map(item => (
              <div key={item.id} className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <button onClick={() => handleToggleShopItem(item)} className="flex h-6 w-6 items-center justify-center rounded-xl border border-slate-300 hover:border-emerald-500 text-transparent hover:text-emerald-500 transition">
                    <Check size={14} />
                  </button>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{item.name}</p>
                    {item.estimated_price > 0 && <p className="text-[11px] text-slate-400">Est: {display(Number(item.estimated_price))}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mt-2">
            Comprados ({shoppingItems.filter(i => i.is_purchased).length})
          </span>
          <div className="flex flex-col gap-2">
            {shoppingItems.filter(i => i.is_purchased).map(item => (
              <div key={item.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-3 opacity-60 dark:border-slate-800 dark:bg-slate-800/40">
                <div className="flex items-center gap-3">
                  <button onClick={() => handleToggleShopItem(item)} className="flex h-5 w-5 items-center justify-center rounded-lg bg-emerald-500 text-white">
                    <Check size={12} />
                  </button>
                  <p className="text-xs font-medium line-through text-slate-500">{item.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── AHORROS ───────────────────────────────────────────────────────── */}
      {activeTab === 'savings' && (
        <div className="flex flex-col gap-4">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Ahorrado</span>
            <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1 tracking-tight">{display(totalSaved)}</p>
            <button onClick={() => setIsSavingModalOpen(true)} className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 active:scale-95 dark:bg-white dark:text-slate-900">
              <Plus size={16} /> Añadir Ahorro
            </button>
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Historial de aportes</h3>
          <div className="flex flex-col gap-2.5">
            {savings.map(s => (
              <div key={s.id} className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">+{display(Number(s.amount))}</p>
                  <p className="text-[11px] text-slate-400 capitalize">{s.saving_type} • {s.saving_date}</p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e9e5f5] text-[#5a48ab]">
                  <PiggyBank size={18} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PAZ Y SALVO ───────────────────────────────────────────────────── */}
      {activeTab === 'debts' && (
        <div className="flex flex-col gap-4">
          {/* Resumen */}
          <div className="rounded-3xl border border-rose-200/80 bg-rose-50/50 p-5 shadow-xs dark:border-rose-900/40 dark:bg-rose-950/20 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Total pendiente por pagar</span>
            <p className="text-3xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">{display(totalDebt)}</p>
            <button
              onClick={() => setIsDebtModalOpen(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-rose-700 active:scale-95"
            >
              <Plus size={16} /> Registrar deuda
            </button>
          </div>

          {/* Pendientes */}
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Pendientes</h3>
          {debts.filter(d => !d.paid).length === 0 && (
            <p className="text-center text-xs text-slate-400 py-4">¡Estás al día! No tienes deudas pendientes.</p>
          )}
          <div className="flex flex-col gap-2.5">
            {debts.filter(d => !d.paid).map(d => (
              <div key={d.id} className="rounded-2xl border border-rose-200/80 bg-white p-4 shadow-xs dark:border-rose-900/40 dark:bg-slate-900">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{d.creditor}</p>
                    {d.due_date && <p className="text-[11px] text-slate-400 mt-0.5">Vence: {d.due_date}</p>}
                    {d.note && <p className="text-[11px] text-slate-400 italic">{d.note}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-sm font-extrabold text-rose-600">{display(Number(d.amount))}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleToggleDebt(d)}
                        className="rounded-xl bg-emerald-500 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-emerald-600 transition"
                      >
                        Pagado
                      </button>
                      <button
                        onClick={() => handleDeleteDebt(d.id)}
                        className="rounded-xl bg-slate-100 p-1.5 text-slate-500 hover:bg-rose-100 hover:text-rose-600 transition dark:bg-slate-800"
                      >
                        <Trash size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagados */}
          {debts.filter(d => d.paid).length > 0 && (
            <>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-2">Pagados</h3>
              <div className="flex flex-col gap-2">
                {debts.filter(d => d.paid).map(d => (
                  <div key={d.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 opacity-60 dark:border-slate-800 dark:bg-slate-800/40 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white line-through">{d.creditor}</p>
                      <p className="text-[11px] text-slate-400">{display(Number(d.amount))}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5">✓ Pagado</span>
                      <button onClick={() => handleToggleDebt(d)} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 transition">
                        Deshacer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── MODAL TRANSACCIÓN ─────────────────────────────────────────────── */}
      {isTransModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-4 font-bold text-slate-900 dark:text-white text-base">Añadir Transacción (COP)</h3>
            <form onSubmit={handleSaveTransaction} className="flex flex-col gap-3.5">
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setTransType('expense')} className={`rounded-2xl py-2.5 text-xs font-bold transition ${transType === 'expense' ? 'bg-rose-500 text-white shadow-xs' : 'border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>Gasto</button>
                <button type="button" onClick={() => setTransType('income')} className={`rounded-2xl py-2.5 text-xs font-bold transition ${transType === 'income' ? 'bg-emerald-500 text-white shadow-xs' : 'border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>Ingreso</button>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">Monto (COP)</label>
                <input type="text" inputMode="numeric" placeholder="Ej. 20.000" value={transAmount} onChange={e => setTransAmount(e.target.value)} required autoFocus className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">Categoría</label>
                <select value={transCategory} onChange={e => setTransCategory(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                  <option value="Comida / Supermercado">Comida / Supermercado</option>
                  <option value="Ropa / Armario">Ropa / Armario</option>
                  <option value="Transporte">Transporte</option>
                  <option value="Servicios / Fijos">Servicios / Fijos</option>
                  <option value="Sueldo / Ingreso">Sueldo / Ingreso</option>
                  <option value="General">General / Otro</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">Descripción</label>
                <input type="text" placeholder="Ej. Almuerzo, Uber..." value={transDesc} onChange={e => setTransDesc(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsTransModalOpen(false)} className="flex-1 rounded-2xl border border-slate-200 py-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">Cancelar</button>
                <button type="submit" className="flex-1 rounded-2xl bg-slate-900 py-3 text-xs font-bold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL COMPRA ──────────────────────────────────────────────────── */}
      {isShopModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-4 font-bold text-slate-900 dark:text-white text-base">Añadir a la lista (COP)</h3>
            <form onSubmit={handleSaveShoppingItem} className="flex flex-col gap-3.5">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">Artículo</label>
                <input type="text" placeholder="Ej. Jeans, Zapatos..." value={shopName} onChange={e => setShopName(e.target.value)} required autoFocus className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">Precio estimado (COP)</label>
                <input type="text" inputMode="numeric" placeholder="Ej. 150.000 (opcional)" value={shopPrice} onChange={e => setShopPrice(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsShopModalOpen(false)} className="flex-1 rounded-2xl border border-slate-200 py-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">Cancelar</button>
                <button type="submit" className="flex-1 rounded-2xl bg-slate-900 py-3 text-xs font-bold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900">Añadir</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL AHORRO ──────────────────────────────────────────────────── */}
      {isSavingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-4 font-bold text-slate-900 dark:text-white text-base">Registrar Ahorro (COP)</h3>
            <form onSubmit={handleSaveSaving} className="flex flex-col gap-3.5">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">Monto (COP)</label>
                <input type="text" inputMode="numeric" placeholder="Ej. 50.000" value={savingAmount} onChange={e => setSavingAmount(e.target.value)} required autoFocus className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">Tipo</label>
                <select value={savingType} onChange={(e: any) => setSavingType(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                  <option value="digital">Digital (Banco / Billetera)</option>
                  <option value="efectivo">Efectivo</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsSavingModalOpen(false)} className="flex-1 rounded-2xl border border-slate-200 py-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">Cancelar</button>
                <button type="submit" className="flex-1 rounded-2xl bg-slate-900 py-3 text-xs font-bold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL DEUDA ───────────────────────────────────────────────────── */}
      {isDebtModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-4 font-bold text-slate-900 dark:text-white text-base">Registrar Deuda (COP)</h3>
            <form onSubmit={handleSaveDebt} className="flex flex-col gap-3.5">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">¿A quién le debo?</label>
                <input type="text" placeholder="Ej. Mamá, Banco XYZ..." value={debtCreditor} onChange={e => setDebtCreditor(e.target.value)} required autoFocus className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">Cuánto debo (COP)</label>
                <input type="text" inputMode="numeric" placeholder="Ej. 200.000" value={debtAmount} onChange={e => setDebtAmount(e.target.value)} required className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">Fecha límite</label>
                <input type="date" value={debtDate} onChange={e => setDebtDate(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">Nota (opcional)</label>
                <input type="text" placeholder="Ej. Préstamo para arriendo" value={debtNote} onChange={e => setDebtNote(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsDebtModalOpen(false)} className="flex-1 rounded-2xl border border-slate-200 py-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">Cancelar</button>
                <button type="submit" className="flex-1 rounded-2xl bg-rose-600 py-3 text-xs font-bold text-white transition hover:bg-rose-700">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
