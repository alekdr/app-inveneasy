import { supabase } from './supabase'
import { toast } from 'sonner'

export interface OfflineAction {
  id: string
  table: string
  action: 'insert' | 'upsert' | 'delete'
  payload: any
  options?: any
  timestamp: number
}

const OFFLINE_QUEUE_KEY = 'inven_offline_queue'

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

export function getOfflineQueue(): OfflineAction[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function addToOfflineQueue(action: Omit<OfflineAction, 'id' | 'timestamp'>): void {
  const queue = getOfflineQueue()
  const newAction: OfflineAction = {
    ...action,
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    timestamp: Date.now(),
  }
  queue.push(newAction)
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue))
}

export function clearOfflineQueue(): void {
  localStorage.removeItem(OFFLINE_QUEUE_KEY)
}

/**
 * Procesa y sincroniza todas las acciones guardadas offline en Supabase
 */
export async function syncOfflineQueue(): Promise<number> {
  if (!isOnline()) return 0
  const queue = getOfflineQueue()
  if (queue.length === 0) return 0

  const remaining: OfflineAction[] = []
  let syncedCount = 0

  for (const item of queue) {
    try {
      if (item.action === 'insert') {
        const { error } = await supabase.from(item.table).insert(item.payload)
        if (error) throw error
      } else if (item.action === 'upsert') {
        const { error } = await supabase.from(item.table).upsert(item.payload, item.options)
        if (error) throw error
      } else if (item.action === 'delete') {
        const { error } = await supabase.from(item.table).delete().match(item.payload)
        if (error) throw error
      }
      syncedCount++
    } catch (err) {
      console.warn(`Error sincronizando elemento en ${item.table}:`, err)
      remaining.push(item)
    }
  }

  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining))

  if (syncedCount > 0) {
    toast.success(`Conexión restaurada: ${syncedCount} cambios sincronizados con la nube ☁️`)
  }

  return syncedCount
}

// Inicializador de escuchas para eventos de red
export function initOfflineSyncListener(): void {
  if (typeof window === 'undefined') return

  window.addEventListener('online', () => {
    toast.info('Conexión a internet recuperada. Sincronizando datos...')
    syncOfflineQueue()
  })

  window.addEventListener('offline', () => {
    toast.warning('Modo sin conexión activado. Tus cambios se guardarán localmente.')
  })
}
