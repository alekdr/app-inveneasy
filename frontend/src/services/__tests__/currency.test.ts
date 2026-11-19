import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  formatCurrency,
  convertCurrency,
  getSavedCurrency,
  saveCurrency,
  SUPPORTED_CURRENCIES,
  fetchExchangeRates,
} from '../currency'

describe('currency service', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('formatCurrency', () => {
    it('formatea COP redondeando y con separadores', () => {
      expect(formatCurrency(1234.56, 'COP')).toBe('COP $ 1.235')
      expect(formatCurrency(0, 'COP')).toBe('COP $ 0')
    })

    it('formatea USD con dos decimales', () => {
      expect(formatCurrency(1234.5, 'USD')).toBe('USD $ 1,234.50')
    })

    it('formatea EUR con dos decimales y símbolo al final', () => {
      const out = formatCurrency(10, 'EUR')
      expect(out.endsWith('€')).toBe(true)
    })
  })

  describe('convertCurrency', () => {
    const rates = { USD: 1, COP: 4000, EUR: 0.9 }

    it('devuelve el mismo monto si la moneda es igual', () => {
      expect(convertCurrency(100, 'USD', 'USD', rates)).toBe(100)
    })

    it('convierte USD a COP', () => {
      expect(convertCurrency(10, 'USD', 'COP', rates)).toBe(40000)
    })

    it('convierte COP a USD', () => {
      expect(convertCurrency(8000, 'COP', 'USD', rates)).toBe(2)
    })

    it('convierte EUR a COP', () => {
      expect(convertCurrency(1, 'EUR', 'COP', rates)).toBeCloseTo(4000 / 0.9, 5)
    })
  })

  describe('moneda guardada', () => {
    it('devuelve COP por defecto', () => {
      expect(getSavedCurrency()).toBe('COP')
    })

    it('guarda y recupera la moneda', () => {
      saveCurrency('USD')
      expect(getSavedCurrency()).toBe('USD')
    })

    it('ignora valores inválidos', () => {
      localStorage.setItem('inven_selected_currency', 'GBP')
      expect(getSavedCurrency()).toBe('COP')
    })
  })

  describe('SUPPORTED_CURRENCIES', () => {
    it('incluye las 3 monedas esperadas', () => {
      expect(Object.keys(SUPPORTED_CURRENCIES)).toEqual(['COP', 'USD', 'EUR'])
    })
  })

  describe('fetchExchangeRates', () => {
    it('usa la respuesta de red y cachea las tasas', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ rates: { COP: 4200, EUR: 0.91 } }),
        })
      )

      const rates = await fetchExchangeRates()
      expect(rates.COP).toBe(4200)
      expect(rates.EUR).toBe(0.91)
      expect(JSON.parse(localStorage.getItem('inven_exchange_rates')!)).toEqual(rates)
    })

    it('usa el cache cuando la red falla', async () => {
      localStorage.setItem(
        'inven_exchange_rates',
        JSON.stringify({ USD: 1, COP: 4100, EUR: 0.93 })
      )
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

      const rates = await fetchExchangeRates()
      expect(rates.COP).toBe(4100)
    })
  })
})
