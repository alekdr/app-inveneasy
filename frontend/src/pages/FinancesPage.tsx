import { useState, useEffect } from 'react'
import {
  IoAddSharp as Plus,
  IoArrowDownOutline as ArrowDownLeft,
  IoArrowUpOutline as ArrowUpRight,
  IoWalletOutline as PiggyBank,
  IoCheckmarkSharp as Check,
  IoCashOutline,
  IoRefreshOutline,
} from 'react-icons/io5'
import { supabase } from '../services/supabase'
import { triggerHaptic } from '../services/capacitor'
import { toast } from 'sonner'
import {
  fetchExchangeRates,
  getSavedCurrency,
  saveCurrency,
  formatCurrency,
  SUPPORTED_CURRENCIES,
  type CurrencyCode,
} from '../services/currency'
import type { FinancialTransaction, ShoppingItem, Saving } from '../types'

export default function FinancesPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'shopping' | 'savings'>('overview')

  // Moneda activa elegida por el usuario (COP, USD, EUR)
  const [currency, setCurrency] = useState<CurrencyCode>(getSavedCurrency())
  const [rates, setRates] = useState<Record<CurrencyCode, number>>({ USD: 1, COP: 4150, EUR: 0.92 })
  const [loadingRates, setLoadingRates] = useState(false)

  // Datos
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([])
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([])
  const [savings, setSavings] = useState<Saving[]>([])
  const [loading, setLoading] = useState(true)

  // Modales
  const [isTransModalOpen, setIsTransModalOpen] = useState(false)
  const [transType, setTransType] = useState<'income' | 'expense'>('expense')
  const [transAmount, setTransAmount] = useState('')
  const [transCategory, setTransCategory] = useState('General')
  const [transDesc, setTransDesc] = useState('')
  const [transDate] = useState(new Date().toISOString().split('T')[0])

  const [isShopModalOpen, setIsShopModalOpen] = useState(false)
  const [shopName, setShopName] = useState('')
  const [shopPrice, setShopPrice] = useState('')

  const [isSavingModalOpen, setIsSavingModalOpen] = useState(false)
  const [savingAmount, setSavingAmount] = useState('')
  const [savingType, setSavingType] = useState<'digital' | 'efectivo'>('digital')

  // Cargar tasas de cambio referenciales
  const loadRates = async () => {
    setLoadingRates(true)
    try {
      const liveRates = await fetchExchangeRates()
      setRates(liveRates)
    } finally {
      setLoadingRates(false)
    }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Transacciones
      const { data: trans } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: false })
      setTransactions(trans || [])

      // Compras
      const { data: shops } = await supabase
        .from('shopping_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setShoppingItems(shops || [])

      // Ahorros
      const { data: savs } = await supabase
        .from('savings')
        .select('*')
        .eq('user_id', user.id)
        .order('saving_date', { ascending: false })
      setSavings(savs || [])
    } catch (err) {
      console.error('Error cargando finanzas:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRates()
    loadData()
  }, [])

  // Cambio de divisa
  const handleCurrencyChange = async (newCurr: CurrencyCode) => {
    setCurrency(newCurr)
    saveCurrency(newCurr)
    await triggerHaptic()
    toast.success(`Moneda cambiada a ${SUPPORTED_CURRENCIES[newCurr].name}`)
  }

  // Formateador sin alteraciones: muestra el número tal cual lo guardaste
  const displayAmount = (num: number): string => {
    return formatCurrency(num, currency)
  }

  // Métricas financieras calculadas con los números exactos
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0)

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0)

  const balance = totalIncome - totalExpense

  const todayStr = new Date().toISOString().split('T')[0]
  const todayExpense = transactions
    .filter(t => t.type === 'expense' && t.transaction_date === todayStr)
    .reduce((sum, t) => sum + Number(t.amount || 0), 0)

  const totalSaved = savings.reduce((sum, s) => sum + Number(s.amount || 0), 0)

  // Guardar transacción: EXACTAMENTE el monto que el usuario escribe
  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!transAmount) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await triggerHaptic()
      const rawValue = parseFloat(transAmount)

      const { error } = await supabase.from('financial_transactions').insert({
        user_id: user.id,
        type: transType,
        amount: rawValue, // Se guarda el número exacto sin divisiones ni conversiones que alteren centavos
        category: transCategory,
        description: transDesc || null,
        transaction_date: transDate,
      })

      if (error) throw error
      setIsTransModalOpen(false)
      setTransAmount('')
      setTransDesc('')
      await loadData()
      toast.success('Transacción registrada con éxito')
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar transacción')
    }
  }

  // Guardar artículo de compra: monto exacto
  const handleSaveShoppingItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!shopName.trim()) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await triggerHaptic()
      const rawPrice = shopPrice ? parseFloat(shopPrice) : 0

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
      toast.success('Artículo añadido a la lista')
    } catch (err: any) {
      toast.error(err.message || 'Error al añadir artículo')
    }
  }

  // Toggle estado compra
  const handleToggleShopItem = async (item: ShoppingItem) => {
    try {
      await triggerHaptic()
      const nextStatus = !item.is_purchased
      const { error } = await supabase
        .from('shopping_items')
        .update({
          is_purchased: nextStatus,
          purchased_date: nextStatus ? new Date().toISOString().split('T')[0] : null,
        })
        .eq('id', item.id)

      if (error) throw error
      setShoppingItems(prev =>
        prev.map(i => (i.id === item.id ? { ...i, is_purchased: nextStatus } : i))
      )
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar')
    }
  }

  // Guardar ahorro: monto exacto
  const handleSaveSaving = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!savingAmount) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await triggerHaptic()
      const rawSaving = parseFloat(savingAmount)

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

  return (
    <div className="flex flex-col gap-4">
      {/* Header con Título, Selector de Moneda y Botón de Acción */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Finanzas
          </h2>
          <p className="text-xs text-slate-400 font-medium">Control de gastos, metas y compras</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Selector de Moneda (COP / EUR / USD) */}
          <div className="flex items-center rounded-2xl border border-slate-200/90 bg-white p-1 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            {(['COP', 'USD', 'EUR'] as CurrencyCode[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => handleCurrencyChange(c)}
                className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all ${
                  currency === c
                    ? 'bg-slate-900 text-white shadow-xs dark:bg-white dark:text-slate-900'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <span>{SUPPORTED_CURRENCIES[c].flag}</span>
                <span>{c}</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setTransType('expense')
              setIsTransModalOpen(true)
            }}
            className="flex items-center gap-1.5 rounded-2xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 active:scale-95 dark:bg-white dark:text-slate-900"
          >
            <Plus size={16} />
            <span>Transacción</span>
          </button>
        </div>
      </div>

      {/* Tasa referencial */}
      <div className="flex items-center justify-between rounded-2xl bg-slate-100/70 px-3.5 py-2 text-[11px] font-medium text-slate-500 dark:bg-slate-800/40 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <IoCashOutline size={14} className="text-slate-400" />
          <span>
            Referencia: 1 USD ≈ {rates.COP.toLocaleString('es-CO')} COP • 1 USD ≈ {rates.EUR.toFixed(2)} EUR
          </span>
        </div>
        <button
          onClick={loadRates}
          title="Actualizar cotización"
          className="flex items-center gap-1 hover:text-slate-800 dark:hover:text-white"
        >
          <IoRefreshOutline size={13} className={loadingRates ? 'animate-spin' : ''} />
          <span>{loadingRates ? 'Actualizando...' : 'Actualizar'}</span>
        </button>
      </div>

      {/* Tabs internas de Finanzas */}
      <div className="flex rounded-2xl border border-slate-200/90 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
            activeTab === 'overview'
              ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          Panel General
        </button>
        <button
          onClick={() => setActiveTab('shopping')}
          className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
            activeTab === 'shopping'
              ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          Lista de Compras
        </button>
        <button
          onClick={() => setActiveTab('savings')}
          className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
            activeTab === 'savings'
              ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          Ahorros
        </button>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Panel de Control: 4 cuadros */}
          <div className="grid grid-cols-2 gap-3">
            {/* Saldo disponible */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Saldo Disponible
              </span>
              <p
                className={`mt-1 text-xl font-bold tracking-tight ${
                  balance >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600'
                }`}
              >
                {displayAmount(balance)}
              </p>
            </div>

            {/* Gasto de hoy */}
            <div className="rounded-3xl border border-slate-200/80 bg-[#fae8df]/40 p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9c5936] dark:text-rose-300">
                Gasto de Hoy
              </span>
              <p className="mt-1 text-xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
                {displayAmount(todayExpense)}
              </p>
            </div>

            {/* Ingresos totales */}
            <div className="rounded-3xl border border-slate-200/80 bg-[#e2f4ec]/40 p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#2b7a5a] dark:text-emerald-300 flex items-center gap-1">
                <ArrowDownLeft size={13} className="text-emerald-600" />
                Ingresos Totales
              </span>
              <p className="mt-1 text-base font-bold tracking-tight text-emerald-600">
                +{displayAmount(totalIncome)}
              </p>
            </div>

            {/* Gastos totales */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <ArrowUpRight size={13} className="text-rose-500" />
                Gastos Totales
              </span>
              <p className="mt-1 text-base font-bold tracking-tight text-rose-600">
                -{displayAmount(totalExpense)}
              </p>
            </div>
          </div>

          {/* Historial de transacciones */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-white">
              Transacciones Recientes
            </h3>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
              </div>
            ) : transactions.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">
                No hay transacciones registradas.
              </p>
            ) : (
              <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
                {transactions.slice(0, 15).map((t) => (
                  <div key={t.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`rounded-2xl p-2.5 ${
                          t.type === 'income'
                            ? 'bg-[#e2f4ec] text-[#2b7a5a]'
                            : 'bg-[#fae8df] text-[#9c5936]'
                        }`}
                      >
                        {t.type === 'income' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          {t.description || t.category}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {t.category} • {t.transaction_date}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-bold ${
                        t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {t.type === 'income' ? '+' : '-'}{displayAmount(Number(t.amount))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* SUBSECCIÓN: Lista de compras */}
      {activeTab === 'shopping' && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Por comprar ({shoppingItems.filter(i => !i.is_purchased).length})
            </span>
            <button
              onClick={() => setIsShopModalOpen(true)}
              className="text-xs font-bold text-slate-900 hover:underline dark:text-white"
            >
              + Añadir artículo
            </button>
          </div>

          <div className="flex flex-col gap-2.5">
            {shoppingItems.filter(i => !i.is_purchased).map(item => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleShopItem(item)}
                    className="flex h-6 w-6 items-center justify-center rounded-xl border border-slate-300 hover:border-emerald-500 text-transparent hover:text-emerald-500 transition"
                  >
                    <Check size={14} />
                  </button>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      {item.name}
                    </p>
                    {item.estimated_price > 0 && (
                      <p className="text-[11px] text-slate-400">
                        Est: {displayAmount(Number(item.estimated_price))}
                      </p>
                    )}
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
              <div
                key={item.id}
                className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-3 opacity-60 dark:border-slate-800 dark:bg-slate-800/40"
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleShopItem(item)}
                    className="flex h-5 w-5 items-center justify-center rounded-lg bg-emerald-500 text-white"
                  >
                    <Check size={12} />
                  </button>
                  <p className="text-xs font-medium line-through text-slate-500">
                    {item.name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBSECCIÓN: Ahorros */}
      {activeTab === 'savings' && (
        <div className="flex flex-col gap-4">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Ahorrado
            </span>
            <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1 tracking-tight">
              {displayAmount(totalSaved)}
            </p>
            <button
              onClick={() => setIsSavingModalOpen(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 active:scale-95 dark:bg-white dark:text-slate-900"
            >
              <Plus size={16} /> Añadir Ahorro
            </button>
          </div>

          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Historial de aportes
          </h3>
          <div className="flex flex-col gap-2.5">
            {savings.map(s => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    +{displayAmount(Number(s.amount))}
                  </p>
                  <p className="text-[11px] text-slate-400 capitalize">
                    {s.saving_type} • {s.saving_date}
                  </p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e9e5f5] text-[#5a48ab]">
                  <PiggyBank size={18} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Añadir Transacción */}
      {isTransModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-4 font-bold text-slate-900 dark:text-white text-base">
              Añadir Transacción ({currency})
            </h3>

            <form onSubmit={handleSaveTransaction} className="flex flex-col gap-3.5">
              {/* Tipo ingreso / gasto */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTransType('expense')}
                  className={`rounded-2xl py-2.5 text-xs font-bold transition ${
                    transType === 'expense'
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                  }`}
                >
                  Gasto
                </button>
                <button
                  type="button"
                  onClick={() => setTransType('income')}
                  className={`rounded-2xl py-2.5 text-xs font-bold transition ${
                    transType === 'income'
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                  }`}
                >
                  Ingreso
                </button>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Monto en {currency}
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder={`0 (${currency})`}
                  value={transAmount}
                  onChange={(e) => setTransAmount(e.target.value)}
                  required
                  autoFocus
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Categoría
                </label>
                <select
                  value={transCategory}
                  onChange={(e) => setTransCategory(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="Comida / Supermercado">Comida / Supermercado</option>
                  <option value="Ropa / Armario">Ropa / Armario</option>
                  <option value="Transporte">Transporte</option>
                  <option value="Servicios / Fijos">Servicios / Fijos</option>
                  <option value="Sueldo / Ingreso">Sueldo / Ingreso</option>
                  <option value="General">General / Otro</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Descripción
                </label>
                <input
                  type="text"
                  placeholder="Ej. Almuerzo, Uber, Camiseta..."
                  value={transDesc}
                  onChange={(e) => setTransDesc(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTransModalOpen(false)}
                  className="flex-1 rounded-2xl border border-slate-200 py-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-2xl bg-slate-900 py-3 text-xs font-bold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Añadir Compras */}
      {isShopModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-4 font-bold text-slate-900 dark:text-white text-base">
              Añadir a la lista ({currency})
            </h3>
            <form onSubmit={handleSaveShoppingItem} className="flex flex-col gap-3.5">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Artículo
                </label>
                <input
                  type="text"
                  placeholder="Ej. Jeans Levi's, Zapatos..."
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  required
                  autoFocus
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Precio estimado en {currency}
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="0 (opcional)"
                  value={shopPrice}
                  onChange={(e) => setShopPrice(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsShopModalOpen(false)}
                  className="flex-1 rounded-2xl border border-slate-200 py-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-2xl bg-slate-900 py-3 text-xs font-bold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                >
                  Añadir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Añadir Ahorro */}
      {isSavingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-4 font-bold text-slate-900 dark:text-white text-base">
              Registrar Ahorro ({currency})
            </h3>
            <form onSubmit={handleSaveSaving} className="flex flex-col gap-3.5">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Monto en {currency}
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder={`0 (${currency})`}
                  value={savingAmount}
                  onChange={(e) => setSavingAmount(e.target.value)}
                  required
                  autoFocus
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Tipo
                </label>
                <select
                  value={savingType}
                  onChange={(e: any) => setSavingType(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="digital">Digital (Banco / Billetera)</option>
                  <option value="efectivo">Efectivo</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSavingModalOpen(false)}
                  className="flex-1 rounded-2xl border border-slate-200 py-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-2xl bg-slate-900 py-3 text-xs font-bold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
