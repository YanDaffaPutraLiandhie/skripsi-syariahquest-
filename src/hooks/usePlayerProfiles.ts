import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export type PlayerProfile = {
  idMahasiswa: number; // <-- TAMBAHAN BARU
  namaMahasiswa: string;
  avatarUrl: string | null;
};

export const usePlayerProfiles = (userIds: string[]) => {
  const [profiles, setProfiles] = useState<Record<string, PlayerProfile>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfiles = async () => {
      const validUserIds = userIds.filter(id => Boolean(id));
      if (validUserIds.length === 0) {
        setProfiles({});
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Ambil relasi auth_user_id ke id_mahasiswa
        const { data: userData, error: userError } = await supabase
          .from('user')
          .select('auth_user_id, id_mahasiswa')
          .in('auth_user_id', validUserIds)
          .not('id_mahasiswa', 'is', null);

        if (userError) throw userError;
        if (!userData || userData.length === 0) {
          setIsLoading(false);
          return;
        }

        const idMahasiswas = userData.map(u => u.id_mahasiswa);

        // Ambil data asli mahasiswa
        const { data: mhsData, error: mhsError } = await supabase
          .from('mahasiswa')
          .select('id_mahasiswa, nama_mahasiswa, avatar_url')
          .in('id_mahasiswa', idMahasiswas);

        if (mhsError) throw mhsError;

        // Gabungkan data
        const profileMap: Record<string, PlayerProfile> = {};
        userData.forEach(u => {
          const mhs = mhsData?.find(m => m.id_mahasiswa === u.id_mahasiswa);
          if (mhs) {
            profileMap[u.auth_user_id] = {
              idMahasiswa: mhs.id_mahasiswa, // <-- SEKARANG ID MAHASISWA DISIMPAN
              namaMahasiswa: mhs.nama_mahasiswa || 'Pemain',
              avatarUrl: mhs.avatar_url || null,
            };
          }
        });

        setProfiles(profileMap);
      } catch (error) {
        console.error("Error fetching player profiles:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfiles();
  }, [JSON.stringify(userIds)]); 

  return { profiles, isLoading };
};