import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { PushNotifications } from '@capacitor/push-notifications'
import { api } from './api'
import { supabase } from './supabase'
import type { Routine, Habit, CalendarEvent } from '../types'

/**
 * Servicio de notificaciones de InvenEasy.
 *
 * - Push remotas (FCM/APNs) vía @capacitor/push-notifications.
 * - Recordatorios locales programados (rutinas, hábitos y eventos del calendario)
 *   vía @capacitor/local-notifications.
 */

// ===== Constantes de IDs (evitan colisiones entre módulos) =====
const ROUTINE_ID_BASE = 100_000_000
const HABIT_ID_BASE = 200_000_000
const CALENDAR_ID_BASE = 300_000_000

function hashToId(seed: string, max = 1_000_000): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
  }
  return Math.abs(hash) % max
}

// ===== Push remotas =====

let pushInitialized = false

export async function initPushNotifications(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false
  if (pushInitialized) return true

  try {
    const perm = await PushNotifications.checkPermissions()
    let granted = perm.receive === 'granted'

    if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
      const req = await PushNotifications.requestPermissions()
      granted = req.receive === 'granted'
    }

    if (!granted) return false

    await PushNotifications.register()
    pushInitialized = true

    PushNotifications.addListener('registration', async (token) => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        await api.post('/notifications/register-device', {
          user_id: user.id,
          token: token.value,
          platform: Capacitor.getPlatform(),
        })
      } catch {
        // El backend puede no estar corriendo (modo offline) — sin bloquear
      }
    })

    PushNotifications.addListener('registrationError', (err) => {
      console.warn('Push registration error:', err)
    })

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      // App en primer plano: mostrar como notificación local para no perderla
      LocalNotifications.schedule({
        notifications: [
          {
            id: hashToId(`push:${notification.id || Date.now()}`, 999_999),
            title: notification.title || 'InvenEasy',
            body: notification.body || '',
            extra: notification.data || {},
          },
        ],
      }).catch(() => {})
    })

    return true
  } catch (err) {
    console.warn('Push notifications no disponibles:', err)
    return false
  }
}

// ===== Permisos locales =====

export async function getNotificationPermission(): Promise<string> {
  if (!Capacitor.isNativePlatform()) return 'unsupported'
  try {
    const result = await LocalNotifications.checkPermissions()
    return result.display
  } catch {
    return 'unsupported'
  }
}

export async function requestNotificationPermission(): Promise<string> {
  try {
    const result = await LocalNotifications.requestPermissions()
    return result.display
  } catch {
    return 'unsupported'
  }
}

// ===== Helpers de tiempo =====

function parseTime(time: string | null): { hour: number; minute: number } | null {
  if (!time) return null
  const parts = time.split(':')
  const hour = parseInt(parts[0], 10)
  const minute = parseInt(parts[1], 10)
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null
  return { hour, minute }
}

/** Día de la semana en formato Capacitor: 1=Domingo ... 7=Sábado */
function capacitorWeekday(date: Date): number {
  return date.getDay() + 1
}

function parseDateOnly(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00`)
}

// ===== Programación de recordatorios =====

interface PendingNotification {
  id: number
  title: string
  body: string
  schedule?: {
    at?: Date
    repeats?: boolean
    every?: 'day' | 'week' | 'month' | 'year'
    on?: { weekday?: number; day?: number; hour?: number; minute?: number }
    allowWhileIdle?: boolean
  }
  extra?: Record<string, unknown>
}

async function scheduleBatch(notifications: PendingNotification[]) {
  if (notifications.length === 0) return
  await LocalNotifications.schedule({
    notifications: notifications.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      schedule: n.schedule,
      extra: n.extra,
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#7c3aed',
    })),
  })
}

function buildRoutineNotifications(routines: Routine[]): PendingNotification[] {
  const out: PendingNotification[] = []

  for (const routine of routines) {
    if (!routine.is_active) continue
    const time = parseTime(routine.time_of_day)
    if (!time) continue
    if (routine.frequency === 'custom') continue

    const created = routine.created_at ? new Date(routine.created_at) : new Date()
    const baseId = ROUTINE_ID_BASE + hashToId(routine.id)

    if (routine.frequency === 'daily') {
      out.push({
        id: baseId,
        title: 'Rutina pendiente',
        body: `Hoy no has realizado: ${routine.title}`,
        schedule: {
          on: { hour: time.hour, minute: time.minute },
          repeats: true,
          every: 'day',
          allowWhileIdle: true,
        },
        extra: { type: 'routine', routine_id: routine.id },
      })
    } else if (routine.frequency === 'weekly') {
      out.push({
        id: baseId,
        title: 'Rutina semanal',
        body: `Recuerda: ${routine.title}`,
        schedule: {
          on: {
            weekday: capacitorWeekday(created),
            hour: time.hour,
            minute: time.minute,
          },
          repeats: true,
          every: 'week',
          allowWhileIdle: true,
        },
        extra: { type: 'routine', routine_id: routine.id },
      })
    } else if (routine.frequency === 'monthly') {
      out.push({
        id: baseId,
        title: 'Rutina mensual',
        body: `Recuerda: ${routine.title}`,
        schedule: {
          on: {
            day: created.getDate(),
            hour: time.hour,
            minute: time.minute,
          },
          repeats: true,
          every: 'month',
          allowWhileIdle: true,
        },
        extra: { type: 'routine', routine_id: routine.id },
      })
    }
  }

  return out
}

function buildHabitNotifications(habits: Habit[]): PendingNotification[] {
  const out: PendingNotification[] = []

  for (const habit of habits) {
    if (!habit.is_active) continue
    const time = parseTime(habit.reminder_time)
    if (!time) continue
    if (habit.frequency === 'custom') continue

    const baseId = HABIT_ID_BASE + hashToId(habit.id)

    if (habit.frequency === 'daily') {
      out.push({
        id: baseId,
        title: 'Hábito de hoy',
        body: `No olvides: ${habit.name}`,
        schedule: {
          on: { hour: time.hour, minute: time.minute },
          repeats: true,
          every: 'day',
          allowWhileIdle: true,
        },
        extra: { type: 'habit', habit_id: habit.id },
      })
    } else if (habit.frequency === 'weekdays') {
      // Capacitor: 1=Domingo, 2=Lunes ... 7=Sábado
      for (let weekday = 2; weekday <= 6; weekday++) {
        out.push({
          id: baseId + weekday * 10_000,
          title: 'Hábito de hoy',
          body: `No olvides: ${habit.name}`,
          schedule: {
            on: { weekday, hour: time.hour, minute: time.minute },
            repeats: true,
            every: 'week',
            allowWhileIdle: true,
          },
          extra: { type: 'habit', habit_id: habit.id, weekday },
        })
      }
    } else if (habit.frequency === 'weekends') {
      for (const weekday of [1, 7]) {
        out.push({
          id: baseId + weekday * 10_000,
          title: 'Hábito de hoy',
          body: `No olvides: ${habit.name}`,
          schedule: {
            on: { weekday, hour: time.hour, minute: time.minute },
            repeats: true,
            every: 'week',
            allowWhileIdle: true,
          },
          extra: { type: 'habit', habit_id: habit.id, weekday },
        })
      }
    }
  }

  return out
}

function buildCalendarNotifications(events: CalendarEvent[]): PendingNotification[] {
  const out: PendingNotification[] = []
  const now = new Date()

  for (const event of events) {
    if (event.is_completed) continue

    const date = parseDateOnly(event.event_date)
    let at: Date | null = null

    if (event.event_time) {
      const time = parseTime(event.event_time)
      if (!time) continue
      at = new Date(date)
      at.setHours(time.hour, time.minute, 0, 0)
      at = new Date(at.getTime() - 30 * 60 * 1000) // 30 min antes
    } else {
      at = new Date(date)
      at.setHours(9, 0, 0, 0) // 9 AM si no hay hora
    }

    if (at.getTime() <= now.getTime()) continue

    out.push({
      id: CALENDAR_ID_BASE + hashToId(event.id),
      title: event.event_type === 'Urgente' ? '⚠️ Evento urgente' : 'Evento próximo',
      body: `${event.title}${event.event_time ? ` · ${event.event_time}` : ''}`,
      schedule: { at, allowWhileIdle: true },
      extra: { type: 'calendar', event_id: event.id },
    })
  }

  return out
}

/**
 * Sincroniza todos los recordatorios locales con los datos actuales del usuario.
 *
 * - Respeta las preferencias de la sección Ajustes (localStorage).
 * - Cancela recordatorios previos antes de reprogramar.
 * - Solo programa si el permiso ya fue concedido (no molesta al abrir la app).
 */
export async function syncScheduledReminders(): Promise<{ scheduled: number; skipped?: string }> {
  if (!Capacitor.isNativePlatform()) return { scheduled: 0, skipped: 'web' }

  const permission = await getNotificationPermission()
  if (permission !== 'granted') return { scheduled: 0, skipped: 'permission' }

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { scheduled: 0, skipped: 'no-user' }

    const alertRoutines = localStorage.getItem('inven_alert_routines') !== 'false'
    const alertHabits = localStorage.getItem('inven_alert_habits') !== 'false'

    const [routinesRes, habitsRes, eventsRes] = await Promise.all([
      alertRoutines
        ? supabase
            .from('routines')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_active', true)
        : Promise.resolve({ data: [] as Routine[], error: null }),
      alertHabits
        ? supabase
            .from('habits')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_active', true)
        : Promise.resolve({ data: [] as Habit[], error: null }),
      supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_completed', false)
        .gte('event_date', new Date().toISOString().split('T')[0])
        .lte(
          'event_date',
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        ),
    ])

    const notifications: PendingNotification[] = [
      ...buildRoutineNotifications((routinesRes.data || []) as Routine[]),
      ...buildHabitNotifications((habitsRes.data || []) as Habit[]),
      ...buildCalendarNotifications((eventsRes.data || []) as CalendarEvent[]),
    ]

    // Cancelar pendientes previos de forma segura
    const pending = await LocalNotifications.getPending()
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({
        notifications: pending.notifications.map((n) => ({ id: n.id })),
      })
    }

    await scheduleBatch(notifications)
    return { scheduled: notifications.length }
  } catch (err) {
    console.warn('No se pudieron sincronizar recordatorios:', err)
    return { scheduled: 0, skipped: 'error' }
  }
}

/** Cancela todos los recordatorios locales programados por InvenEasy. */
export async function cancelAllReminders() {
  if (!Capacitor.isNativePlatform()) return
  try {
    const pending = await LocalNotifications.getPending()
    const ids = pending.notifications
      .map((n) => n.id)
      .filter(
        (id) =>
          id >= ROUTINE_ID_BASE ||
          (id >= HABIT_ID_BASE && id < CALENDAR_ID_BASE) ||
          id >= CALENDAR_ID_BASE
      )

    if (ids.length > 0) {
      await LocalNotifications.cancel({ notifications: ids.map((id) => ({ id })) })
    }
  } catch {
    // ignore
  }
}
