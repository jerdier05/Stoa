import { createClient } from '@supabase/supabase-js'

// Vite expone las variables que empiezan por VITE_ desde el archivo .env
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const configured = Boolean(url && key)
export const supabase = configured ? createClient(url, key) : null
