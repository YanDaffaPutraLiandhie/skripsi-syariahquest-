import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Menggunakan createBrowserClient agar tiket login otomatis disimpan di Cookies (bukan LocalStorage)
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)