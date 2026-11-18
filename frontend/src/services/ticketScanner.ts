import Tesseract from 'tesseract.js'

export interface ScannedTicket {
  rawText: string
  total: number | null
  items: Array<{ name: string; amount: number | null }>
  confidence: number
}

/** Extrae el total de un texto OCR de ticket/factura */
function extractTotal(text: string): number | null {
  const lines = text.split('\n')

  // Patrones comunes en facturas colombianas / latinoamericanas
  const totalPatterns = [
    /TOTAL\s*A\s*PAGAR[:\s]*[\$]?\s*([\d.,]+)/i,
    /TOTAL\s*VENTA[:\s]*[\$]?\s*([\d.,]+)/i,
    /TOTAL[:\s]*[\$]?\s*([\d.,]+)/i,
    /VALOR\s*TOTAL[:\s]*[\$]?\s*([\d.,]+)/i,
    /GRAN\s*TOTAL[:\s]*[\$]?\s*([\d.,]+)/i,
    /SUBTOTAL[:\s]*[\$]?\s*([\d.,]+)/i,
    /[\$]\s*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/,
  ]

  for (const pattern of totalPatterns) {
    for (const line of lines) {
      const match = line.match(pattern)
      if (match) {
        const numStr = match[1].replace(/\./g, '').replace(',', '.')
        const num = parseFloat(numStr)
        if (!isNaN(num) && num > 0) return num
      }
    }
  }
  return null
}

/** Extrae ítems individuales del texto OCR */
function extractItems(text: string): Array<{ name: string; amount: number | null }> {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2)
  const items: Array<{ name: string; amount: number | null }> = []

  // Buscar líneas que tengan un nombre y un número (precio)
  const itemPattern = /^(.+?)\s+[\$]?\s*([\d.,]+)\s*$/
  const skipWords = ['TOTAL', 'SUBTOTAL', 'IVA', 'EFECTIVO', 'CAMBIO', 'VUELTO', 'CAJERO', 'FECHA', 'HORA', 'NIT', 'RUT', 'TICKET', 'RECIBO']

  for (const line of lines) {
    if (skipWords.some(w => line.toUpperCase().includes(w))) continue
    const match = line.match(itemPattern)
    if (match && match[1].length > 2) {
      const numStr = match[2].replace(/\./g, '').replace(',', '.')
      const amount = parseFloat(numStr)
      items.push({
        name: match[1].trim(),
        amount: !isNaN(amount) ? amount : null,
      })
    }
  }

  return items.slice(0, 10) // Máximo 10 ítems
}

/** Procesa una imagen (base64 o URL) con Tesseract OCR */
export async function scanTicket(
  imageData: string, // base64 o URL
  onProgress?: (progress: number) => void
): Promise<ScannedTicket> {
  const result = await Tesseract.recognize(imageData, 'spa+eng', {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100))
      }
    },
  })

  const rawText = result.data.text
  const confidence = result.data.confidence

  return {
    rawText,
    total: extractTotal(rawText),
    items: extractItems(rawText),
    confidence,
  }
}
