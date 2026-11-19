import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IoSettingsOutline,
  IoPersonOutline,
  IoMoonOutline,
  IoSunnyOutline,
  IoCloudDoneOutline,
  IoCloudOfflineOutline,
  IoRefreshOutline,
  IoDownloadOutline,
  IoLogOutOutline,
  IoNotificationsOutline,
  IoFolderOpenOutline,
  IoAlertCircleOutline,
  IoCameraOutline,
  IoToggle,
  IoToggleOutline,
} from 'react-icons/io5'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../services/supabase'
import { isOnline, getOfflineQueue, syncOfflineQueue, clearOfflineQueue } from '../services/offlineSync'
import { exportToCSV } from '../services/finances'
import { triggerHaptic } from '../services/capacitor'
import { confirmDialog } from '../stores/confirmStore'
import { toast } from 'sonner'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Camera } from '@capacitor/camera'
import { syncScheduledReminders } from '../services/notifications'
import { Capacitor } from '@capacitor/core'

// Toggle visual reutilizable
function SettingsToggle({ enabled, onToggle, label, sublabel }: {
  enabled: boolean; onToggle: () => void; label: string; sublabel?: string
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center justify-between w-full py-2.5 group"
    >
      <div className="text-left">
        <p className="text-xs font-bold text-slate-800 dark:text-white">{label}</p>
        {sublabel && <p className="text-[10px] text-slate-400 font-medium">{sublabel}</p>}
      </div>
      {enabled ? (
        <IoToggle size={30} className="text-violet-600 dark:text-violet-400 shrink-0" />
      ) : (
        <IoToggleOutline size={30} className="text-slate-300 dark:text-slate-600 shrink-0" />
      )}
    </button>
  )
}

export default function SettingsPage() {
  const { user, signOut } = useAuthStore()
  const navigate = useNavigate()

  // ===== PERFIL =====
  const [displayName, setDisplayName] = useState(
    user?.user_metadata?.display_name || user?.email?.split('@')[0] || ''
  )
  const [savingProfile, setSavingProfile] = useState(false)

  // ===== TEMA: solo light / dark, default light =====
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('inven_theme') as 'light' | 'dark') || 'light'
  })

  // ===== NOTIFICACIONES =====
  const [notifPermission, setNotifPermission] = useState<string>('unknown')
  const [alertHabitReminder, setAlertHabitReminder] = useState(() =>
    localStorage.getItem('inven_alert_habits') !== 'false'
  )
  const [alertRoutineReminder, setAlertRoutineReminder] = useState(() =>
    localStorage.getItem('inven_alert_routines') !== 'false'
  )
  const [alertWeeklyWrap, setAlertWeeklyWrap] = useState(() =>
    localStorage.getItem('inven_alert_weekly') !== 'false'
  )
  const [alertExcessiveSpend, setAlertExcessiveSpend] = useState(() =>
    localStorage.getItem('inven_alert_spending') === 'true'
  )
  const [alertRecordExpenses, setAlertRecordExpenses] = useState(() =>
    localStorage.getItem('inven_alert_record_expenses') === 'true'
  )
  const [alertStreakRisk, setAlertStreakRisk] = useState(() =>
    localStorage.getItem('inven_alert_streak_risk') === 'true'
  )

  // ===== PERMISOS =====
  const [cameraPermission, setCameraPermission] = useState<string>('unknown')

  // ===== OFFLINE =====
  const [onlineStatus, setOnlineStatus] = useState(isOnline())
  const [queueCount, setQueueCount] = useState(0)
  const [syncing, setSyncing] = useState(false)

  // ===== PERMISOS HANDLERS =====
  const checkNotifPermission = async () => {
    try {
      const result = await LocalNotifications.checkPermissions()
      setNotifPermission(result.display)
    } catch {
      setNotifPermission('unsupported')
    }
  }

  const checkCameraPermission = async () => {
    try {
      const result = await Camera.checkPermissions()
      setCameraPermission(result.camera)
    } catch {
      setCameraPermission('unsupported')
    }
  }

  useEffect(() => {
    const updateStatus = () => {
      setOnlineStatus(isOnline())
      setQueueCount(getOfflineQueue().length)
    }
    updateStatus()
    window.addEventListener('online', updateStatus)
    window.addEventListener('offline', updateStatus)

    // Verificar permisos al montar
    checkNotifPermission()
    checkCameraPermission()

    return () => {
      window.removeEventListener('online', updateStatus)
      window.removeEventListener('offline', updateStatus)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const requestNotifPermission = async () => {
    try {
      await triggerHaptic()
      const result = await LocalNotifications.requestPermissions()
      setNotifPermission(result.display)
      if (result.display === 'granted') {
        toast.success('Permiso de notificaciones concedido')
        // Programar recordatorios de rutinas, hábitos y calendario
        const sync = await syncScheduledReminders()
        if (sync.scheduled > 0) {
          toast.success(`${sync.scheduled} recordatorio(s) programado(s)`)
        }
      } else {
        toast.warning('Permiso de notificaciones denegado — actívalo desde la configuración del teléfono')
      }
    } catch {
      toast.error('No se pudo solicitar permisos de notificaciones')
    }
  }

  const handleSyncReminders = async () => {
    try {
      await triggerHaptic()
      if (!Capacitor.isNativePlatform()) {
        toast.info('Los recordatorios programados solo están disponibles en la app móvil')
        return
      }
      const result = await syncScheduledReminders()
      if (result.skipped === 'permission') {
        toast.warning('Concede el permiso de notificaciones primero')
        return
      }
      if (result.skipped === 'no-user') {
        toast.error('Inicia sesión para sincronizar recordatorios')
        return
      }
      toast.success(
        result.scheduled > 0
          ? `${result.scheduled} recordatorio(s) programado(s)`
          : 'No hay recordatorios que programar (revisa horas de rutinas/hábitos y eventos)'
      )
    } catch {
      toast.error('No se pudieron sincronizar los recordatorios')
    }
  }

  const requestCameraPermission = async () => {
    try {
      await triggerHaptic()
      const result = await Camera.requestPermissions({ permissions: ['camera', 'photos'] })
      setCameraPermission(result.camera)
      if (result.camera === 'granted') {
        toast.success('Permiso de cámara/archivos concedido')
      } else {
        toast.warning('Permiso denegado — actívalo desde la configuración del teléfono')
      }
    } catch {
      toast.error('No se pudo solicitar permisos de cámara')
    }
  }

  // ===== TEMA =====
  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme)
    localStorage.setItem('inven_theme', newTheme)
    triggerHaptic()
    const root = document.documentElement
    if (newTheme === 'dark') {
      root.classList.add('dark')
      document.body?.classList.add('dark')
    } else {
      root.classList.remove('dark')
      document.body?.classList.remove('dark')
    }
    toast.success(`Tema: ${newTheme === 'dark' ? 'Oscuro' : 'Claro'}`)
  }

  // ===== PERFIL =====
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!displayName.trim()) return
    setSavingProfile(true)
    try {
      await triggerHaptic()
      const { error } = await supabase.auth.updateUser({
        data: { display_name: displayName.trim() },
      })
      if (error) throw error
      toast.success('Nombre de perfil actualizado')
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar perfil')
    } finally {
      setSavingProfile(false)
    }
  }

  // ===== ALERTAS: persistir toggles =====
  const toggleAlert = (key: string, value: boolean, setter: (v: boolean) => void) => {
    setter(value)
    localStorage.setItem(key, String(value))
    triggerHaptic()
  }

  // ===== SYNC =====
  const handleSyncNow = async () => {
    if (!onlineStatus) {
      toast.warning('No tienes conexión a internet en este momento')
      return
    }
    setSyncing(true)
    try {
      await triggerHaptic()
      const count = await syncOfflineQueue()
      setQueueCount(getOfflineQueue().length)
      if (count === 0) {
        toast.info('No hay cambios pendientes por sincronizar')
      }
    } catch {
      toast.error('Error durante la sincronización')
    } finally {
      setSyncing(false)
    }
  }

  const handleClearQueue = async () => {
    const ok = await confirmDialog({
      title: 'Limpiar Cola Local',
      message: '¿Deseas descartar los cambios locales pendientes sin sincronizar?',
      confirmText: 'Limpiar',
      danger: true,
    })
    if (!ok) return
    clearOfflineQueue()
    setQueueCount(0)
    toast.info('Cola local limpiada')
  }

  // ===== EXPORTAR CSV =====
  const handleExportCSV = async () => {
    try {
      await triggerHaptic()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: txs, error } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: false })
      if (error) throw error
      if (!txs || txs.length === 0) {
        toast.info('No hay transacciones registradas para exportar')
        return
      }
      const headers = ['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto']
      const rows = txs.map((t: any) => [
        t.transaction_date,
        t.type === 'expense' ? 'Gasto' : 'Ingreso',
        t.category,
        t.description || '',
        t.amount,
      ])
      exportToCSV(`transacciones_${new Date().toISOString().split('T')[0]}.csv`, headers, rows)
      toast.success('Archivo CSV descargado con éxito')
    } catch {
      toast.error('Error al exportar transacciones')
    }
  }

  // ===== CERRAR SESIÓN =====
  const handleSignOut = async () => {
    const ok = await confirmDialog({
      title: 'Cerrar Sesión',
      message: '¿Estás seguro de que deseas cerrar sesión en este dispositivo?',
      confirmText: 'Cerrar sesión',
      danger: true,
    })
    if (!ok) return
    await triggerHaptic()
    await signOut()
    toast.success('Sesión finalizada')
    navigate('/auth')
  }

  const permissionBadge = (status: string) => {
    if (status === 'granted') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
    if (status === 'denied') return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
    return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
  }

  const permissionLabel = (status: string) => {
    if (status === 'granted') return 'Concedido'
    if (status === 'denied') return 'Denegado'
    if (status === 'unsupported') return 'No disponible'
    return 'Pendiente'
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto pb-10">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-slate-900 dark:text-white">
          <IoSettingsOutline size={22} className="text-violet-600 dark:text-violet-400" />
          <h2 className="text-xl font-bold tracking-tight">Configuración</h2>
        </div>
        <p className="text-xs text-slate-400 font-medium mt-1">
          Personaliza tu cuenta, apariencia, notificaciones y permisos
        </p>
      </div>

      {/* 1. PERFIL */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 mb-4">
          <IoPersonOutline size={18} className="text-violet-600 dark:text-violet-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Perfil de Usuario</h3>
        </div>
        <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-lg font-bold text-white uppercase shadow-xs dark:bg-white dark:text-slate-900">
              {displayName.charAt(0) || user?.email?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 truncate">
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {displayName || 'Usuario'}
              </p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Nombre para mostrar
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Tu nombre"
                className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold outline-none focus:border-violet-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <button
                type="submit"
                disabled={savingProfile || !displayName.trim()}
                className="rounded-2xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900"
              >
                {savingProfile ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 2. APARIENCIA */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 mb-4">
          <IoMoonOutline size={18} className="text-violet-600 dark:text-violet-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Apariencia</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleThemeChange('light')}
            className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition ${
              theme === 'light'
                ? 'border-violet-600 bg-violet-50/50 text-violet-700 dark:border-violet-500 dark:bg-violet-950/30 dark:text-violet-300 font-bold'
                : 'border-slate-200/80 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400'
            }`}
          >
            <IoSunnyOutline size={22} />
            <span className="text-xs">Claro</span>
          </button>
          <button
            type="button"
            onClick={() => handleThemeChange('dark')}
            className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition ${
              theme === 'dark'
                ? 'border-violet-600 bg-violet-50/50 text-violet-700 dark:border-violet-500 dark:bg-violet-950/30 dark:text-violet-300 font-bold'
                : 'border-slate-200/80 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400'
            }`}
          >
            <IoMoonOutline size={22} />
            <span className="text-xs">Oscuro</span>
          </button>
        </div>
      </div>

      {/* 3. NOTIFICACIONES */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <IoNotificationsOutline size={18} className="text-violet-600 dark:text-violet-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Notificaciones</h3>
          </div>
          <span className={`inline-flex items-center rounded-xl px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${permissionBadge(notifPermission)}`}>
            {permissionLabel(notifPermission)}
          </span>
        </div>

        {notifPermission !== 'granted' && notifPermission !== 'unsupported' && (
          <button
            type="button"
            onClick={requestNotifPermission}
            className="w-full mb-4 rounded-2xl bg-violet-600 py-3 text-xs font-bold text-white transition hover:bg-violet-700 active:scale-[0.98]"
          >
            Solicitar permiso de notificaciones
          </button>
        )}

        <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          <SettingsToggle
            enabled={alertHabitReminder}
            onToggle={() => toggleAlert('inven_alert_habits', !alertHabitReminder, setAlertHabitReminder)}
            label="Recordatorios de hábitos"
            sublabel="Te recuerda completar tus hábitos diarios"
          />
          <SettingsToggle
            enabled={alertRoutineReminder}
            onToggle={() => toggleAlert('inven_alert_routines', !alertRoutineReminder, setAlertRoutineReminder)}
            label="Recordatorios de rutinas"
            sublabel="Avisos para tus rutinas programadas"
          />
          <SettingsToggle
            enabled={alertWeeklyWrap}
            onToggle={() => toggleAlert('inven_alert_weekly', !alertWeeklyWrap, setAlertWeeklyWrap)}
            label="Resumen semanal"
            sublabel="Recibe tu resumen dominical cada semana"
          />
        </div>

        <button
          type="button"
          onClick={handleSyncReminders}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 py-2.5 text-xs font-bold text-violet-700 transition hover:bg-violet-100 active:scale-[0.98] dark:border-violet-800/60 dark:bg-violet-950/30 dark:text-violet-300"
        >
          <IoRefreshOutline size={14} />
          Sincronizar recordatorios
        </button>
      </div>

      {/* 4. ALERTAS INTELIGENTES */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 mb-4">
          <IoAlertCircleOutline size={18} className="text-violet-600 dark:text-violet-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Alertas Inteligentes</h3>
        </div>

        <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          <SettingsToggle
            enabled={alertExcessiveSpend}
            onToggle={() => toggleAlert('inven_alert_spending', !alertExcessiveSpend, setAlertExcessiveSpend)}
            label="Gasto diario excesivo"
            sublabel="Aviso cuando tu gasto de hoy supera lo habitual"
          />
          <SettingsToggle
            enabled={alertRecordExpenses}
            onToggle={() => toggleAlert('inven_alert_record_expenses', !alertRecordExpenses, setAlertRecordExpenses)}
            label="Registrar gastos"
            sublabel="Recordatorio nocturno para que no olvides anotar gastos"
          />
          <SettingsToggle
            enabled={alertStreakRisk}
            onToggle={() => toggleAlert('inven_alert_streak_risk', !alertStreakRisk, setAlertStreakRisk)}
            label="Racha en riesgo"
            sublabel="Aviso si estás a punto de perder una racha de hábitos"
          />
        </div>
      </div>

      {/* 5. PERMISOS DEL DISPOSITIVO */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 mb-4">
          <IoFolderOpenOutline size={18} className="text-violet-600 dark:text-violet-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Permisos del Dispositivo</h3>
        </div>

        <div className="flex flex-col gap-3">
          {/* Notificaciones */}
          <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-800/40">
            <div className="flex items-center gap-3">
              <IoNotificationsOutline size={18} className="text-slate-500 dark:text-slate-400" />
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-white">Notificaciones</p>
                <p className="text-[10px] text-slate-400 font-medium">Avisos y recordatorios</p>
              </div>
            </div>
            <span className={`inline-flex items-center rounded-xl px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${permissionBadge(notifPermission)}`}>
              {permissionLabel(notifPermission)}
            </span>
          </div>

          {/* Cámara/Archivos */}
          <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-800/40">
            <div className="flex items-center gap-3">
              <IoCameraOutline size={18} className="text-slate-500 dark:text-slate-400" />
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-white">Cámara y Archivos</p>
                <p className="text-[10px] text-slate-400 font-medium">Fotos de prendas y tickets</p>
              </div>
            </div>
            <span className={`inline-flex items-center rounded-xl px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${permissionBadge(cameraPermission)}`}>
              {permissionLabel(cameraPermission)}
            </span>
          </div>

          {cameraPermission !== 'granted' && cameraPermission !== 'unsupported' && (
            <button
              type="button"
              onClick={requestCameraPermission}
              className="w-full rounded-2xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Solicitar permiso de cámara
            </button>
          )}
        </div>
      </div>

      {/* 6. SINCRONIZACIÓN */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {onlineStatus ? (
              <IoCloudDoneOutline size={18} className="text-emerald-600" />
            ) : (
              <IoCloudOfflineOutline size={18} className="text-amber-500" />
            )}
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Estado de Sincronización</h3>
          </div>
          <span
            className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
              onlineStatus
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
            }`}
          >
            {onlineStatus ? 'Conectado' : 'Sin conexión'}
          </span>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/40">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Cambios locales pendientes</span>
            <span className="text-xs font-bold text-slate-900 dark:text-white">{queueCount}</span>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={handleSyncNow}
            disabled={syncing || !onlineStatus}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            <IoRefreshOutline size={15} className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? 'Sincronizando...' : 'Sincronizar ahora'}</span>
          </button>

          {queueCount > 0 && (
            <button
              type="button"
              onClick={handleClearQueue}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* 7. EXPORTAR DATOS */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 mb-2">
          <IoDownloadOutline size={18} className="text-violet-600 dark:text-violet-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Exportar Datos</h3>
        </div>
        <p className="text-xs text-slate-400 font-medium mb-4">
          Descarga un archivo CSV con todo tu historial financiero para tus registros personales.
        </p>
        <button
          type="button"
          onClick={handleExportCSV}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/90 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
        >
          <IoDownloadOutline size={15} />
          <span>Exportar a CSV</span>
        </button>
      </div>

      {/* 8. INFORMACIÓN DE LA APP */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="font-medium">Versión de InvenEasy</span>
          <span className="font-bold text-slate-800 dark:text-slate-200">v0.5.0</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="font-medium">Identificador</span>
          <span className="font-mono text-[11px] text-slate-400">com.founders.inveneasy</span>
        </div>
      </div>

      {/* 9. CERRAR SESIÓN */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-50 border border-rose-200/80 py-3.5 text-xs font-bold text-rose-600 shadow-xs transition hover:bg-rose-100 active:scale-98 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400"
        >
          <IoLogOutOutline size={17} />
          <span>Cerrar sesión en este dispositivo</span>
        </button>
      </div>
    </div>
  )
}
