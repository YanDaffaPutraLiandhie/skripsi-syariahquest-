"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export type CurrentUserProfile = {
  authUserId: string;
  idMahasiswa: number | null;
  idDosen: number | null;
  role: "mahasiswa" | "dosen" | "admin" | "unknown";
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
 * Ambil profil user yang SEDANG LOGIN.
 * Hook ini aman untuk Mahasiswa, Dosen, dan Admin.
 * Jika user bukan Mahasiswa, tidak akan memanggil query mahasiswa yang gagal.
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
      setProfile(null);
      setIsLoading(false);
      return;
    }

  const { data: userRow, error: userError } = await supabase
  .from("user")
  .select("id_mahasiswa, id_dosen, id_admin")
  .eq("auth_user_id", user.id)
  .single();

    if (userError) {
      console.error("Gagal membaca data user login:", userError);
      setProfile(null);
      setIsLoading(false);
      return;
    }

    if (!userRow) {
      setProfile(null);
      setIsLoading(false);
      return;
    }
if (userError) {
  console.error("Gagal mengambil data user:", userError);
  setProfile(null);
  setIsLoading(false);
  return;
}

// Hook ini khusus untuk mahasiswa.
// Jika yang login Admin atau Dosen, tidak perlu mengambil profil mahasiswa.
if (!userRow?.id_mahasiswa) {
  setProfile(null);
  setIsLoading(false);
  return;
}

    if (userRow.id_mahasiswa) {
      const { data: mhs, error: mhsError } = await supabase
        .from("mahasiswa")
        .select(
          'id_mahasiswa, nama_mahasiswa, deskripsi, avatar_url, total_xp, "Nilai", modul_selesai, total_poin'
        )
        .eq("id_mahasiswa", userRow.id_mahasiswa)
        .single();

      if (mhsError || !mhs) {
        console.error("Gagal fetch data mahasiswa:", mhsError);
        setProfile(null);
        setIsLoading(false);
        return;
      }

      const { count } = await supabase
        .from("mahasiswa")
        .select("id_mahasiswa", { count: "exact", head: true })
        .gt("total_xp", mhs.total_xp ?? 0);

      setProfile({
        authUserId: user.id,
        idMahasiswa: mhs.id_mahasiswa,
        idDosen: null,
        role: "mahasiswa",
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
      return;
    }

    if (userRow.id_dosen) {
      const { data: dosen, error: dosenError } = await supabase
        .from("dosen")
        .select("id_dosen, nama_dosen")
        .eq("id_dosen", userRow.id_dosen)
        .maybeSingle();

      if (dosenError) {
        console.error("Gagal fetch data dosen:", dosenError);
      }

      setProfile({
        authUserId: user.id,
        idMahasiswa: null,
        idDosen: userRow.id_dosen,
        role: "dosen",
        namaMahasiswa: dosen?.nama_dosen ?? "Dosen",
        deskripsi: null,
        avatarUrl: null,
        totalXp: 0,
        nilai: 0,
        modulSelesai: 0,
        totalPoin: 0,
        peringkat: 0,
      });
      setIsLoading(false);
      return;
    }

    if (userRow.id_admin) {
      setProfile({
        authUserId: user.id,
        idMahasiswa: null,
        idDosen: null,
        role: "admin",
        namaMahasiswa: "Admin",
        deskripsi: null,
        avatarUrl: null,
        totalXp: 0,
        nilai: 0,
        modulSelesai: 0,
        totalPoin: 0,
        peringkat: 0,
      });
      setIsLoading(false);
      return;
    }

    setProfile(null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { profile, isLoading, refetch: fetchProfile };
}