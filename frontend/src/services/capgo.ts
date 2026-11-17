import { Capacitor } from '@capacitor/core'
import { CapacitorUpdater } from '@capgo/capacitor-updater'

/**
 * Inicializa el sistema de actualizaciones OTA con Capgo.
 * Debe ejecutarse al cargar la aplicación para confirmar que el bundle actual
 * es estable y prevenir rollbacks automáticos.
 */
export async function initCapgo() {
  if (!Capacitor.isNativePlatform()) {
    // En navegador web, Capgo no aplica updates nativos
    return
  }

  try {
    // 1. Notificar inmediatamente que la app arrancó sin errores
    // Si no se llama a notifyAppReady(), Capgo considerará fallido el bundle
    // y restaurará la versión anterior en el próximo reinicio.
    await CapacitorUpdater.notifyAppReady()
    console.log('✅ [Capgo OTA] notifyAppReady() ejecutado con éxito')

    // 2. Asegurar canal 'production'
    await CapacitorUpdater.setChannel({ channel: 'production' }).catch(() => {})

    // 3. Escuchar eventos de actualización
    CapacitorUpdater.addListener('updateAvailable', (info) => {
      console.log('📦 [Capgo OTA] Nueva actualización disponible:', info)
    })

    CapacitorUpdater.addListener('downloadComplete', (bundle) => {
      console.log('✨ [Capgo OTA] Actualización descargada con éxito. Se aplicará en el próximo reinicio.', bundle)
    })

    CapacitorUpdater.addListener('updateFailed', (err) => {
      console.warn('⚠️ [Capgo OTA] Error al aplicar actualización, conservando versión estable:', err)
    })
  } catch (err) {
    console.warn('⚠️ [Capgo OTA] No se pudo inicializar Capgo:', err)
  }
}
