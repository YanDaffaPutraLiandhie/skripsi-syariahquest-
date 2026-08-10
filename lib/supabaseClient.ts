import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

console.log("SUPABASE_URL:", url);
console.log("SUPABASE_KEY:", key);

if (!url) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL tidak ditemukan");
}

if (!key) {
  throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY tidak ditemukan");
}

export const supabase = createClient(url, key);