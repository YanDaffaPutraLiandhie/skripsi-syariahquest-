"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export type CurrentUserProfile = {
  authUserId: string;
  idMahasiswa: number;
  namaMahasiswa: string;
  deskripsi: string | null;
  avatarUrl: string | null;
  totalXp: number;
  nilai: number;
  modulSelesai: number;
  totalPoin: number;
  peringkat: number;
};

/**
 * Ambil profil user yang SEDANG LOGIN. Alurnya:
 * auth.users -> table "user" (cari id_mahasiswa lewat auth_user_id)
 * -> table "mahasiswa" (semua kolom profil)
 * -> hitung peringkat berdasarkan total_xp dibanding semua mahasiswa lain.
 */
export function useCurrentUser() {
  const [profile, setProfile] = useState<CurrentUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setIsLoading(false);
      return;
    }

    const { data: userRow, error: userError } = await supabase
      .from("user")
      .select("id_mahasiswa")
      .eq("auth_user_id", user.id)
      .single();

    if (userError || !userRow?.id_mahasiswa) {
      console.error("Gagal menemukan data mahasiswa untuk user ini:", userError);
      setIsLoading(false);
      return;
    }

    const { data: mhs, error: mhsError } = await supabase
      .from("mahasiswa")
      .select(
        'id_mahasiswa, nama_mahasiswa, deskripsi, avatar_url, total_xp, "Nilai", modul_selesai, total_poin'
      )
      .eq("id_mahasiswa", userRow.id_mahasiswa)
      .single();

    if (mhsError || !mhs) {
      console.error("Gagal fetch data mahasiswa:", mhsError);
      setIsLoading(false);
      return;
    }

    // Peringkat: hitung berapa mahasiswa yang total_xp-nya LEBIH TINGGI,
    // +1 itulah peringkat mahasiswa ini.
    const { count } = await supabase
      .from("mahasiswa")
      .select("id_mahasiswa", { count: "exact", head: true })
      .gt("total_xp", mhs.total_xp ?? 0);

    setProfile({
      authUserId: user.id,
      idMahasiswa: mhs.id_mahasiswa,
      namaMahasiswa: mhs.nama_mahasiswa,
      deskripsi: mhs.deskripsi,
      avatarUrl: mhs.avatar_url,
      totalXp: mhs.total_xp ?? 0,
      nilai: mhs.Nilai ?? 0,
      modulSelesai: mhs.modul_selesai ?? 0,
      totalPoin: mhs.total_poin ?? 0,
      peringkat: (count ?? 0) + 1,
    });
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { profile, isLoading, refetch: fetchProfile };
}