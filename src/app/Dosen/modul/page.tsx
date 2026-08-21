"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/logActivity";

type ModulCard = {
  id: number;
  title: string;
  xp: number;
  badge: string;
  badgeColor: string;
  thumbnailUrl: string;
  dibuat_oleh: string;
  status: boolean;
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
            dibuat_oleh: item.dibuat_oleh ?? "Admin",
            status: item.status !== false,
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
          keterangan: `${
            newActive
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
    <div className="flex min-h-screen bg-white text-[#2b2540]">

      <main className="flex-1 p-8">

        {/* =====================================================
            HEADER
        ===================================================== */}
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b84a5]">
            Modul Pembelajaran
          </p>

          <h1 className="mt-2 text-3xl font-bold text-[#3d3466]">
            Daftar Modul
          </h1>

          <p className="mt-2 text-sm text-[#8b84a5]">
            Kelola modul pembelajaran yang tersedia.
          </p>
        </div>

        {/* =====================================================
            GRID
        ===================================================== */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">

          {/* ===================================================
              TAMBAH MODUL
          =================================================== */}
          <button
            type="button"
            onClick={() =>
              router.push(
                "/Dosen/modul/tambah_modul"
              )
            }
            className="flex h-[300px] flex-col items-center justify-center gap-2 rounded-2xl border border-[#ececf3] bg-[#f4f3f7] text-[#a3a0b5] transition hover:bg-[#eeedf5]"
          >
            <span className="text-4xl">
              +
            </span>

            <span className="text-sm font-medium">
              Tambah Modul Baru
            </span>
          </button>

          {/* ===================================================
              DAFTAR MODUL
          =================================================== */}
          {modulCards.map((card, index) => {
            const isActive =
              activeStates[index] ?? true;

            return (
              <div
                key={card.id}
                className="flex h-[300px] flex-col overflow-hidden rounded-2xl border border-[#ececf3] bg-white shadow-sm"
              >

                {/* =================================================
                    THUMBNAIL
                ================================================= */}
                <div className="relative h-[110px] bg-[#ececf3]">

                  {card.thumbnailUrl ? (
                    <img
                      src={card.thumbnailUrl}
                      alt={card.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[#4a3f7a]">
                      <span className="text-sm font-semibold text-white/70">
                        Tidak ada thumbnail
                      </span>
                    </div>
                  )}

                  {/* LEVEL */}
                  <div
                    className={`absolute -bottom-4 left-4 flex h-9 w-9 items-center justify-center rounded-full border-4 border-white text-sm font-bold text-white ${card.badgeColor}`}
                  >
                    {card.badge}
                  </div>

                  {/* STATUS */}
                  <button
                    type="button"
                    onClick={() =>
                      toggleActive(index)
                    }
                    className={`absolute right-3 top-3 rounded-full px-3 py-1 text-[11px] font-semibold text-white transition ${
                      isActive
                        ? "bg-red-500 hover:bg-red-600"
                        : "bg-green-500 hover:bg-green-600"
                    }`}
                  >
                    {isActive
                      ? "Nonaktifkan"
                      : "Aktifkan"}
                  </button>
                </div>

                {/* =================================================
                    CONTENT
                ================================================= */}
                <div className="flex flex-1 flex-col px-4 pb-4 pt-6">

                  {/* NAMA MODUL */}
                  <h3 className="line-clamp-2 text-sm font-bold text-[#3d3466]">
                    {card.title}
                  </h3>

                  {/* XP */}
                  <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-red-500">
                    <span className="h-2 w-2 rounded-full bg-red-500" />

                    +{card.xp} XP
                  </div>

                  {/* DIBUAT OLEH */}
                  <p className="mt-1 truncate text-xs text-[#8b84a5]">
                    Dibuat oleh:{" "}
                    <span className="font-semibold text-[#4a3f7a]">
                      {card.dibuat_oleh}
                    </span>
                  </p>

                  {/* BUTTON */}
                  <div className="mt-auto flex gap-2">

                    {/* AKTIVITAS */}
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/Dosen/modul/aktivitas?id=${card.id}`
                        )
                      }
                      className="flex-1 rounded-lg border border-[#e4e2ee] py-2 text-xs font-semibold transition hover:bg-[#f7f6fb]"
                    >
                      Aktivitas Modul
                    </button>

                    {/* DETAIL */}
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/Dosen/modul/detail_modul?id=${card.id}`
                        )
                      }
                      className="flex-1 rounded-lg border border-[#e4e2ee] py-2 text-xs font-semibold transition hover:bg-[#f7f6fb]"
                    >
                      Lihat Modul
                    </button>

                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* =====================================================
            BELUM ADA MODUL
        ===================================================== */}
        {modulCards.length === 0 && (
          <div className="mt-6 rounded-2xl border border-dashed border-[#dcd8e8] bg-[#faf9fd] p-10 text-center">
            <p className="text-sm font-semibold text-[#6e6a85]">
              Belum ada modul pembelajaran.
            </p>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/Dosen/modul/tambah_modul"
                )
              }
              className="mt-4 rounded-full bg-emerald-400 px-5 py-2.5 text-sm font-bold text-emerald-950 hover:bg-emerald-300"
            >
              Tambah Modul
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

// =============================================================
// PAGE WRAPPER
// =============================================================
// Suspense diperlukan oleh Next.js 16 ketika ada komponen
// di dalam tree halaman yang menggunakan useSearchParams().
// Bisa berasal dari Sidebar atau komponen turunannya.
export default function ModulPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen bg-white">
          <main className="flex flex-1 items-center justify-center">
            <div className="rounded-2xl bg-[#f7f6fb] px-8 py-6">
              <p className="text-sm font-semibold text-[#6e6a85]">
                Memuat halaman modul...
              </p>
            </div>
          </main>
        </div>
      }
    >
      <ModulPembelajaranContent />
    </Suspense>
  );
}