import { useState, useEffect } from 'react'
import {
  IoAddSharp as Plus,
  IoArrowDownOutline as ArrowDownLeft,
  IoArrowUpOutline as ArrowUpRight,
  IoWalletOutline as PiggyBank,
  IoCheckmarkSharp as Check,
  IoTrashSharp as Trash,
  IoSearchSharp as SearchIcon,
  IoDownloadOutline as DownloadIcon,
  IoSwapHorizontalSharp as SwapIcon,
  IoSparklesSharp as SparklesIcon,
  IoAlertCircleOutline as AlertIcon,
  IoRefreshSharp as RefreshIcon,
  IoCameraOutline,
  IoReceiptOutline,
  IoCloseOutline,
} from 'react-icons/io5'
import { supabase } from '../services/supabase'
import { triggerHaptic, takePhoto } from '../services/capacitor'
import { scanTicket } from '../services/ticketScanner'
import { confirmDialog } from '../stores/confirmStore'
import CustomDatePicker from '../components/CustomDatePicker'
import { toast } from 'sonner'
import {
  formatCurrency,
  fetchExchangeRates,
  convertCurrency,
  type CurrencyCode,
  SUPPORTED_CURRENCIES,
} from '../services/currency'
import {
  fetchCategoryBudgets,
  saveCategoryBudget,
  deleteCategoryBudget,
  fetchFixedExpenses,
  saveFixedExpense,
  deleteFixedExpense,
  exportToCSV,
  computeMonthlyReport,
  type CategoryBudget,
  type FixedExpense,
  type MonthlyReportResult,
} from '../services/finances'
import type { FinancialTransaction, ShoppingItem, Saving } from '../types'

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

function parseCOP(value: string): number {
  const v = value.trim().replace(/\./g, '').replace(/,/g, '.')
  return parseFloat(v) || 0
}

function display(num: number): string {
  return formatCurrency(num, 'COP')
}

export default function FinancesPage() {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'transactions' | 'budgets' | 'monthly' | 'converter' | 'shopping' | 'savings' | 'debts'
  >('overview')

  // Datos principales
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([])
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([])
  const [savings, setSavings] = useState<Saving[]>([])
  const [debts, setDebts] = useState<Debt[]>([])
  const [budgets, setBudgets] = useState<CategoryBudget[]>([])
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros de transacciones
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Conversor de divisas
  const [convAmount, setConvAmount] = useState('100000')
  const [fromCurrency, setFromCurrency] = useState<CurrencyCode>('COP')
  const [toCurrency, setToCurrency] = useState<CurrencyCode>('USD')
  const [rates, setRates] = useState<Record<CurrencyCode, number>>({ USD: 1, COP: 4150, EUR: 0.92 })
  const [loadingRates, setLoadingRates] = useState(false)

  // Cierre mensual
  const now = new Date()
  const [reportYear, setReportYear] = useState(now.getFullYear())
  const [reportMonth, setReportMonth] = useState(now.getMonth() + 1)
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReportResult | null>(null)

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

  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false)
  const [debtCreditor, setDebtCreditor] = useState('')
  const [debtAmount, setDebtAmount] = useState('')
  const [debtDate, setDebtDate] = useState('')
  const [debtNote, setDebtNote] = useState('')

  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false)
  const [budgetCategory, setBudgetCategory] = useState('Alimentación')
  const [budgetLimit, setBudgetLimit] = useState('')

  const [isFixedModalOpen, setIsFixedModalOpen] = useState(false)
  const [fixedTitle, setFixedTitle] = useState('')
  const [fixedAmount, setFixedAmount] = useState('')
  const [fixedDay, setFixedDay] = useState('1')
  const [fixedCategory, setFixedCategory] = useState('Servicios')

  // Scanner de tickets
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [scannedData, setScannedData] = useState<{
    total: number | null
    items: Array<{ name: string; amount: number | null }>
    imageUrl: string
  } | null>(null)
  const [scanAmount, setScanAmount] = useState('')
  const [scanDesc, setScanDesc] = useState('Ticket escaneado')
  const [scanCategory, setScanCategory] = useState('Alimentación')
  const [savingTicket, setSavingTicket] = useState(false)

  // ── Cargar datos ────────────────────────────────────────────────────────
  const loadData = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: trans }, { data: shops }, { data: savs }, { data: dbs }, bds, fxs] = await Promise.all([
        supabase.from('financial_transactions').select('*').eq('user_id', user.id).order('transaction_date', { ascending: false }),
        supabase.from('shopping_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('savings').select('*').eq('user_id', user.id).order('saving_date', { ascending: false }),
        supabase.from('debts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        fetchCategoryBudgets(),
        fetchFixedExpenses(),
      ])

      setTransactions(trans || [])
      setShoppingItems(shops || [])
      setSavings(savs || [])
      setDebts((dbs || []) as Debt[])
      setBudgets(bds || [])
      setFixedExpenses(fxs || [])
    } catch (err) {
      console.error('Error cargando finanzas:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadExchangeRates = async () => {
    setLoadingRates(true)
    try {
      const r = await fetchExchangeRates()
      setRates(r)
    } catch {
      // ignore
    } finally {
      setLoadingRates(false)
    }
  }

  useEffect(() => {
    loadData()
    loadExchangeRates()
  }, [])

  // ── Métricas Globales ───────────────────────────────────────────────────
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount || 0), 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0)
  const balance = totalIncome - totalExpense
  const todayStr = new Date().toISOString().split('T')[0]
  const todayExpense = transactions.filter(t => t.type === 'expense' && t.transaction_date === todayStr).reduce((s, t) => s + Number(t.amount || 0), 0)
  const totalSaved = savings.reduce((s, sv) => s + Number(sv.amount || 0), 0)
  const totalDebt = debts.filter(d => !d.paid).reduce((s, d) => s + Number(d.amount || 0), 0)

  // Gastos del mes actual agrupados por categoría (para presupuestos)
  const currentMonthPrefix = todayStr.substring(0, 7)
  const currentMonthExpensesByCategory: Record<string, number> = {}
  transactions
    .filter(t => t.type === 'expense' && t.transaction_date.startsWith(currentMonthPrefix))
    .forEach(t => {
      currentMonthExpensesByCategory[t.category] =
        (currentMonthExpensesByCategory[t.category] || 0) + Number(t.amount || 0)
    })

  // ── Filtrado de transacciones ───────────────────────────────────────────
  const filteredTransactions = transactions.filter(t => {
    if (filterType !== 'all' && t.type !== filterType) return false
    if (filterCategory !== 'all' && t.category !== filterCategory) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const descMatch = (t.description || '').toLowerCase().includes(q)
      const catMatch = t.category.toLowerCase().includes(q)
      if (!descMatch && !catMatch) return false
    }
    return true
  })

  // Lista única de categorías registradas
  const allCategories = Array.from(new Set(transactions.map(t => t.category))).filter(Boolean)

  // ── Exportar a Excel / CSV ──────────────────────────────────────────────
  const handleExportCSV = () => {
    const headers = ['ID', 'Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto (COP)']
    const rows = filteredTransactions.map(t => [
      t.id,
      t.transaction_date,
      t.type === 'income' ? 'Ingreso' : 'Gasto',
      t.category,
      t.description || '',
      t.amount,
    ])
    exportToCSV(`InvenEasy_Transacciones_${todayStr}`, headers, rows)
    toast.success('Archivo CSV descargado con éxito')
  }

  // ── Generar Cierre Mensual ──────────────────────────────────────────────
  const handleGenerateReport = () => {
    const report = computeMonthlyReport(transactions, savings, reportYear, reportMonth)
    setMonthlyReport(report)
    triggerHaptic()
    toast.success('Cierre mensual generado con éxito')
  }

  // ── Handlers Guardado ───────────────────────────────────────────────────
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

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!budgetCategory.trim() || !budgetLimit) return
    try {
      await triggerHaptic()
      const limit = parseCOP(budgetLimit)
      await saveCategoryBudget(budgetCategory.trim(), limit)
      setIsBudgetModalOpen(false)
      setBudgetLimit('')
      const updated = await fetchCategoryBudgets()
      setBudgets(updated)
      toast.success('Presupuesto configurado')
    } catch {
      toast.error('Error al guardar presupuesto')
    }
  }

  const handleDeleteBudget = async (category: string) => {
    const ok = await confirmDialog({
      title: 'Eliminar Presupuesto',
      message: `¿Eliminar el presupuesto para "${category}"?`,
      confirmText: 'Eliminar',
      danger: true,
    })
    if (!ok) return
    try {
      await triggerHaptic()
      await deleteCategoryBudget(category)
      const updated = await fetchCategoryBudgets()
      setBudgets(updated)
      toast.success('Presupuesto eliminado')
    } catch {
      toast.error('Error al eliminar')
    }
  }

  const handleSaveFixedExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fixedTitle.trim() || !fixedAmount) return
    try {
      await triggerHaptic()
      const amt = parseCOP(fixedAmount)
      await saveFixedExpense({
        title: fixedTitle.trim(),
        amount: amt,
        category: fixedCategory,
        due_day: parseInt(fixedDay) || 1,
        is_active: true,
      })
      setIsFixedModalOpen(false)
      setFixedTitle('')
      setFixedAmount('')
      const updated = await fetchFixedExpenses()
      setFixedExpenses(updated)
      toast.success('Gasto fijo guardado')
    } catch {
      toast.error('Error al guardar gasto fijo')
    }
  }

  const handleDeleteFixedExpense = async (id: string) => {
    const ok = await confirmDialog({
      title: 'Eliminar Gasto Recurrente',
      message: '¿Estás seguro de que deseas eliminar este gasto recurrente?',
      confirmText: 'Eliminar',
      danger: true,
    })
    if (!ok) return
    try {
      await triggerHaptic()
      await deleteFixedExpense(id)
      const updated = await fetchFixedExpenses()
      setFixedExpenses(updated)
      toast.success('Gasto recurrente eliminado')
    } catch {
      toast.error('Error al eliminar')
    }
  }

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

  const handleToggleShopItem = async (item: ShoppingItem) => {
    try {
      await triggerHaptic()
      const nextStatus = !item.is_purchased
      const { error } = await supabase
        .from('shopping_items')
        .update({
          is_purchased: nextStatus,
          purchased_date: nextStatus ? todayStr : null,
        })
        .eq('id', item.id)
      if (error) throw error
      setShoppingItems(prev => prev.map(i => (i.id === item.id ? { ...i, is_purchased: nextStatus } : i)))
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar')
    }
  }

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

  const handleToggleDebt = async (debt: Debt) => {
    try {
      await triggerHaptic()
      const next = !debt.paid
      const { error } = await supabase.from('debts').update({ paid: next }).eq('id', debt.id)
      if (error) throw error
      setDebts(prev => prev.map(d => (d.id === debt.id ? { ...d, paid: next } : d)))
      toast.success(next ? '¡Deuda marcada como pagada!' : 'Deuda marcada como pendiente')
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar deuda')
    }
  }

  const handleDeleteDebt = async (id: string) => {
    const ok = await confirmDialog({
      title: 'Eliminar Registro de Deuda',
      message: '¿Estás seguro de que deseas eliminar este registro de deuda?',
      confirmText: 'Eliminar',
      danger: true,
    })
    if (!ok) return
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

  // Conversión de moneda en vivo
  const numericConvAmount = parseCOP(convAmount)
  const convertedResult = convertCurrency(numericConvAmount, fromCurrency, toCurrency, rates)

  // ── Escáner de tickets ──────────────────────────────────────────────────
  const handleScanTicket = async () => {
    try {
      setScannerOpen(true)
      setScanning(true)
      setScanProgress(0)
      setScannedData(null)
      setScanAmount('')
      setScanDesc('Ticket escaneado')

      // Tomar foto con cámara
      const photoResult = await takePhoto()
      if (!photoResult || (!photoResult.dataUrl && !photoResult.base64)) {
        setScannerOpen(false)
        setScanning(false)
        return
      }

      const imageSource = photoResult.dataUrl || `data:image/jpeg;base64,${photoResult.base64}`

      // Correr OCR
      const result = await scanTicket(imageSource, (p) => setScanProgress(p))

      setScannedData({
        total: result.total,
        items: result.items,
        imageUrl: imageSource,
      })

      if (result.total) setScanAmount(String(result.total))

      setScanning(false)

      if (result.confidence < 50) {
        toast.warning('Texto detectado con baja confianza. Verifica el monto.')
      }
    } catch (err: any) {
      toast.error('Error al escanear: ' + (err.message || 'Error desconocido'))
      setScannerOpen(false)
      setScanning(false)
    }
  }

  const handleSaveTicket = async () => {
    if (!scanAmount || isNaN(parseFloat(scanAmount))) {
      toast.error('Ingresa un monto válido')
      return
    }
    setSavingTicket(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      const { error } = await supabase.from('financial_transactions').insert({
        user_id: user.id,
        type: 'expense',
        amount: parseFloat(scanAmount),
        description: scanDesc,
        category: scanCategory,
        transaction_date: new Date().toISOString().split('T')[0],
      })

      if (error) throw error

      toast.success('Gasto guardado desde ticket')
      setScannerOpen(false)
      setScannedData(null)
      await loadData()
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar')
    } finally {
      setSavingTicket(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 w-full min-w-0 max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between w-full min-w-0">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Finanzas</h2>
          <p className="text-xs text-slate-400 font-medium">Control patrimonial, presupuestos y compras • COP</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleScanTicket}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95"
          >
            <IoCameraOutline size={15} />
            <span>Escanear Ticket</span>
          </button>
          <button
            onClick={() => {
              setTransType('expense')
              setIsTransModalOpen(true)
            }}
            className="flex items-center gap-1.5 rounded-2xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 active:scale-95 dark:bg-white dark:text-slate-900"
          >
            <Plus size={15} />
            <span>Transacción</span>
          </button>
        </div>
      </div>

      {/* Navegación por pestañas (Scroll horizontal táctil aislado) */}
      <div className="w-full max-w-full overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900">
        <div className="tabs-scroll-container no-scrollbar">
          {(
            [
              ['overview', 'Panel General'],
              ['transactions', 'Historial & Filtros'],
              ['budgets', 'Presupuestos & Fijos'],
              ['monthly', 'Cierre con IA'],
              ['converter', 'Conversor'],
              ['shopping', 'Compras'],
              ['savings', 'Ahorros'],
              ['debts', 'Paz y Salvo'],
            ] as const
          ).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => {
                triggerHaptic()
                setActiveTab(tab)
              }}
              className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition whitespace-nowrap select-none ${
                activeTab === tab
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 1. PANEL GENERAL ──────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full min-w-0 max-w-full">
            <div className="rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3 sm:p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 min-w-0 max-w-full overflow-hidden flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">Saldo Disponible</span>
              <p
                className={`mt-1 text-sm sm:text-lg md:text-xl font-extrabold tracking-tight truncate ${
                  balance >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600'
                }`}
                title={display(balance)}
              >
                {display(balance)}
              </p>
            </div>
            <div className="rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-[#fae8df]/40 p-3 sm:p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 min-w-0 max-w-full overflow-hidden flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9c5936] dark:text-rose-300 block truncate">
                Gasto de Hoy
              </span>
              <p className="mt-1 text-sm sm:text-lg md:text-xl font-extrabold tracking-tight text-rose-600 dark:text-rose-400 truncate" title={display(todayExpense)}>
                {display(todayExpense)}
              </p>
            </div>
            <div className="rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-[#e2f4ec]/40 p-3 sm:p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 min-w-0 max-w-full overflow-hidden flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#2b7a5a] dark:text-emerald-300 flex items-center gap-1 truncate">
                <ArrowDownLeft size={13} className="text-emerald-600 shrink-0" /> Ingresos Totales
              </span>
              <p className="mt-1 text-xs sm:text-base font-extrabold tracking-tight text-emerald-600 truncate" title={`+${display(totalIncome)}`}>
                +{display(totalIncome)}
              </p>
            </div>
            <div className="rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3 sm:p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 min-w-0 max-w-full overflow-hidden flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 truncate">
                <ArrowUpRight size={13} className="text-rose-500 shrink-0" /> Gastos Totales
              </span>
              <p className="mt-1 text-xs sm:text-base font-extrabold tracking-tight text-rose-600 truncate" title={`-${display(totalExpense)}`}>
                -{display(totalExpense)}
              </p>
            </div>
          </div>

          <div className="rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 w-full min-w-0 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Últimos Movimientos</h3>
              <button
                onClick={() => setActiveTab('transactions')}
                className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                Ver todas →
              </button>
            </div>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
              </div>
            ) : transactions.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">No hay transacciones registradas.</p>
            ) : (
              <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
                {transactions.slice(0, 7).map(t => (
                  <div key={t.id} className="flex items-center justify-between py-3 gap-2">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`rounded-2xl p-2.5 shrink-0 ${
                          t.type === 'income' ? 'bg-[#e2f4ec] text-[#2b7a5a]' : 'bg-[#fae8df] text-[#9c5936]'
                        }`}
                      >
                        {t.type === 'income' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {t.description || t.category}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {t.category} • {t.transaction_date}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-bold shrink-0 ${
                        t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {t.type === 'income' ? '+' : '-'}
                      {display(Number(t.amount))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── 2. HISTORIAL & FILTROS DE TRANSACCIONES ───────────────────────── */}
      {activeTab === 'transactions' && (
        <div className="flex flex-col gap-4">
          {/* Barra de Filtros y Búsqueda */}
          <div className="flex flex-col gap-2.5 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <SearchIcon size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por descripción o categoría..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-xs font-medium outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:w-auto">
                <select
                  value={filterType}
                  onChange={(e: any) => setFilterType(e.target.value)}
                  className="w-full sm:w-auto truncate rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="all">Todos los tipos</option>
                  <option value="expense">Solo Gastos</option>
                  <option value="income">Solo Ingresos</option>
                </select>

                <select
                  value={filterCategory}
                  onChange={e => setFilterCategory(e.target.value)}
                  className="w-full sm:w-auto truncate rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="all">Todas las categorías</option>
                  {allCategories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => {
                  setFilterType('all')
                  setFilterCategory('all')
                  setSearchQuery('')
                }}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Restablecer Filtros
              </button>

              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <DownloadIcon size={14} />
                <span>Exportar CSV / Excel</span>
              </button>
            </div>
          </div>

          {/* Tabla de Resultados */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Transacciones ({filteredTransactions.length})
              </span>
            </div>

            {filteredTransactions.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">No hay movimientos con los filtros aplicados.</p>
            ) : (
              <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTransactions.map(t => (
                  <div key={t.id} className="flex items-center justify-between py-3 gap-2">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`rounded-2xl p-2.5 shrink-0 ${
                          t.type === 'income' ? 'bg-[#e2f4ec] text-[#2b7a5a]' : 'bg-[#fae8df] text-[#9c5936]'
                        }`}
                      >
                        {t.type === 'income' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {t.description || t.category}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {t.category} • {t.transaction_date}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-bold shrink-0 ${
                        t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {t.type === 'income' ? '+' : '-'}
                      {display(Number(t.amount))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 3. PRESUPUESTOS & GASTOS FIJOS ─────────────────────────────────── */}
      {activeTab === 'budgets' && (
        <div className="flex flex-col gap-5">
          {/* Subsección: Presupuestos por Categoría */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Presupuestos del Mes</h3>
                <p className="text-[11px] text-slate-400">Límites mensuales con advertencia al superar el 80%</p>
              </div>
              <button
                onClick={() => setIsBudgetModalOpen(true)}
                className="flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white shadow-xs dark:bg-white dark:text-slate-900"
              >
                <Plus size={14} />
                <span>Presupuesto</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {budgets.map(b => {
                const spent = currentMonthExpensesByCategory[b.category] || 0
                const percent = Math.min(100, Math.round((spent / b.monthly_limit) * 100))
                const isWarning = percent >= 80 && percent < 100
                const isDanger = percent >= 100

                return (
                  <div
                    key={b.category}
                    className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{b.category}</span>
                        {isDanger && (
                          <span className="flex items-center gap-0.5 rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-bold text-rose-600 dark:bg-rose-950/60 dark:text-rose-300">
                            <AlertIcon size={12} /> Excedido
                          </span>
                        )}
                        {isWarning && (
                          <span className="flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                            <AlertIcon size={12} /> {percent}%
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteBudget(b.category)}
                        className="text-slate-400 hover:text-rose-500"
                      >
                        <Trash size={13} />
                      </button>
                    </div>

                    <div className="flex items-baseline justify-between text-xs mb-1.5">
                      <span className="font-extrabold text-slate-800 dark:text-slate-200">{display(spent)}</span>
                      <span className="text-slate-400">Límite: {display(b.monthly_limit)}</span>
                    </div>

                    {/* Barra de progreso con color inteligente */}
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isDanger ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Subsección: Gastos Fijos Recurrentes */}
          <div className="flex flex-col gap-3 pt-3 border-t border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Gastos Fijos & Suscripciones</h3>
                <p className="text-[11px] text-slate-400">Pagos recurrentes que se deben cubrir cada mes</p>
              </div>
              <button
                onClick={() => setIsFixedModalOpen(true)}
                className="flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white shadow-xs dark:bg-white dark:text-slate-900"
              >
                <Plus size={14} />
                <span>Gasto Fijo</span>
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              {fixedExpenses.map(f => (
                <div
                  key={f.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900 gap-2 min-w-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{f.title}</p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {f.category} • Se paga el día {f.due_day} de cada mes
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                      {display(f.amount)}
                    </span>
                    <button
                      onClick={() => handleDeleteFixedExpense(f.id)}
                      className="rounded-xl p-1.5 text-slate-400 hover:text-rose-500"
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 4. CIERRE MENSUAL & ASESOR CON IA ─────────────────────────────── */}
      {activeTab === 'monthly' && (
        <div className="flex flex-col gap-4">
          {/* Selector de Fecha */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Generador de Cierre Mensual</h3>
              <p className="text-xs text-slate-400 font-medium">Balance patrimonial y diagnóstico de ahorro</p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={reportMonth}
                onChange={e => setReportMonth(parseInt(e.target.value))}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {[
                  [1, 'Enero'],
                  [2, 'Febrero'],
                  [3, 'Marzo'],
                  [4, 'Abril'],
                  [5, 'Mayo'],
                  [6, 'Junio'],
                  [7, 'Julio'],
                  [8, 'Agosto'],
                  [9, 'Septiembre'],
                  [10, 'Octubre'],
                  [11, 'Noviembre'],
                  [12, 'Diciembre'],
                ].map(([m, name]) => (
                  <option key={m} value={m}>
                    {name}
                  </option>
                ))}
              </select>

              <select
                value={reportYear}
                onChange={e => setReportYear(parseInt(e.target.value))}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {[2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>

              <button
                onClick={handleGenerateReport}
                className="flex items-center gap-1.5 rounded-2xl bg-violet-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-violet-700 active:scale-95"
              >
                <SparklesIcon size={15} />
                <span>Generar Cierre</span>
              </button>
            </div>
          </div>

          {/* Resultado del Cierre */}
          {monthlyReport && (
            <div className="flex flex-col gap-4 animate-in fade-in">
              {/* 4 Cuadros de Resumen */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full min-w-0 max-w-full">
                <div className="rounded-3xl border border-emerald-200/80 bg-emerald-50/50 p-4 shadow-xs dark:border-emerald-900/30 dark:bg-emerald-950/20 min-w-0 overflow-hidden">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block truncate">Ingresos</span>
                  <p className="mt-1 text-sm sm:text-base font-extrabold text-emerald-700 dark:text-emerald-400 truncate">
                    +{display(monthlyReport.income)}
                  </p>
                </div>
                <div className="rounded-3xl border border-rose-200/80 bg-rose-50/50 p-4 shadow-xs dark:border-rose-900/30 dark:bg-rose-950/20 min-w-0 overflow-hidden">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block truncate">Gastos</span>
                  <p className="mt-1 text-sm sm:text-base font-extrabold text-rose-700 dark:text-rose-400 truncate">
                    -{display(monthlyReport.expense)}
                  </p>
                </div>
                <div className="rounded-3xl border border-indigo-200/80 bg-indigo-50/50 p-4 shadow-xs dark:border-indigo-900/30 dark:bg-indigo-950/20 min-w-0 overflow-hidden">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block truncate">Ahorros</span>
                  <p className="mt-1 text-sm sm:text-base font-extrabold text-indigo-700 dark:text-indigo-400 truncate">
                    {display(monthlyReport.savings)}
                  </p>
                </div>
                <div className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 min-w-0 overflow-hidden">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">Saldo Neto</span>
                  <p
                    className={`mt-1 text-sm sm:text-base font-extrabold truncate ${
                      monthlyReport.balance >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600'
                    }`}
                  >
                    {display(monthlyReport.balance)}
                  </p>
                </div>
              </div>

              {/* Tarjeta de Sugerencias y Diagnóstico con IA */}
              <div className="rounded-3xl border border-violet-200/80 bg-linear-to-br from-violet-50/50 to-white p-6 shadow-xs dark:border-violet-900/30 dark:bg-linear-to-br dark:from-violet-950/20 dark:to-slate-900">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-violet-600 text-white">
                    <SparklesIcon size={15} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Diagnóstico Financiero Inteligente
                  </h4>
                </div>

                <div className="flex flex-col gap-3">
                  {monthlyReport.insights.map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-slate-200/70 bg-white/80 p-3.5 dark:border-slate-800 dark:bg-slate-800/50"
                    >
                      <p className="text-xs font-bold text-slate-900 dark:text-white mb-0.5">{item.title}</p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                        {item.message}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 5. CONVERSOR DE MONEDAS ───────────────────────────────────────── */}
      {activeTab === 'converter' && (
        <div className="flex flex-col gap-4">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Conversor de Divisas en Vivo</h3>
                <p className="text-[11px] text-slate-400">Tasas oficiales del mercado con conversión instantánea</p>
              </div>
              <button
                onClick={loadExchangeRates}
                disabled={loadingRates}
                className="flex items-center gap-1 rounded-xl border border-slate-200 p-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                title="Actualizar tasas"
              >
                <RefreshIcon size={14} className={loadingRates ? 'animate-spin' : ''} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {/* Monto de Origen */}
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Monto a convertir
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={convAmount}
                    onChange={e => setConvAmount(e.target.value)}
                    placeholder="Monto..."
                    className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-bold outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <select
                    value={fromCurrency}
                    onChange={(e: any) => setFromCurrency(e.target.value)}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs font-bold outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    {(Object.keys(SUPPORTED_CURRENCIES) as CurrencyCode[]).map(c => (
                      <option key={c} value={c}>
                        {SUPPORTED_CURRENCIES[c].flag} {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Botón Invertir */}
              <div className="flex justify-center -my-1">
                <button
                  type="button"
                  onClick={() => {
                    const temp = fromCurrency
                    setFromCurrency(toCurrency)
                    setToCurrency(temp)
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 shadow-xs transition hover:bg-slate-100 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <SwapIcon size={18} />
                </button>
              </div>

              {/* Resultado Destino */}
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Resultado
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center rounded-2xl border border-slate-200 bg-slate-100/70 px-4 py-3 text-base font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800/60 dark:text-white">
                    {formatCurrency(convertedResult, toCurrency)}
                  </div>
                  <select
                    value={toCurrency}
                    onChange={(e: any) => setToCurrency(e.target.value)}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs font-bold outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    {(Object.keys(SUPPORTED_CURRENCIES) as CurrencyCode[]).map(c => (
                      <option key={c} value={c}>
                        {SUPPORTED_CURRENCIES[c].flag} {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3 text-center text-xs text-slate-400 dark:bg-slate-800/40">
                1 USD = {formatCurrency(rates.COP || 4150, 'COP')} • 1 EUR ={' '}
                {formatCurrency((rates.COP || 4150) / (rates.EUR || 0.92), 'COP')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. COMPRAS ────────────────────────────────────────────────────── */}
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
            {shoppingItems
              .filter(i => !i.is_purchased)
              .map(item => (
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
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{item.name}</p>
                      {item.estimated_price > 0 && (
                        <p className="text-[11px] text-slate-400">Est: {display(Number(item.estimated_price))}</p>
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
            {shoppingItems
              .filter(i => i.is_purchased)
              .map(item => (
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
                    <p className="text-xs font-medium line-through text-slate-500">{item.name}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── 7. AHORROS ────────────────────────────────────────────────────── */}
      {activeTab === 'savings' && (
        <div className="flex flex-col gap-4">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Ahorrado</span>
            <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1 tracking-tight">
              {display(totalSaved)}
            </p>
            <button
              onClick={() => setIsSavingModalOpen(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 active:scale-95 dark:bg-white dark:text-slate-900"
            >
              <Plus size={16} /> Añadir Ahorro
            </button>
          </div>

          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Historial de aportes</h3>
          <div className="flex flex-col gap-2.5">
            {savings.map(s => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">+{display(Number(s.amount))}</p>
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

      {/* ── 8. PAZ Y SALVO ────────────────────────────────────────────────── */}
      {activeTab === 'debts' && (
        <div className="flex flex-col gap-4">
          <div className="rounded-3xl border border-rose-200/80 bg-rose-50/50 p-5 shadow-xs dark:border-rose-900/40 dark:bg-rose-950/20 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
              Total pendiente por pagar
            </span>
            <p className="text-3xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">{display(totalDebt)}</p>
            <button
              onClick={() => setIsDebtModalOpen(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-rose-700 active:scale-95"
            >
              <Plus size={16} /> Registrar deuda
            </button>
          </div>

          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Pendientes</h3>
          {debts.filter(d => !d.paid).length === 0 && (
            <p className="text-center text-xs text-slate-400 py-4">¡Estás al día! No tienes deudas pendientes.</p>
          )}
          <div className="flex flex-col gap-2.5">
            {debts
              .filter(d => !d.paid)
              .map(d => (
                <div
                  key={d.id}
                  className="rounded-2xl border border-rose-200/80 bg-white p-4 shadow-xs dark:border-rose-900/40 dark:bg-slate-900"
                >
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

          {debts.filter(d => d.paid).length > 0 && (
            <>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-2">Pagados</h3>
              <div className="flex flex-col gap-2">
                {debts
                  .filter(d => d.paid)
                  .map(d => (
                    <div
                      key={d.id}
                      className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 opacity-60 dark:border-slate-800 dark:bg-slate-800/40 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white line-through">{d.creditor}</p>
                        <p className="text-[11px] text-slate-400">{display(Number(d.amount))}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5">
                          ✓ Pagado
                        </span>
                        <button
                          onClick={() => handleToggleDebt(d)}
                          className="text-[10px] font-bold text-slate-400 hover:text-slate-600 transition"
                        >
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

      {/* ── MODALES ───────────────────────────────────────────────────────── */}
      {/* Modal Transacción */}
      {isTransModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-4 font-bold text-slate-900 dark:text-white text-base">Añadir Transacción (COP)</h3>
            <form onSubmit={handleSaveTransaction} className="flex flex-col gap-3.5">
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
                  Monto (COP)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Ej. 20.000"
                  value={transAmount}
                  onChange={e => setTransAmount(e.target.value)}
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
                  onChange={e => setTransCategory(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="Alimentación">Alimentación</option>
                  <option value="Ropa / Armario">Ropa / Armario</option>
                  <option value="Transporte">Transporte</option>
                  <option value="Servicios">Servicios</option>
                  <option value="Ocio y Salidas">Ocio y Salidas</option>
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
                  placeholder="Ej. Almuerzo, Uber..."
                  value={transDesc}
                  onChange={e => setTransDesc(e.target.value)}
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

      {/* Modal Presupuesto */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-4 font-bold text-slate-900 dark:text-white text-base">Fijar Presupuesto Mensual</h3>
            <form onSubmit={handleSaveBudget} className="flex flex-col gap-3.5">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Categoría
                </label>
                <select
                  value={budgetCategory}
                  onChange={e => setBudgetCategory(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="Alimentación">Alimentación</option>
                  <option value="Transporte">Transporte</option>
                  <option value="Servicios">Servicios</option>
                  <option value="Ocio y Salidas">Ocio y Salidas</option>
                  <option value="Ropa / Armario">Ropa / Armario</option>
                  <option value="General">General</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Límite Máximo Mensual (COP)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Ej. 500.000"
                  value={budgetLimit}
                  onChange={e => setBudgetLimit(e.target.value)}
                  required
                  autoFocus
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBudgetModalOpen(false)}
                  className="flex-1 rounded-2xl border border-slate-200 py-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-2xl bg-slate-900 py-3 text-xs font-bold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                >
                  Fijar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Gasto Fijo */}
      {isFixedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-4 font-bold text-slate-900 dark:text-white text-base">Nuevo Gasto Fijo / Recurrente</h3>
            <form onSubmit={handleSaveFixedExpense} className="flex flex-col gap-3.5">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Nombre del servicio
                </label>
                <input
                  type="text"
                  placeholder="Ej. Arriendo, Internet, Spotify..."
                  value={fixedTitle}
                  onChange={e => setFixedTitle(e.target.value)}
                  required
                  autoFocus
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Monto mensual (COP)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Ej. 120.000"
                  value={fixedAmount}
                  onChange={e => setFixedAmount(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Categoría
                </label>
                <select
                  value={fixedCategory}
                  onChange={e => setFixedCategory(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="Servicios">Servicios</option>
                  <option value="Vivienda / Arriendo">Vivienda / Arriendo</option>
                  <option value="Suscripciones">Suscripciones</option>
                  <option value="Educación">Educación</option>
                  <option value="Transporte">Transporte</option>
                  <option value="General">General</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Día de corte / pago (1 al 31)
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={fixedDay}
                  onChange={e => setFixedDay(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFixedModalOpen(false)}
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

      {/* Modal Compra */}
      {isShopModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-4 font-bold text-slate-900 dark:text-white text-base">Añadir a la lista (COP)</h3>
            <form onSubmit={handleSaveShoppingItem} className="flex flex-col gap-3.5">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Artículo
                </label>
                <input
                  type="text"
                  placeholder="Ej. Jeans, Zapatos..."
                  value={shopName}
                  onChange={e => setShopName(e.target.value)}
                  required
                  autoFocus
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Precio estimado (COP)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Ej. 150.000 (opcional)"
                  value={shopPrice}
                  onChange={e => setShopPrice(e.target.value)}
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

      {/* Modal Ahorro */}
      {isSavingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-4 font-bold text-slate-900 dark:text-white text-base">Registrar Ahorro (COP)</h3>
            <form onSubmit={handleSaveSaving} className="flex flex-col gap-3.5">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Monto (COP)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Ej. 50.000"
                  value={savingAmount}
                  onChange={e => setSavingAmount(e.target.value)}
                  required
                  autoFocus
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">Tipo</label>
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

      {/* Modal Deuda */}
      {isDebtModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-4 font-bold text-slate-900 dark:text-white text-base">Registrar Deuda (COP)</h3>
            <form onSubmit={handleSaveDebt} className="flex flex-col gap-3.5">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  ¿A quién le debo?
                </label>
                <input
                  type="text"
                  placeholder="Ej. Mamá, Banco XYZ..."
                  value={debtCreditor}
                  onChange={e => setDebtCreditor(e.target.value)}
                  required
                  autoFocus
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Cuánto debo (COP)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Ej. 200.000"
                  value={debtAmount}
                  onChange={e => setDebtAmount(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Fecha límite
                </label>
                <div className="w-full">
                  <CustomDatePicker
                    value={debtDate}
                    onChange={setDebtDate}
                    label="Fecha límite de pago"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Nota (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. Préstamo para arriendo"
                  value={debtNote}
                  onChange={e => setDebtNote(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDebtModalOpen(false)}
                  className="flex-1 rounded-2xl border border-slate-200 py-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-2xl bg-rose-600 py-3 text-xs font-bold text-white transition hover:bg-rose-700"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Scanner de Tickets */}
      {scannerOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs animate-in fade-in sm:items-center p-4">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200/80 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                  <IoReceiptOutline size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Escanear Ticket</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Extrae el monto automáticamente</p>
                </div>
              </div>
              <button
                onClick={() => { setScannerOpen(false); setScanning(false) }}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <IoCloseOutline size={20} />
              </button>
            </div>

            <div className="px-6 py-4 flex flex-col gap-4">
              {scanning ? (
                /* Estado: escaneando */
                <div className="flex flex-col items-center gap-4 py-8">
                  <div className="relative h-20 w-20">
                    <div className="absolute inset-0 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
                    <div className="absolute inset-0 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                      <IoReceiptOutline size={28} />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Analizando ticket...</p>
                    <p className="text-xs text-slate-400 mt-1">{scanProgress}% completado</p>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${scanProgress}%` }}
                    />
                  </div>
                </div>
              ) : scannedData ? (
                /* Estado: datos detectados */
                <>
                  {/* Preview imagen pequeña */}
                  {scannedData.imageUrl && (
                    <img
                      src={scannedData.imageUrl}
                      alt="Ticket escaneado"
                      className="w-full h-32 object-cover rounded-2xl"
                    />
                  )}

                  {/* Monto detectado */}
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 block">
                      Monto total
                    </label>
                    <div className="flex items-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30 px-4 py-3">
                      <span className="text-emerald-600 font-bold">$</span>
                      <input
                        type="number"
                        value={scanAmount}
                        onChange={(e) => setScanAmount(e.target.value)}
                        placeholder="0"
                        className="flex-1 bg-transparent text-sm font-bold text-slate-900 dark:text-white outline-none"
                      />
                    </div>
                  </div>

                  {/* Descripción */}
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 block">
                      Descripción
                    </label>
                    <input
                      type="text"
                      value={scanDesc}
                      onChange={(e) => setScanDesc(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  {/* Categoría */}
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 block">
                      Categoría
                    </label>
                    <select
                      value={scanCategory}
                      onChange={(e) => setScanCategory(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      {['Alimentación', 'Transporte', 'Salud', 'Entretenimiento', 'Ropa', 'Hogar', 'Educación', 'Otros'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Items detectados */}
                  {scannedData.items.length > 0 && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Ítems detectados ({scannedData.items.length})
                      </p>
                      <div className="rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                        {scannedData.items.slice(0, 5).map((item, i) => (
                          <div
                            key={i}
                            className={`flex items-center justify-between px-4 py-2.5 text-xs ${i > 0 ? 'border-t border-slate-100 dark:border-slate-800' : ''}`}
                          >
                            <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[60%]">{item.name}</span>
                            {item.amount && (
                              <span className="font-bold text-slate-900 dark:text-white">${item.amount.toLocaleString()}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => { setScannedData(null); handleScanTicket() }}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                    >
                      <RefreshIcon size={14} />
                      <span>Re-escanear</span>
                    </button>
                    <button
                      onClick={handleSaveTicket}
                      disabled={savingTicket}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 py-3 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <Check size={14} />
                      <span>{savingTicket ? 'Guardando...' : 'Guardar gasto'}</span>
                    </button>
                  </div>
                </>
              ) : (
                /* Estado inicial: botón para tomar foto */
                <div className="flex flex-col items-center gap-4 py-6">
                  <div className="h-20 w-20 rounded-3xl bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <IoCameraOutline size={38} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Listo para escanear</p>
                    <p className="text-xs text-slate-400 mt-1">Toma una foto clara del ticket o factura</p>
                  </div>
                  <button
                    onClick={handleScanTicket}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3 text-xs font-bold text-white hover:bg-emerald-700"
                  >
                    <IoCameraOutline size={16} />
                    <span>Abrir cámara</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
