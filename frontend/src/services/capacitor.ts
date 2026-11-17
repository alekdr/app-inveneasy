import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { LocalNotifications } from '@capacitor/local-notifications'

/**
 * Toma una foto usando la cámara nativa o la galería del dispositivo móvil
 */
export async function takePhoto(): Promise<{ base64?: string; dataUrl?: string; blob?: Blob }> {
  try {
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Prompt, // Pregunta si Cámara o Galería
      quality: 85,
      allowEditing: false,
    })

    if (photo.dataUrl) {
      // Convertir dataUrl a Blob para upload fácil
      const res = await fetch(photo.dataUrl)
      const blob = await res.blob()
      return { dataUrl: photo.dataUrl, blob }
    }
    return {}
  } catch (error) {
    console.warn('Operación de cámara cancelada o no soportada:', error)
    return {}
  }
}

/**
 * Vibración háptica nativa al completar hábitos o rutinas
 */
export async function triggerHaptic(style: ImpactStyle = ImpactStyle.Medium) {
  try {
    await Haptics.impact({ style })
  } catch {
    // Si no es un dispositivo móvil, silenciar
  }
}

/**
 * Programa una notificación local para una rutina o hábito
 */
export async function scheduleRoutineNotification(
  id: number,
  title: string,
  body: string,
  hour: number,
  minute: number
) {
  try {
    const permission = await LocalNotifications.requestPermissions()
    if (permission.display === 'granted') {
      await LocalNotifications.schedule({
        notifications: [
          {
            id,
            title,
            body,
            schedule: {
              on: { hour, minute },
              repeats: true,
            },
          },
        ],
      })
    }
  } catch (err) {
    console.warn('Notificaciones locales no soportadas en este entorno:', err)
  }
}
