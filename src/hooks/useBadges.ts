import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export type Badge = {
  id_badge: number;
  nama_badge: string;
  syarat: string;
  icon_url: string;
  jenis_syarat: string;
  nilai_syarat: number;
};

export type UserBadge = Badge & {
  diperoleh_pada: string;
};

export function useBadges(idMahasiswa?: number | null) {
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchBadges() {
      if (!idMahasiswa) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);

      // PERBAIKAN 1: Nama tabel aslinya pakai 's'
      const { data, error } = await supabase
        .from('mahasiswa_badges')
        .select(`
          diperoleh_pada,
          badges (
            id_badge,
            nama_badge,
            syarat,
            icon_url,
            jenis_syarat,
            nilai_syarat
          )
        `)
        .eq('id_mahasiswa', idMahasiswa);

      if (error) {
        console.error("Gagal fetch badge:", error.message, error.hint, error.details, error.code);
      } else if (data) {
        // PERBAIKAN 2: Karena nama tabel 'badges', kembalian join-nya ada di properti 'badges'
        const formattedBadges = data.map((item: any) => ({
          ...item.badges,
          diperoleh_pada: item.diperoleh_pada,
        }));
        
        // Kita filter sedikit buat jaga-jaga kalau ada relasi yang 'nyangkut' tapi badgenya udah dihapus
        const validBadges = formattedBadges.filter((b: any) => b && b.id_badge);
        setBadges(validBadges);
      }

      setIsLoading(false);
    }

    fetchBadges();
  }, [idMahasiswa]);

  return { badges, isLoading };
}