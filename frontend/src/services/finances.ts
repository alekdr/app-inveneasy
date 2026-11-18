import { supabase } from './supabase'

export interface CategoryBudget {
  id?: string
  category: string
  monthly_limit: number
}

export interface FixedExpense {
  id: string
  title: string
  amount: number
  category: string
  due_day: number
  is_active: boolean
}

const LOCAL_BUDGETS_KEY = 'inven_category_budgets'
const LOCAL_FIXED_KEY = 'inven_fixed_expenses'

// ── Presupuestos por Categoría ─────────────────────────────────────────────
export async function fetchCategoryBudgets(): Promise<CategoryBudget[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return getLocalBudgets()

    const { data, error } = await supabase
      .from('category_budgets')
      .select('*')
      .eq('user_id', user.id)

    if (error) throw error
    if (data && data.length > 0) {
      localStorage.setItem(LOCAL_BUDGETS_KEY, JSON.stringify(data))
      return data
    }
  } catch (err) {
    console.warn('Fallback a presupuestos locales:', err)
  }
  return getLocalBudgets()
}

function getLocalBudgets(): CategoryBudget[] {
  try {
    const raw = localStorage.getItem(LOCAL_BUDGETS_KEY)
    return raw ? JSON.parse(raw) : [
      { category: 'Alimentación', monthly_limit: 600000 },
      { category: 'Transporte', monthly_limit: 250000 },
      { category: 'Servicios', monthly_limit: 350000 },
      { category: 'Ocio y Salidas', monthly_limit: 200000 },
    ]
  } catch {
    return []
  }
}

export async function saveCategoryBudget(category: string, monthlyLimit: number): Promise<void> {
  const localList = getLocalBudgets().filter(b => b.category.toLowerCase() !== category.toLowerCase())
  const newBudget: CategoryBudget = { category, monthly_limit: monthlyLimit }
  localList.push(newBudget)
  localStorage.setItem(LOCAL_BUDGETS_KEY, JSON.stringify(localList))

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('category_budgets').upsert(
        { user_id: user.id, category, monthly_limit: monthlyLimit },
        { onConflict: 'user_id, category' }
      )
    }
  } catch (err) {
    console.warn('No se pudo guardar presupuesto en Supabase, guardado localmente:', err)
  }
}

export async function deleteCategoryBudget(category: string): Promise<void> {
  const localList = getLocalBudgets().filter(b => b.category.toLowerCase() !== category.toLowerCase())
  localStorage.setItem(LOCAL_BUDGETS_KEY, JSON.stringify(localList))

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('category_budgets').delete().eq('user_id', user.id).eq('category', category)
    }
  } catch (err) {
    console.warn('Error eliminando presupuesto en Supabase:', err)
  }
}

// ── Gastos Fijos Recurrentes ───────────────────────────────────────────────
export async function fetchFixedExpenses(): Promise<FixedExpense[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return getLocalFixedExpenses()

    const { data, error } = await supabase
      .from('fixed_expenses')
      .select('*')
      .eq('user_id', user.id)
      .order('due_day', { ascending: true })

    if (error) throw error
    if (data) {
      localStorage.setItem(LOCAL_FIXED_KEY, JSON.stringify(data))
      return data
    }
  } catch (err) {
    console.warn('Fallback a gastos fijos locales:', err)
  }
  return getLocalFixedExpenses()
}

function getLocalFixedExpenses(): FixedExpense[] {
  try {
    const raw = localStorage.getItem(LOCAL_FIXED_KEY)
    return raw ? JSON.parse(raw) : [
      { id: '1', title: 'Internet & Telefonía', amount: 95000, category: 'Servicios', due_day: 5, is_active: true },
      { id: '2', title: 'Suscripción Streaming', amount: 35000, category: 'Ocio y Salidas', due_day: 15, is_active: true },
    ]
  } catch {
    return []
  }
}

export async function saveFixedExpense(expense: Omit<FixedExpense, 'id'>): Promise<void> {
  const id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now())
  const newExp: FixedExpense = { ...expense, id }
  const localList = [...getLocalFixedExpenses(), newExp]
  localStorage.setItem(LOCAL_FIXED_KEY, JSON.stringify(localList))

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('fixed_expenses').insert({
        user_id: user.id,
        title: expense.title,
        amount: expense.amount,
        category: expense.category,
        due_day: expense.due_day,
        is_active: expense.is_active,
      })
    }
  } catch (err) {
    console.warn('Guardado en Supabase falló, guardado local:', err)
  }
}

export async function deleteFixedExpense(id: string): Promise<void> {
  const localList = getLocalFixedExpenses().filter(e => e.id !== id)
  localStorage.setItem(LOCAL_FIXED_KEY, JSON.stringify(localList))

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('fixed_expenses').delete().eq('id', id).eq('user_id', user.id)
    }
  } catch (err) {
    console.warn('Error eliminando gasto fijo en Supabase:', err)
  }
}

// ── Exportación a Excel / CSV ──────────────────────────────────────────────
export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]): void {
  // UTF-8 BOM para que Excel en Windows y Mac reconozca acentos y caracteres especiales automáticamente
  const BOM = '\uFEFF'
  const csvContent =
    BOM +
    [
      headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(';'),
      ...rows.map(row =>
        row.map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(';')
      ),
    ].join('\r\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ── Consejos Financieros y Cierre con IA ────────────────────────────────────
export interface MonthlyReportResult {
  income: number
  expense: number
  savings: number
  balance: number
  savingsRate: number
  topCategory: string
  insights: { type: 'success' | 'warning' | 'info'; title: string; message: string }[]
}

export function computeMonthlyReport(
  transactions: { type: string; amount: number; category: string; transaction_date: string }[],
  savings: { amount: number; saving_date: string }[],
  year: number,
  month: number // 1-12
): MonthlyReportResult {
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`

  const monthTrans = transactions.filter(t => t.transaction_date.startsWith(monthPrefix))
  const monthSavings = savings.filter(s => s.saving_date.startsWith(monthPrefix))

  const income = monthTrans.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount || 0), 0)
  const expense = monthTrans.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0)
  const totalSavings = monthSavings.reduce((s, sv) => s + Number(sv.amount || 0), 0)
  const balance = income - expense

  const savingsRate = income > 0 ? Math.round(((balance + totalSavings) / income) * 100) : 0

  // Categorías de mayor gasto
  const categoryTotals: Record<string, number> = {}
  monthTrans.filter(t => t.type === 'expense').forEach(t => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Number(t.amount || 0)
  })

  let topCategory = 'Sin gastos registrados'
  let maxCatAmount = 0
  for (const [cat, amt] of Object.entries(categoryTotals)) {
    if (amt > maxCatAmount) {
      maxCatAmount = amt
      topCategory = cat
    }
  }

  // Generador inteligente de sugerencias y diagnóstico financiero
  const insights: { type: 'success' | 'warning' | 'info'; title: string; message: string }[] = []

  if (income === 0 && expense === 0) {
    insights.push({
      type: 'info',
      title: 'Sin movimientos este mes',
      message: 'No registraste ingresos ni gastos en este período. Añade transacciones para desbloquear el análisis.',
    })
  } else {
    if (expense > income && income > 0) {
      insights.push({
        type: 'warning',
        title: 'Déficit en este mes',
        message: `Tus gastos superaron tus ingresos por $${(expense - income).toLocaleString('es-CO')}. Revisa tus gastos en "${topCategory}" para recuperar el equilibrio el próximo mes.`,
      })
    } else if (savingsRate >= 20) {
      insights.push({
        type: 'success',
        title: 'Excelente tasa de ahorro',
        message: `Estás ahorrando el ${savingsRate}% de tus ingresos, superando la regla dorada del 20%. ¡Gran disciplina financiera!`,
      })
    } else {
      insights.push({
        type: 'info',
        title: 'Capacidad de ahorro moderada',
        message: `Tu margen de ahorro este mes fue del ${Math.max(0, savingsRate)}%. Ajustar un 10% en gastos hormiga te permitirá llegar al objetivo del 20%.`,
      })
    }

    if (maxCatAmount > 0 && income > 0) {
      const topCatPercent = Math.round((maxCatAmount / income) * 100)
      if (topCatPercent > 40) {
        insights.push({
          type: 'warning',
          title: `Alta concentración en ${topCategory}`,
          message: `La categoría "${topCategory}" representó el ${topCatPercent}% de tus ingresos totales. Establece un presupuesto límite para esta categoría.`,
        })
      }
    }

    insights.push({
      type: 'info',
      title: 'Regla 50/30/20 sugerida',
      message: 'Distribución recomendada: 50% en necesidades básicas y gastos fijos, 30% en estilo de vida y 20% para tu fondo de libertad financiera.',
    })
  }

  return {
    income,
    expense,
    savings: totalSavings,
    balance,
    savingsRate,
    topCategory,
    insights,
  }
}
