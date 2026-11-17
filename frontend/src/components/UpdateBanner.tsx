import { useEffect, useState } from 'react'
import { IoCloudDownloadOutline as DownloadIcon, IoCloseSharp as CloseIcon } from 'react-icons/io5'
import { checkForUpdate, APP_VERSION, type RemoteVersion } from '../services/updater'

/**
 * Banner que aparece en la parte superior de la app cuando hay una nueva versión
 * publicada en GitHub. No bloquea el uso de la app (a menos que mandatory = true).
 */
export default function UpdateBanner() {
  const [update, setUpdate] = useState<RemoteVersion | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Verificar al montar (startup)
    runCheck()

    // Re-verificar cada 30 minutos mientras la app esté abierta
    const interval = setInterval(runCheck, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const runCheck = async () => {
    const info = await checkForUpdate()
    if (info) {
      setUpdate(info)
      setDismissed(false)
    }
  }

  // Si no hay actualización o fue descartada (y no es obligatoria), no renderizar
  if (!update) return null
  if (dismissed && !update.mandatory) return null

  const handleUpdate = () => {
    // Redirige a la release page en GitHub para descargar el nuevo APK
    const releasesUrl = `https://github.com/alekdr/app-inveneasy/releases/latest`
    window.open(releasesUrl, '_blank')
  }

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[100] px-4 py-3 shadow-lg flex items-start gap-3 ${
        update.mandatory
          ? 'bg-rose-600 text-white'
          : 'bg-violet-600 text-white'
      }`}
    >
      <DownloadIcon size={20} className="mt-0.5 shrink-0" />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold leading-tight">
          {update.mandatory ? '⚠️ Actualización obligatoria' : '✨ Nueva versión disponible'}
        </p>
        <p className="text-xs opacity-85 mt-0.5">
          v{update.version} · {update.changelog}
        </p>
        <p className="text-[10px] opacity-60 mt-0.5">Tu versión actual: v{APP_VERSION}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleUpdate}
          className="rounded-xl bg-white/20 hover:bg-white/30 px-3 py-1.5 text-xs font-bold transition active:scale-95"
        >
          Actualizar
        </button>
        {!update.mandatory && (
          <button
            onClick={() => setDismissed(true)}
            className="rounded-xl p-1.5 text-white/70 hover:bg-white/20 transition"
            title="Descartar"
          >
            <CloseIcon size={16} />
          </button>
        )}
      </div>
    </div>
  )
}
