import { createClient } from '@supabase/supabase-js'

// Agregar estas variables en el archivo .env de la raíz del proyecto:
// VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
// VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Faltan variables de entorno de Supabase. Revisar el archivo .env')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Referencia a storage para subir imágenes
export const storage = supabase.storage

// Nombres de los buckets (crear en Supabase Dashboard > Storage)
export const BUCKETS = {
  MENU_IMAGES: 'menu-images',
  RESTAURANT_LOGOS: 'restaurant-logos',
}

// Helper para obtener URL pública de una imagen
export function getPublicUrl(bucket, path) {
  if (!path) return null
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data?.publicUrl ?? null
}
