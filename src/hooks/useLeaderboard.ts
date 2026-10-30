import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export type LeaderboardEntry = {
  id_mahasiswa: number;
  nama_mahasiswa: string;
  total_xp: number;
  rank: number;
  avatar_url?: string;
  elo?: number;
};

export function useLeaderboard(currentMahasiswaId?: number | null) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myRankInfo, setMyRankInfo] = useState<{ rank: number; total_xp: number } | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Ambil top pemain berdasarkan total_xp aktual di Supabase
      const { data, error: fetchErr } = await supabase
        .from('mahasiswa')
        .select('id_mahasiswa, nama_mahasiswa, total_xp, avatar_url, elo')
        .order('total_xp', { ascending: false })
        .limit(20);

      if (fetchErr) {
        console.error("Gagal fetch leaderboard:", fetchErr);
        setError("Gagal memuat data peringkat. Silakan periksa koneksi atau coba lagi.");
        setLeaderboard([]);
      } else if (data) {
        const formatted: LeaderboardEntry[] = data.map((item, index) => ({
          id_mahasiswa: item.id_mahasiswa,
          nama_mahasiswa: item.nama_mahasiswa || 'Pemain Tanpa Nama',
          total_xp: Number(item.total_xp || 0),
          rank: index + 1,
          avatar_url: item.avatar_url,
          elo: Number(item.elo || 1000),
        }));
        setLeaderboard(formatted);

        // 2. Hitung posisi pemain yang sedang login jika id_mahasiswa tersedia
        if (currentMahasiswaId) {
          const foundInTop = formatted.find((p) => p.id_mahasiswa === currentMahasiswaId);
          if (foundInTop) {
            setMyRankInfo({ rank: foundInTop.rank, total_xp: foundInTop.total_xp });
          } else {
            // Pemain di luar top list, hitung rank absolutnya via count
            const { data: myData } = await supabase
              .from('mahasiswa')
              .select('total_xp')
              .eq('id_mahasiswa', currentMahasiswaId)
              .maybeSingle();

            const myXp = Number(myData?.total_xp || 0);

            const { count } = await supabase
              .from('mahasiswa')
              .select('id_mahasiswa', { count: 'exact', head: true })
              .gt('total_xp', myXp);

            setMyRankInfo({
              rank: (count ?? 0) + 1,
              total_xp: myXp,
            });
          }
        }
      } else {
        setLeaderboard([]);
      }
    } catch (err: any) {
      console.error("Error tidak terduga di leaderboard:", err);
      setError("Terjadi kesalahan sistem saat memuat papan peringkat.");
      setLeaderboard([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentMahasiswaId]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return { leaderboard, isLoading, error, refetch: fetchLeaderboard, myRankInfo };
}