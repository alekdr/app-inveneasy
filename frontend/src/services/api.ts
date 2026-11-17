import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor para añadir token de Supabase a las requests
api.interceptors.request.use(async (config) => {
  // TODO: obtener token de Supabase auth y añadirlo
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
