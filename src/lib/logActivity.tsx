// lib/logActivity.ts  (menggantikan logActivity.tsx; tidak ada JSX, jadi cukup .ts)
//
// jenis_aktivitas sebaiknya salah satu dari:
//   'Login' | 'Logout' | 'Create' | 'Read' | 'Update' | 'Delete' | 'Error'
// (itu yang dikenali filter & badge di halaman Log Activity admin).
// Detail aksi taruh di `keterangan`, mis.:
//   logActivity({ fitur: "Modul", jenis_aktivitas: "Update",
//                 keterangan: 'Menonaktifkan modul "Akad Murabahah"' })
import { supabase } from "@/lib/supabase";

export type JenisAktivitas =
  | "Login"
  | "Logout"
  | "Create"
  | "Read"
  | "Update"
  | "Delete"
  | "Error";

type LogActivityParams = {
  fitur: string;
  jenis_aktivitas: JenisAktivitas;
  keterangan?: string;
  status?: "Sukses" | "Error";
};

/** Mengembalikan true jika log tersimpan. Tidak pernah melempar error. */
export async function logActivity({
  fitur,
  jenis_aktivitas,
  keterangan,
  status = "Sukses",
}: LogActivityParams): Promise<boolean> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) return false;

    const response = await fetch("/api/log-activity", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        fitur,
        jenis_aktivitas,
        keterangan: keterangan || null,
        status,
      }),
    });

    if (!response.ok) {
      console.error("LOG ACTIVITY ERROR:", response.status, await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error("LOG ACTIVITY EXCEPTION:", error instanceof Error ? error.message : error);
    return false;
  }
}