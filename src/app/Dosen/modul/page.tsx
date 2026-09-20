"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/logActivity";
import { formatDeadline, isPastDeadline } from "@/lib/deadline";
import DosenContainer from "@/components/layout/DosenContainer";

type ModulCard = {
  id: number;
  title: string;
  xp: number;
  badge: string;
  badgeColor: string;
  thumbnailUrl: string;
  dibuat_oleh: string;
  status: boolean;
  deadline: string | null;
};

function ModulPembelajaranContent() {
  const router = useRouter();

  const [activeStates, setActiveStates] = useState<boolean[]>([]);
  const [modulCards, setModulCards] = useState<ModulCard[]>([]);
  const [loading, setLoading] = useState(true);

  // =========================================================
  // AMBIL DATA MODUL
  // =========================================================
  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from("modul")
          .select(`
            id_modul,
            nama_modul,
            thumbnail_url,
            id_level,
            status,
            dibuat_oleh,
            deadline,
            level!id_level (
              xp
            )
          `)
          .order("id_modul", { ascending: true });

        if (error) {
          console.error("Supabase Error:", error);
          return;
        }

        console.log("DATA MODUL:", data);

        if (!mounted) return;

        // ---------------------------------------------------------
        // AMBIL NAMA DOSEN (query terpisah, tidak mengubah query modul di atas)
        // dibuat_oleh di tabel modul menyimpan id_dosen, jadi perlu
        // dicocokkan ke nama_dosen di tabel dosen.
        // ---------------------------------------------------------
        const idDosenList = Array.from(
          new Set(
            (data ?? [])
              .map((item: any) => item.dibuat_oleh)
              .filter((id: any) => id !== null && id !== undefined)
          )
        );

        let namaDosenMap: Record<string, string> = {};

        if (idDosenList.length > 0) {
          const { data: dosenRows, error: dosenError } = await supabase
            .from("dosen")
            .select("id_dosen, nama_dosen")
            .in("id_dosen", idDosenList);

          if (dosenError) {
            console.error("Gagal mengambil nama dosen:", dosenError);
          } else {
            namaDosenMap = (dosenRows ?? []).reduce(
              (acc: Record<string, string>, row: any) => {
                acc[String(row.id_dosen)] = row.nama_dosen ?? "Admin";
                return acc;
              },
              {}
            );
          }
        }

        if (!mounted) return;

        const cards: ModulCard[] = (data ?? []).map((item: any) => {
          const idLevel = Number(item.id_level);

          const badge =
            idLevel === 1
              ? "E"
              : idLevel === 2
                ? "M"
                : "H";

          const badgeColor =
            idLevel === 1
              ? "bg-green-500"
              : idLevel === 2
                ? "bg-yellow-500"
                : "bg-red-500";

          return {
            id: Number(item.id_modul),
            title: item.nama_modul ?? "Modul Tanpa Nama",
            xp: Number(item.level?.xp ?? 0),
            badge,
            badgeColor,
            thumbnailUrl: item.thumbnail_url ?? "",
            dibuat_oleh:
              namaDosenMap[String(item.dibuat_oleh)] ?? "Admin",
            status: item.status !== false,
            deadline: item.deadline ?? null,
          };
        });

        setModulCards(cards);

        setActiveStates(
          cards.map((item) => item.status)
        );
      } catch (err) {
        console.error(
          "Terjadi kesalahan mengambil modul:",
          err
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  // =========================================================
  // AKTIF / NONAKTIFKAN MODUL
  // =========================================================
  const toggleActive = async (index: number) => {
    const card = modulCards[index];

    if (!card) return;

    const currentActive =
      activeStates[index] ?? true;

    const newActive = !currentActive;

    // ---------------------------------------------------------
    // UPDATE STATUS MODUL
    // ---------------------------------------------------------
    const { error } = await supabase
      .from("modul")
      .update({
        status: newActive,
      })
      .eq("id_modul", card.id);

    if (error) {
      console.error(
        "Supabase update error:",
        error
      );

      alert(
        `Gagal mengubah status modul: ${error.message}`
      );

      return;
    }

    // ---------------------------------------------------------
    // AMBIL USER LOGIN
    // ---------------------------------------------------------
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await logActivity({
          fitur: "Modul",
          jenis_aktivitas: newActive
            ? "Aktifkan Modul"
            : "Nonaktifkan Modul",
          keterangan: `${newActive
              ? "Mengaktifkan"
              : "Menonaktifkan"
            } modul "${card.title}"`,
        });
      }
    } catch (logError) {
      console.error(
        "Gagal mencatat aktivitas:",
        logError
      );
    }

    // ---------------------------------------------------------
    // UPDATE STATE
    // ---------------------------------------------------------
    setActiveStates((prev) =>
      prev.map((item, i) =>
        i === index ? newActive : item
      )
    );

    setModulCards((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
            ...item,
            status: newActive,
          }
          : item
      )
    );
  };

  // =========================================================
  // LOADING
  // =========================================================
  if (loading) {
    return (
      <div className="flex min-h-screen bg-white">

        <main className="flex flex-1 items-center justify-center">
          <div className="rounded-2xl bg-[#f7f6fb] px-8 py-6">
            <p className="text-sm font-semibold text-[#6e6a85]">
              Memuat modul...
            </p>
          </div>
        </main>
      </div>
    );
  }

  // =========================================================
  // HALAMAN UTAMA
  // =========================================================
  return (
    <DosenContainer
      categoryTag="MODUL PEMBELAJARAN"
      title="Daftar Modul Pembelajaran"
      subtitle="Kelola dan pantau semua modul pembelajaran Syariah Quest yang tersedia untuk mahasiswa."

    >
      {/* GRID MODUL */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {/* TAMBAH MODUL CARD */}
        <button
          type="button"
          onClick={() => router.push("/Dosen/modul/tambah_modul")}
          className="group flex h-[340px] flex-col items-center justify-center gap-3 rounded-[24px] border-2 border-dashed border-[#8a80b8]/30 bg-white/60 p-6 text-[#4a3f7a] shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-[#4a3f7a] hover:bg-white hover:shadow-md hover:scale-[1.01]"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#4a3f7a]/10 text-2xl font-bold text-[#4a3f7a] transition group-hover:bg-[#4a3f7a] group-hover:text-white">
            +
          </div>
          <span className="text-base font-bold text-[#3d3466]">
            Tambah Modul Baru
          </span>
          <p className="max-w-[200px] text-center text-xs text-[#8b84a5]">
            Buat modul pembelajaran baru dengan materi dan dokumen
          </p>
        </button>

        {/* DAFTAR MODUL CARDS */}
        {modulCards.map((card, index) => {
          const isActive = activeStates[index] ?? true;
          const late = isPastDeadline(card.deadline);

          return (
            <div
              key={card.id}
              className="group flex h-[340px] flex-col overflow-hidden rounded-[24px] bg-white ring-1 ring-black/5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-[#4a3f7a]/20"
            >
              {/* THUMBNAIL */}
              <div className="relative h-[125px] shrink-0 bg-[#4a3f7a]">
                <div className="h-full w-full overflow-hidden">
                  {card.thumbnailUrl ? (
                    <img
                      src={card.thumbnailUrl}
                      alt={card.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#4a3f7a] to-[#3d3466]">
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#c9c3e6]">
                        Syariah Quest Module
                      </span>
                    </div>
                  )}
                </div>

                {/* LEVEL BADGE */}
                <div
                  className={`absolute -bottom-4 left-4 flex h-10 w-10 items-center justify-center rounded-full border-4 border-white text-sm font-black text-white shadow-md ${card.badgeColor}`}
                >
                  {card.badge}
                </div>

                {/* STATUS TOGGLE */}
                <button
                  type="button"
                  onClick={() => toggleActive(index)}
                  className={`absolute right-3 top-3 rounded-full px-3.5 py-1.5 text-xs font-bold text-white shadow-md backdrop-blur-md transition-all hover:scale-105 active:scale-95 ${isActive
                      ? "bg-rose-500/90 hover:bg-rose-600"
                      : "bg-emerald-500/90 hover:bg-emerald-600"
                    }`}
                >
                  {isActive ? "Nonaktifkan" : "Aktifkan"}
                </button>
              </div>

              {/* CONTENT */}
              <div className="flex flex-1 flex-col px-5 pb-5 pt-6">
                <h3 className="line-clamp-2 text-base font-bold leading-snug text-[#2b2540] group-hover:text-[#4a3f7a] transition">
                  {card.title}
                </h3>

                <div className="mt-2 flex items-center justify-between">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-200">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    +{card.xp} XP
                  </div>

                  <span className="truncate text-xs font-medium text-[#8b84a5]">
                    dibuat oleh : <strong className="text-[#3d3466]">{card.dibuat_oleh}</strong>
                  </span>
                </div>

                {/* DEADLINE */}
                {card.deadline && (
                  <span
                    className={`mt-2 inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-bold ${
                      late
                        ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                        : "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
                    }`}
                  >
                    🗓 Deadline: {formatDeadline(card.deadline)}
                    {late && " (lewat)"}
                  </span>
                )}

                {/* BUTTONS */}
                <div className="mt-auto flex gap-2.5 pt-4 border-t border-[#f0edf9]">
                  <button
                    type="button"
                    onClick={() =>
                      router.push(`/Dosen/modul/aktivitas?id=${card.id}`)
                    }
                    className="flex-1 rounded-xl border border-[#e4e2ee] bg-[#f8f7fd] py-2.5 text-xs font-bold text-[#4a3f7a] transition hover:bg-[#4a3f7a] hover:text-white"
                  >
                    Aktivitas
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      router.push(`/Dosen/modul/detail_modul?id=${card.id}`)
                    }
                    className="flex-1 rounded-xl bg-[#4a3f7a] py-2.5 text-xs font-bold text-white transition hover:bg-[#3d3466] shadow-sm"
                  >
                    Lihat Modul
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* EMPTY STATE */}
      {modulCards.length === 0 && (
        <div className="mt-6 rounded-[28px] border-2 border-dashed border-[#8a80b8]/30 bg-white/70 p-12 text-center backdrop-blur-sm shadow-sm">
          <p className="text-base font-bold text-[#3d3466]">
            Belum ada modul pembelajaran.
          </p>
          <p className="mt-1 text-xs text-[#8b84a5]">
            Mulai tambahkan modul baru untuk proses pembelajaran mahasiswa.
          </p>

          <button
            type="button"
            onClick={() => router.push("/Dosen/modul/tambah_modul")}
            className="mt-6 rounded-full bg-amber-400 px-6 py-3 text-sm font-bold text-amber-950 shadow-md shadow-amber-900/20 transition hover:bg-amber-300"
          >
            + Tambah Modul Sekarang
          </button>
        </div>
      )}
    </DosenContainer>
  );
}

// =============================================================
// PAGE WRAPPER
// =============================================================
export default function ModulPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f8f7fd]">
          <div className="rounded-2xl bg-white px-8 py-6 shadow-sm">
            <p className="text-sm font-semibold text-[#4a3f7a]">
              Memuat modul pembelajaran...
            </p>
          </div>
        </div>
      }
    >
      <ModulPembelajaranContent />
    </Suspense>
  );
}