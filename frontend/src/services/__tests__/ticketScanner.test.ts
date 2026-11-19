import { describe, it, expect } from 'vitest'
import { extractTotal, extractItems } from '../ticketScanner'

describe('ticketScanner - extractTotal', () => {
  it('extrae TOTAL A PAGAR', () => {
    const text = 'Hamburguesa 25.000\nTOTAL A PAGAR: $ 27.500'
    expect(extractTotal(text)).toBe(27500)
  })

  it('extrae TOTAL VENTA', () => {
    const text = 'TOTAL VENTA: 1.234,56'
    expect(extractTotal(text)).toBeCloseTo(1234.56, 2)
  })

  it('extrae GRAN TOTAL cuando no hay otros', () => {
    const text = 'GRAN TOTAL $15.000'
    expect(extractTotal(text)).toBe(15000)
  })

  it('devuelve null si no hay totales', () => {
    expect(extractTotal('Hola mundo sin cifras')).toBeNull()
  })

  it('ignora valores en cero', () => {
    expect(extractTotal('TOTAL: 0')).toBeNull()
  })

  it('prioriza TOTAL A PAGAR sobre un monto suelto previo', () => {
    const text = '$ 9.999\nTOTAL A PAGAR: 12.500'
    expect(extractTotal(text)).toBe(12500)
  })
})

describe('ticketScanner - extractItems', () => {
  it('extrae ítems con nombre y precio', () => {
    const text = [
      'Arroz 5.000',
      'Leche 3.200',
      'TOTAL 8.200',
      'IVA 19%',
    ].join('\n')

    const items = extractItems(text)
    expect(items.map((i) => i.name)).toContain('Arroz')
    expect(items.map((i) => i.name)).toContain('Leche')
    // Las líneas de totales/IVA deben descartarse
    expect(items.some((i) => /TOTAL|IVA/i.test(i.name))).toBe(false)
  })

  it('parsea precios con separadores de miles', () => {
    const items = extractItems('Pan 1.500\nCafé 2.000')
    expect(items[0].amount).toBe(1500)
    expect(items[1].amount).toBe(2000)
  })

  it('devuelve máximo 10 ítems', () => {
    const text = Array.from({ length: 20 }, (_, i) => `Producto${i} 1.000`).join('\n')
    expect(extractItems(text).length).toBeLessThanOrEqual(10)
  })

  it('ignora líneas demasiado cortas', () => {
    expect(extractItems('A 1\n')).toHaveLength(0)
  })
})
