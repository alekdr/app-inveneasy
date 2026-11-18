import axios from 'axios'
import { supabase } from './supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor para añadir token de Supabase a las requests
api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/**
 * Sube una imagen al backend → Cloudinary
 */
export async function uploadImage(file: File): Promise<{
  image_url: string
  public_id: string
}> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await api.post('/api/upload-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

/**
 * Elimina una imagen de Cloudinary
 */
export async function deleteImage(publicId: string) {
  const response = await api.delete(`/api/delete-image/${publicId}`)
  return response.data
}

/**
 * Traduce el error real de una subida de imagen a un mensaje claro.
 * Antes se mostraba "Cloudinary la rechazó" para CUALQUIER fallo (red, CORS, tamaño...),
 * lo que confundía la depuración.
 */
export function getUploadErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (err.response) {
      const detail = (err.response.data as { detail?: string } | undefined)?.detail
      return `No se pudo subir la foto: ${detail || `error ${err.response.status}`}`
    }
    if (err.code === 'ECONNABORTED') {
      return 'La subida tardó demasiado (timeout). Revisa tu conexión.'
    }
    return 'No se pudo conectar con el servidor. ¿Está encendido el backend y es alcanzable desde este dispositivo?'
  }
  return 'No se pudo subir la foto a Cloudinary'
}
