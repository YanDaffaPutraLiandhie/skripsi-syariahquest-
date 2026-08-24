import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export type LeaderboardEntry = {
  id_mahasiswa: number;
  nama_mahasiswa: string;
  total_xp: number;
  rank: number;
  avatar_url?: string; // BARU: Tambahan untuk nyimpen foto profil
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
          // BARU: select avatar_url juga
          .select('id_mahasiswa, nama_mahasiswa, total_xp, avatar_url')
          .order('total_xp', { ascending: false })
          .limit(10); 

        if (error) {
          console.error("Gagal fetch leaderboard:", error);
          setLeaderboard([]); 
        } else if (data) {
          const formatted = data.map((item, index) => ({
            id_mahasiswa: item.id_mahasiswa,
            nama_mahasiswa: item.nama_mahasiswa || 'Pemain Tanpa Nama',
            total_xp: item.total_xp || 0,
            rank: index + 1,
            avatar_url: item.avatar_url
          }));
          setLeaderboard(formatted);
        } else {
           setLeaderboard([]);
        }
      } catch (err) {
        console.error("Error tidak terduga di leaderboard:", err);
      } finally {
        setIsLoading(false); 
      }
    }

    fetchLeaderboard();
  }, []);

  return { leaderboard, isLoading };
}