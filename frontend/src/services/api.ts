import axios from 'axios'
import { supabase } from './supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'djqfvbzsd'
const CLOUD_API_KEY = import.meta.env.VITE_CLOUDINARY_API_KEY || '523874164897117'
const CLOUD_API_SECRET = import.meta.env.VITE_CLOUDINARY_API_SECRET || 'vlBTMt3CKLKtc0-7w6c9nkLYbWs'

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor para añadir token de Supabase a las requests del backend
api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

async function sha1(str: string): Promise<string> {
  const buffer = new TextEncoder().encode(str)
  const hashBuffer = await crypto.subtle.digest('SHA-1', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Subida directa a Cloudinary mediante firma segura SHA-1.
 * Permite que la app móvil en Android funcione de forma autónoma sin depender
 * de tener una PC encendida con el backend local corriendo.
 */
async function uploadDirectToCloudinary(file: File | Blob): Promise<{
  image_url: string
  public_id: string
}> {
  if (!CLOUD_NAME || !CLOUD_API_KEY || !CLOUD_API_SECRET) {
    throw new Error('Faltan credenciales de Cloudinary')
  }

  const timestamp = Math.floor(Date.now() / 1000).toString()
  const folder = 'inveneasy'
  const toSign = `folder=${folder}&timestamp=${timestamp}${CLOUD_API_SECRET}`
  const signature = await sha1(toSign)

  const formData = new FormData()
  formData.append('file', file)
  formData.append('api_key', CLOUD_API_KEY)
  formData.append('timestamp', timestamp)
  formData.append('folder', folder)
  formData.append('signature', signature)

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error?.message || `Error Cloudinary (${res.status})`)
  }

  const data = await res.json()
  return {
    image_url: data.secure_url,
    public_id: data.public_id,
  }
}

/**
 * Eliminación directa de Cloudinary usando firma SHA-1.
 */
async function deleteDirectFromCloudinary(publicId: string): Promise<void> {
  if (!CLOUD_NAME || !CLOUD_API_KEY || !CLOUD_API_SECRET) return

  const timestamp = Math.floor(Date.now() / 1000).toString()
  const toSign = `public_id=${publicId}&timestamp=${timestamp}${CLOUD_API_SECRET}`
  const signature = await sha1(toSign)

  const formData = new FormData()
  formData.append('public_id', publicId)
  formData.append('api_key', CLOUD_API_KEY)
  formData.append('timestamp', timestamp)
  formData.append('signature', signature)

  await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`, {
    method: 'POST',
    body: formData,
  }).catch(() => {})
}

/**
 * Sube una imagen priorizando la subida directa a Cloudinary (ideal para Android APK).
 * Si falla, recurre como respaldo al backend local/remoto.
 */
export async function uploadImage(file: File | Blob): Promise<{
  image_url: string
  public_id: string
}> {
  try {
    return await uploadDirectToCloudinary(file)
  } catch (directErr) {
    console.warn('Subida directa a Cloudinary no disponible, intentando vía backend...', directErr)
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post('/api/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 15000,
    })
    return response.data
  }
}

/**
 * Elimina una imagen de Cloudinary
 */
export async function deleteImage(publicId: string) {
  try {
    await deleteDirectFromCloudinary(publicId)
  } catch {
    await api.delete(`/api/delete-image/${publicId}`).catch(() => {})
  }
}

/**
 * Traduce el error real de una subida de imagen a un mensaje claro.
 */
export function getUploadErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) {
    return `No se pudo subir la foto: ${err.message}`
  }
  if (axios.isAxiosError(err)) {
    if (err.response) {
      const detail = (err.response.data as { detail?: string } | undefined)?.detail
      return `No se pudo subir la foto: ${detail || `error ${err.response.status}`}`
    }
    if (err.code === 'ECONNABORTED') {
      return 'La subida tardó demasiado (timeout). Revisa tu conexión.'
    }
    return 'No se pudo conectar con el servidor ni con Cloudinary. Revisa tu conexión a internet.'
  }
  return 'No se pudo subir la foto a Cloudinary'
}
