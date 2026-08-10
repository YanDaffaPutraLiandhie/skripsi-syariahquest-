import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export type ProgressModul = {
  id_modul: number;
  nilai: number;
  tanggal_selesai: string;
};

export function useProgressModul(idMahasiswa?: number | null) {
  const [progress, setProgress] = useState<ProgressModul[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchProgress() {
      if (!idMahasiswa) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);

      const { data, error } = await supabase
        .from('progress_modul')
        .select('id_modul, nilai, tanggal_selesai')
        .eq('id_mahasiswa', idMahasiswa)
        .eq('selesai', true)
        .order('tanggal_selesai', { ascending: true }) // Urut dari terlama ke terbaru (kiri ke kanan di grafik)
        .limit(5); // Ambil 5 terakhir biar grafik gak kepanjangan

      if (error) {
        console.error("Gagal fetch progress modul:", error);
      } else if (data) {
        setProgress(data);
      }

      setIsLoading(false);
    }

    fetchProgress();
  }, [idMahasiswa]);

  return { progress, isLoading };
}