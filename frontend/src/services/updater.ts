// Servicio de control de versiones (OTA updates vía GitHub)
// Compara la versión local con la publicada en el repo y notifica al usuario.

/** Versión embebida en el bundle actual (coincide con public/version.json en el momento del build) */
export const APP_VERSION = '1.0.0'
export const APP_BUILD   = 1

/** URL raw del version.json en la rama main del repo público/privado */
const VERSION_URL =
  'https://raw.githubusercontent.com/alekdr/app-inveneasy/main/frontend/public/version.json'

export interface RemoteVersion {
  version: string
  build: number
  changelog: string
  releaseDate: string
  mandatory: boolean
}

/** Compara semver: devuelve true si remota > local */
export function isNewer(remote: string, local: string): boolean {
  const parse = (v: string) => v.split('.').map(Number)
  const [rMaj, rMin, rPat] = parse(remote)
  const [lMaj, lMin, lPat] = parse(local)
  if (rMaj !== lMaj) return rMaj > lMaj
  if (rMin !== lMin) return rMin > lMin
  return rPat > lPat
}

/** Obtiene la versión remota desde GitHub. Lanza error si falla. */
export async function fetchRemoteVersion(): Promise<RemoteVersion | null> {
  try {
    const res = await fetch(`${VERSION_URL}?t=${Date.now()}`, {
      cache: 'no-store',
    })
    if (!res.ok) return null
    return (await res.json()) as RemoteVersion
  } catch {
    return null // offline o sin conexión – silencioso
  }
}

/** Devuelve la info de la nueva versión si hay una más reciente, o null si está al día */
export async function checkForUpdate(): Promise<RemoteVersion | null> {
  const remote = await fetchRemoteVersion()
  if (!remote) return null
  if (isNewer(remote.version, APP_VERSION) || remote.build > APP_BUILD) {
    return remote
  }
  return null
}
