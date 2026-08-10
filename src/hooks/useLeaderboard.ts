import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export type LeaderboardEntry = {
  id_mahasiswa: number;
  nama_mahasiswa: string;
  total_xp: number;
  rank: number;
};

export function useLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      setIsLoading(true);
      
      try {
        const { data, error } = await supabase
          .from('mahasiswa')
          .select('id_mahasiswa, nama_mahasiswa, total_xp')
          .order('total_xp', { ascending: false })
          .limit(10); // Menampilkan maksimal 10 pemain

        if (error) {
          console.error("Gagal fetch leaderboard:", error);
          setLeaderboard([]); // Pastikan state di-reset kalau error
        } else if (data) {
          const formatted = data.map((item, index) => ({
            id_mahasiswa: item.id_mahasiswa,
            nama_mahasiswa: item.nama_mahasiswa || 'Pemain Tanpa Nama',
            total_xp: item.total_xp || 0,
            rank: index + 1
          }));
          setLeaderboard(formatted);
        } else {
           setLeaderboard([]);
        }
      } catch (err) {
        console.error("Error tidak terduga di leaderboard:", err);
      } finally {
        setIsLoading(false); // Memastikan loading PASTI berhenti
      }
    }

    fetchLeaderboard();
  }, []);

  return { leaderboard, isLoading };
}