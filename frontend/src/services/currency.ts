// Servicio de monedas y formato para Finanzas

export type CurrencyCode = 'COP' | 'USD' | 'EUR'

export interface CurrencyConfig {
  code: CurrencyCode
  symbol: string
  name: string
  flag: string
}

export const SUPPORTED_CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  COP: { code: 'COP', symbol: 'COP $', name: 'Peso colombiano', flag: '🇨🇴' },
  USD: { code: 'USD', symbol: 'USD $', name: 'Dólar estadounidense', flag: '🇺🇸' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺' },
}

// Tasas referenciales con respecto a USD
const DEFAULT_RATES: Record<CurrencyCode, number> = {
  USD: 1,
  COP: 4150,
  EUR: 0.92,
}

const RATES_STORAGE_KEY = 'inven_exchange_rates'
const CURRENCY_STORAGE_KEY = 'inven_selected_currency'

export async function fetchExchangeRates(): Promise<Record<CurrencyCode, number>> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD')
    if (!res.ok) throw new Error('Network error')
    const data = await res.json()
    if (data && data.rates) {
      const rates: Record<CurrencyCode, number> = {
        USD: 1,
        COP: Number(data.rates.COP) || DEFAULT_RATES.COP,
        EUR: Number(data.rates.EUR) || DEFAULT_RATES.EUR,
      }
      localStorage.setItem(RATES_STORAGE_KEY, JSON.stringify(rates))
      return rates
    }
  } catch {
    const cached = localStorage.getItem(RATES_STORAGE_KEY)
    if (cached) {
      try {
        return JSON.parse(cached)
      } catch {
        // ignore
      }
    }
  }
  return DEFAULT_RATES
}

export function getSavedCurrency(): CurrencyCode {
  const saved = localStorage.getItem(CURRENCY_STORAGE_KEY)
  if (saved === 'COP' || saved === 'USD' || saved === 'EUR') {
    return saved
  }
  return 'COP'
}

export function saveCurrency(c: CurrencyCode) {
  localStorage.setItem(CURRENCY_STORAGE_KEY, c)
}

/**
 * Convierte un monto entre dos monedas usando las tasas dadas.
 */
export function convertCurrency(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rates: Record<CurrencyCode, number>
): number {
  if (from === to) return amount
  const fromRate = rates[from] || 1
  const toRate = rates[to] || 1
  const inUSD = amount / fromRate
  return inUSD * toRate
}

/**
 * Formatea un número exactamente en la moneda solicitada sin multiplicar ni convertir
 */
export function formatCurrency(
  amount: number,
  currency: CurrencyCode
): string {
  const config = SUPPORTED_CURRENCIES[currency]
  if (currency === 'COP') {
    return `${config.symbol} ${Math.round(amount).toLocaleString('es-CO')}`
  } else if (currency === 'EUR') {
    return `${Number(amount).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${config.symbol}`
  } else {
    return `${config.symbol} ${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
}
