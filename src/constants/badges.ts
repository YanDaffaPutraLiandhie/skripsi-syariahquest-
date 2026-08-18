import { supabase } from "@/lib/supabase";

export type EarnedBadge = {
  nama_badge: string;
  icon_url: string;
};

/**
 * Dipanggil setiap kali mahasiswa SELESAI mengerjakan kuis (lulus atau
 * tidak -- fungsi ini aman dipanggil kapan saja, karena dia cuma
 * MENGHITUNG ULANG status terkini, bukan menambah progress).
 *
 * Ngecek 3 jenis syarat badge modul sekaligus:
 * - jumlah_modul  -> total modul yang sudah "selesai" (progress_modul.selesai = true)
 *                    >= nilai_syarat
 * - level_modul   -> minimal 1 modul di level tsb (modul.id_level = nilai_syarat)
 *                    sudah "selesai"
 * - semua_modul   -> jumlah modul selesai == total seluruh modul yang ada di sistem
 *
 * Balikin array badge yang BARU SAJA didapat (buat ditampilkan sebagai
 * popup "Badge Baru!"). Kalau badge-nya udah pernah didapat sebelumnya,
 * tidak akan muncul lagi di sini (berkat ignoreDuplicates + cek .length).
 */
export async function checkAndAwardModulBadges(
  idMahasiswa: number
): Promise<EarnedBadge[]> {
  const newlyEarned: EarnedBadge[] = [];

  // 1. Ambil semua modul yang sudah "selesai" oleh mahasiswa ini
  const { data: completedRows, error: completedError } = await supabase
    .from("progress_modul")
    .select("id_modul")
    .eq("id_mahasiswa", idMahasiswa)
    .eq("selesai", true);

  if (completedError) {
    console.error("Gagal ambil progress_modul:", completedError);
    return newlyEarned;
  }

  const completedModulIds = (completedRows ?? []).map((r) => r.id_modul);
  const completedCount = completedModulIds.length;

  // 2. Ambil level dari tiap modul yang sudah selesai (buat cek badge level_modul)
  let completedLevels = new Set<number>();
  if (completedModulIds.length > 0) {
    const { data: modulRows, error: modulError } = await supabase
      .from("modul")
      .select("id_modul, id_level")
      .in("id_modul", completedModulIds);

    if (modulError) {
      console.error("Gagal ambil data level modul:", modulError);
    } else {
      completedLevels = new Set(
        (modulRows ?? [])
          .map((m) => m.id_level)
          .filter((lvl): lvl is number => lvl !== null)
      );
    }
  }

  // 3. Total seluruh modul yang ada di sistem (buat cek badge semua_modul)
  const { count: totalModulCount, error: totalError } = await supabase
    .from("modul")
    .select("id_modul", { count: "exact", head: true });

  if (totalError) {
    console.error("Gagal hitung total modul:", totalError);
  }

  // 4. Ambil semua badge yang jenis syaratnya terkait modul
  const { data: relevantBadges, error: badgeError } = await supabase
    .from("badges")
    .select("id_badge, nama_badge, icon_url, jenis_syarat, nilai_syarat")
    .in("jenis_syarat", ["jumlah_modul", "level_modul", "semua_modul"]);

  if (badgeError || !relevantBadges) {
    console.error("Gagal ambil daftar badge:", badgeError);
    return newlyEarned;
  }

  // 5. Cek satu-satu, mana yang syaratnya sudah kepenuhi
  for (const badge of relevantBadges) {
    let isEligible = false;

    if (badge.jenis_syarat === "jumlah_modul") {
      isEligible = completedCount >= (badge.nilai_syarat ?? Infinity);
    } else if (badge.jenis_syarat === "level_modul") {
      isEligible =
        badge.nilai_syarat !== null && completedLevels.has(badge.nilai_syarat);
    } else if (badge.jenis_syarat === "semua_modul") {
      isEligible =
        !!totalModulCount &&
        totalModulCount > 0 &&
        completedCount >= totalModulCount;
    }

    if (!isEligible) continue;

    // 6. Upsert -- kalau udah pernah dapat, ignoreDuplicates bikin tidak
    //    insert ulang, dan .select() balikin array KOSONG (bukan error).
    const { data, error } = await supabase
      .from("mahasiswa_badges")
      .upsert(
        { id_mahasiswa: idMahasiswa, id_badge: badge.id_badge },
        { onConflict: "id_mahasiswa,id_badge", ignoreDuplicates: true }
      )
      .select();

    if (error) {
      console.error(`Gagal kasih badge "${badge.nama_badge}":`, error);
      continue;
    }

    // data.length > 0 artinya BARU SAJA di-insert (bukan udah ada sebelumnya)
    if (data && data.length > 0) {
      newlyEarned.push({
        nama_badge: badge.nama_badge,
        icon_url: badge.icon_url,
      });
    }
  }

  return newlyEarned;
}