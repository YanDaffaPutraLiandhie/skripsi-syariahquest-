"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export type CurrentUserProfile = {
  authUserId: string;
  idMahasiswa: number | null;
  idDosen: number | null;
  idAdmin: number | null;
  role: "mahasiswa" | "dosen" | "admin" | "unknown";
  namaMahasiswa: string; // dipakai sebagai nama tampilan untuk semua role
  deskripsi: string | null;
  avatarUrl: string | null;
  totalXp: number;
  nilai: number;
  modulSelesai: number;
  totalPoin: number;
  peringkat: number;

  // khusus dosen
  email: string | null;
  modul: number | null;
  riwayatPendidikan: string | null;

  // khusus admin
  username: string | null;
  lokasi: string | null;
};

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

    if (userError || !userRow) {
      console.error("Gagal membaca data user login:", userError);
      setProfile(null);
      setIsLoading(false);
      return;
    }

    // ---------- MAHASISWA ----------
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
        idAdmin: null,
        role: "mahasiswa",
        namaMahasiswa: mhs.nama_mahasiswa,
        deskripsi: mhs.deskripsi,
        avatarUrl: mhs.avatar_url,
        totalXp: mhs.total_xp ?? 0,
        nilai: mhs.Nilai ?? 0,
        modulSelesai: mhs.modul_selesai ?? 0,
        totalPoin: mhs.total_poin ?? 0,
        peringkat: (count ?? 0) + 1,
        email: null,
        modul: null,
        riwayatPendidikan: null,
        username: null,
        lokasi: null,
      });
      setIsLoading(false);
      return;
    }

    // ---------- DOSEN ----------
    if (userRow.id_dosen) {
      const { data: dosen, error: dosenError } = await supabase
        .from("dosen")
        .select("id_dosen, nama_dosen, email, modul, riwayat_pendidikan")
        .eq("id_dosen", userRow.id_dosen)
        .maybeSingle();

      if (dosenError) {
        console.error("Gagal fetch data dosen:", dosenError);
      }

      setProfile({
        authUserId: user.id,
        idMahasiswa: null,
        idDosen: userRow.id_dosen,
        idAdmin: null,
        role: "dosen",
        namaMahasiswa: dosen?.nama_dosen ?? "Dosen",
        deskripsi: null,
        avatarUrl: null,
        totalXp: 0,
        nilai: 0,
        modulSelesai: 0,
        totalPoin: 0,
        peringkat: 0,
        email: dosen?.email ?? null,
        modul: dosen?.modul ?? null,
        riwayatPendidikan: dosen?.riwayat_pendidikan ?? null,
        username: null,
        lokasi: null,
      });
      setIsLoading(false);
      return;
    }

    // ---------- ADMIN ----------
    if (userRow.id_admin) {
      const { data: admin, error: adminError } = await supabase
        .from("admin")
        .select("id_admin, nama_admin, username, avatar_url, lokasi")
        .eq("id_admin", userRow.id_admin)
        .maybeSingle();

      if (adminError) {
        console.error("Gagal fetch data admin:", adminError);
      }

      setProfile({
        authUserId: user.id,
        idMahasiswa: null,
        idDosen: null,
        idAdmin: userRow.id_admin,
        role: "admin",
        namaMahasiswa: admin?.nama_admin ?? "Admin",
        deskripsi: null,
        avatarUrl: admin?.avatar_url ?? null,
        totalXp: 0,
        nilai: 0,
        modulSelesai: 0,
        totalPoin: 0,
        peringkat: 0,
        email: null,
        modul: null,
        riwayatPendidikan: null,
        username: admin?.username ?? null,
        lokasi: admin?.lokasi ?? null,
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