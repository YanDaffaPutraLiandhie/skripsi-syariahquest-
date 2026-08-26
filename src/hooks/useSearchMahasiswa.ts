import { useState } from "react";
import { supabase } from "@/lib/supabase";

export type MahasiswaSearchItem = {
  id_user: string; // auth_user_id
  id_mahasiswa: number;
  nama_mahasiswa: string;
  avatar_url: string | null;
  inRoom: boolean; // BARU: status global, true = sedang di room manapun
};

export function useSearchMahasiswa() {
  const [results, setResults] = useState<MahasiswaSearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchMahasiswa = async (keyword: string) => {
    if (!keyword || keyword.trim() === "") {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Cari di tabel mahasiswa berdasarkan nama (case-insensitive)
      const { data, error } = await supabase
        .from("mahasiswa")
        .select(`
          id_mahasiswa, 
          nama_mahasiswa, 
          avatar_url,
          "inRoom",
          user!inner(auth_user_id)
        `)
        .ilike("nama_mahasiswa", `%${keyword}%`)
        .limit(10); // Batasi 10 orang biar nggak berat

      if (error) throw error;

      if (data) {
        const formatted = data.map((item: any) => {
          // Bumbu penyedap: Cek apakah Supabase balikin Array atau Object
          const authUserId = Array.isArray(item.user) 
            ? item.user[0]?.auth_user_id 
            : item.user?.auth_user_id;

          return {
            id_user: authUserId, // Sekarang dijamin nggak undefined!
            id_mahasiswa: item.id_mahasiswa,
            nama_mahasiswa: item.nama_mahasiswa,
            avatar_url: item.avatar_url,
            inRoom: item.inRoom ?? false, // BARU
          };
        });
        setResults(formatted);
      }
    } catch (err) {
      console.error("Gagal mencari mahasiswa:", err);
    } finally {
      setIsSearching(false);
    }
  };

  return { results, isSearching, searchMahasiswa, setResults };
}