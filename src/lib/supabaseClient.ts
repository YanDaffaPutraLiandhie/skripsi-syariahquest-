import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validasi Supabase URL
if (!supabaseUrl) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL tidak ditemukan"
  );
}

// Validasi Publishable Key
if (!supabasePublishableKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY tidak ditemukan"
  );
}

// Validasi Service Role Key
if (!supabaseServiceRoleKey) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY tidak ditemukan"
  );
}

// ========================================
// CLIENT SUPABASE BIASA
// Digunakan di halaman / component
// ========================================
export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey
);

// ========================================
// CLIENT SUPABASE ADMIN
// Digunakan di API Route / Server
// ========================================
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

export default supabase;