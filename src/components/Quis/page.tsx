"use client";

// components/Quis/page.tsx  (menggantikan versi lama)
// Perubahan utama:
//  - Soal dimuat SEKALI setelah profil siap (tidak teracak ulang di tengah kuis)
//  - Jawaban disimpan per id_soal (bukan indeks)
//  - Pemilihan soal memakai Elo + mewakili tiap sub-topik (eloAdaptive.ts)
//  - Gagal simpan => tampil pesan + tombol "Coba simpan lagi" (attempt tidak dobel)
//  - Layar hasil menampilkan sub-topik yang perlu diperkuat
//  - onClaimXP & tombol "Klaim XP" dihapus (XP sudah ditambahkan server saat submit)

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { supabase } from "@/lib/supabase";
import { checkAndAwardModulBadges, type EarnedBadge } from "@/lib/badges";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import {
  selectQuestionsByElo,
  siapkanKonteksSoal,
  kalibrasiSoal,
} from "@/lib/eloAdaptive";
import {
  getSubTopikModul,
  hitungPerSubTopik,
  subTopikLemah,
  type HasilSubTopik,
  type SubTopik,
} from "@/lib/subTopik";
import { getModulState, submitAttemptModul } from "@/lib/remedial";

type JawabanDB = {
  id_jawaban: number;
  id_soal: number;
  jawaban: string;
  jawaban_benar: boolean;
};

type SoalDB = {
  id_soal: number;
  id_modul: number;
  id_sub_topik: number | null;
  difficulty_rating?: number | null;
  soal: string;
  jawaban: JawabanDB[];
};

export type SubmitResult = { xp: number; eloDelta?: number; eloAfter?: number };

type QuizProps = {
  /** Dipanggil saat mahasiswa lulus dan menekan "Lanjut". */
  onContinue?: (score: number) => void;
  /**
   * Dipanggil SEKALI tiap kuis selesai (lulus ATAU gagal). Induk yang menentukan
   * nilai final (mis. aturan deadline) lalu menyimpan attempt.
   */
  onSubmitAttempt?: (score: number) => Promise<SubmitResult | number | void>;
  /** Dipanggil saat gagal dan mahasiswa menekan "Lihat Materi Remedial". */
  onFailed?: () => void;
  idModul: number;
  /** Nilai terbaik sebelumnya (jika sudah pernah mengerjakan). */
  initialScore?: number | null;
  passingGrade: number;
};

type Hasil = {
  skor: number;
  benar: number;
  salah: number;
  lulus: boolean;
  perSubTopik: HasilSubTopik[];
};

export default function Quiz({
  onContinue,
  onSubmitAttempt,
  onFailed,
  idModul,
  initialScore,
  passingGrade,
}: QuizProps) {
  const { profile } = useCurrentUser();
  const PASSING_GRADE = Math.min(100, Math.max(0, passingGrade));

  const [questions, setQuestions] = useState<SoalDB[]>([]);
  const [subTopik, setSubTopik] = useState<SubTopik[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [current, setCurrent] = useState(0);
  // id_soal -> id_jawaban yang dipilih
  const [answers, setAnswers] = useState<Record<number, number>>({});

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [isRetaking, setIsRetaking] = useState(false);
  const [hasil, setHasil] = useState<Hasil | null>(null);

  const [earnedXp, setEarnedXp] = useState(0);
  const [eloInfo, setEloInfo] = useState<{ delta: number; after: number } | null>(null);
  const [newBadges, setNewBadges] = useState<EarnedBadge[]>([]);
  const [remedialWajib, setRemedialWajib] =useState(false)

  // true setelah attempt berhasil disimpan -> retry tidak membuat attempt ganda
  const attemptTersimpan = useRef(false);

  // ---------------------------------------------------------------
  // MUAT SOAL (sekali per modul/mahasiswa; ulang hanya via reloadKey)
  // ---------------------------------------------------------------
  useEffect(() => {
    const idMahasiswa = profile?.idMahasiswa;
    if (!idModul || !idMahasiswa) return;

    let batal = false;

    (async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const statusModul = await getModulState(idMahasiswa, idModul);
        if(statusModul.status === "remedial"){
          setRemedialWajib(true);
          setQuestions([]);
          return;
        }
        setRemedialWajib(false);
        const [soalRes, konteks, daftarSubTopik] = await Promise.all([
          supabase.from("soal").select("*, jawaban(*)").eq("id_modul", idModul),
          siapkanKonteksSoal(idMahasiswa, idModul),
          // sub-topik opsional: kuis tetap jalan walau tabel belum dimigrasi
          getSubTopikModul(idModul).catch(() => [] as SubTopik[]),
        ]);

        if (soalRes.error) throw soalRes.error;
        if (batal) return;

        const semua = ((soalRes.data ?? []) as SoalDB[]).map((s) => ({
          ...s,
          // urutan opsi stabil (A, B, C... tidak berubah antar render)
          jawaban: [...(s.jawaban ?? [])].sort((a, b) => a.id_jawaban - b.id_jawaban),
        }));

        setSubTopik(daftarSubTopik);
        setQuestions(selectQuestionsByElo(semua, konteks.elo, konteks.fallback));
      } catch (err) {
        console.error("Gagal memuat soal:", err);
        if (!batal) setLoadError("Soal gagal dimuat. Periksa koneksi lalu coba lagi.");
      } finally {
        if (!batal) setIsLoading(false);
      } 
    })();

    return () => {
      batal = true;
    };
  }, [idModul, profile?.idMahasiswa, reloadKey]);

  // ---------------------------------------------------------------
  // PENILAIAN & PENYIMPANAN
  // ---------------------------------------------------------------
  const jawabanDipilih = (q: SoalDB) =>
    q.jawaban.find((j) => j.id_jawaban === answers[q.id_soal]);

  const simpan = async () => {
    const idMahasiswa = profile?.idMahasiswa;
    if (!idMahasiswa || !hasil) return;

    setSaveError(null);

    try {
      const rows = questions.map((q) => {
        const dipilih = jawabanDipilih(q);
        return {
          id_soal: q.id_soal,
          id_jawaban: dipilih?.id_jawaban ?? null,
          is_benar: Boolean(dipilih?.jawaban_benar),
        };
      });

      if (!attemptTersimpan.current) {
        // Snapshot terakhir (dipakai memilih remedial) -- atomik di database
        const { error: riwayatError } = await supabase.rpc("simpan_riwayat_jawaban", {
          p_id_mahasiswa: idMahasiswa,
          p_id_modul: idModul,
          p_rows: rows,
        });
        if (riwayatError) throw riwayatError;

        // Nilai akhir modul = nilai tertinggi; XP & Elo dihitung di SERVER (RPC)
        let xp = 0;
        let eloDelta: number | undefined;
        let eloAfter: number | undefined;

        if (onSubmitAttempt) {
          const r = await onSubmitAttempt(hasil.skor);
          if (typeof r === "number") {
            xp = r;
          } else if (r) {
            xp = r.xp;
            eloDelta = r.eloDelta;
            eloAfter = r.eloAfter;
          }
        } else {
          const r = await submitAttemptModul(idMahasiswa, idModul, hasil.skor);
          xp = r.xpDidapat;
          eloDelta = r.eloDelta;
          eloAfter = r.eloSesudah;
        }

        attemptTersimpan.current = true;
        setEarnedXp(xp);
        if (eloAfter !== undefined) setEloInfo({ delta: eloDelta ?? 0, after: eloAfter });

        // Kalibrasi rating soal: tidak boleh mengganggu mahasiswa
        void kalibrasiSoal(
          idMahasiswa,
          rows.map(({ id_soal, id_jawaban }) => ({ id_soal, id_jawaban })),
        );
      }

      // Badge: non-kritis, gagal tidak membatalkan penyimpanan
      if (hasil.lulus) {
        try {
          const earned = await checkAndAwardModulBadges(idMahasiswa);
          if (earned.length > 0) setNewBadges(earned);
        } catch (badgeErr) {
          console.error("Gagal memeriksa badge:", badgeErr);
        }
      }
    } catch (err) {
      console.error("Gagal menyimpan hasil kuis:", err);
      setSaveError(
        "Hasil kuis belum tersimpan. Nilaimu masih ditampilkan di bawah; tekan “Coba simpan lagi”.",
      );
    }
  };

  const selesai = async () => {
    const benar = questions.filter((q) => jawabanDipilih(q)?.jawaban_benar).length;
    const skor = Math.round((benar / questions.length) * 100);

    const perSubTopik = hitungPerSubTopik(
      questions.map((q) => ({
        id_sub_topik: q.id_sub_topik,
        is_benar: Boolean(jawabanDipilih(q)?.jawaban_benar),
      })),
      subTopik,
    );

    setHasil({
      skor,
      benar,
      salah: questions.length - benar,
      lulus: skor >= PASSING_GRADE,
      perSubTopik,
    });
    setIsFinished(true);
  };

  // `hasil` harus sudah ada di state sebelum simpan() dipanggil
  const [perluSimpan, setPerluSimpan] = useState(false);
  useEffect(() => {
    if (!isFinished || !hasil || !perluSimpan) return;
    setPerluSimpan(false);
    setIsSaving(true);
    simpan().finally(() => setIsSaving(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFinished, hasil, perluSimpan]);

  const handleNext = () => {
    if (current < questions.length - 1) {
      setCurrent(current + 1);
    } else {
      selesai().then(() => setPerluSimpan(true));
    }
  };

  const mulaiUlang = () => {
    // muat ulang soal dengan Elo terbaru; reset semua state hasil
    setAnswers({});
    setCurrent(0);
    setHasil(null);
    setIsFinished(false);
    setIsRetaking(true);
    setEarnedXp(0);
    setEloInfo(null);
    setNewBadges([]);
    setSaveError(null);
    attemptTersimpan.current = false;
    setReloadKey((k) => k + 1);
  };

  // ---------------------------------------------------------------
  // TAMPILAN
  // ---------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white rounded-3xl shadow-sm border border-slate-100">
        <Loader2 className="w-10 h-10 text-[#3A2E65] animate-spin" />
        <p className="text-[#3A2E65] font-bold">Mempersiapkan Soal Kuis...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center bg-white rounded-3xl shadow-sm border border-slate-100">
        <p className="text-sm font-bold text-rose-600">{loadError}</p>
        <button
          onClick={() => setReloadKey((k) => k + 1)}
          className="rounded-xl bg-[#3A2E65] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#2A214D]"
        >
          Coba Lagi
        </button>
      </div>
    );
  }
if (remedialWajib){
        return(
           <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-6 text-center">
      <h2 className="text-xl font-bold">
        Kuis Belum Bisa Diakses
      </h2>

      <p className="max-w-md text-gray-600">
        Kamu harus menyelesaikan seluruh materi remedial
        sebelum dapat mengulang kuis modul ini.
      </p>

      {onFailed && (
        <button
          type="button"
          onClick={onFailed}
          className="rounded-lg bg-[#4a3f7a] px-5 py-3 font-semibold text-white"
        >
          Buka Materi Remedial
        </button>
      )}
    </div>
        )
      };
  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center bg-white rounded-3xl shadow-sm border border-slate-100">
        <p className="text-xl font-bold text-slate-400">Belum Ada Kuis</p>
        <p className="text-sm text-slate-500">Dosen belum menambahkan soal untuk modul ini.</p>
      </div>
    );
  }

  // Sudah pernah mengerjakan -> tampilkan ringkasan sebelum mengulang
  if (initialScore !== null && initialScore !== undefined && !isRetaking && !isFinished) {
    const sudahLulus = initialScore >= PASSING_GRADE;
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 gap-6 text-center w-full max-w-md mx-auto bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-slate-100">
        <div
          className={`w-24 h-24 rounded-full flex items-center justify-center mb-2 ${sudahLulus ? "bg-[#10B981]/10 text-[#10B981]" : "bg-[#EF4444]/10 text-[#EF4444]"
            }`}
        >
          {sudahLulus ? <CheckCircle2 className="w-12 h-12" /> : <XCircle className="w-12 h-12" />}
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-[#3A2E65] mb-2">
            {sudahLulus ? "Kuis Telah Diselesaikan" : "Kuis Belum Lulus"}
          </h2>
          <p className="text-slate-500 text-sm">Nilai terbaikmu sejauh ini:</p>
          <div className={`text-5xl font-black mt-4 ${sudahLulus ? "text-[#10B981]" : "text-[#EF4444]"}`}>
            {initialScore}%
          </div>
          {sudahLulus && (
            <p className="mt-4 rounded-xl bg-[#FBBF24]/15 px-4 py-2 text-xs font-bold text-[#3A2E65]">
              Mengulang kuis tetap bisa menambah XP, tetapi hanya 50% dari XP modul ini.
            </p>
          )}
        </div>
        <button
          onClick={() => setIsRetaking(true)}
          className="mt-6 w-full py-3.5 px-6 bg-[#FBBF24] hover:bg-[#F59E0B] text-[#3A2E65] font-bold rounded-xl transition-all shadow-sm"
        >
          Ulangi Kuis
        </button>
      </div>
    );
  }

  // ---------------- HASIL KUIS ----------------
  if (isFinished && hasil) {
    const isRepeat = initialScore !== null && initialScore !== undefined;
    const lemah = subTopikLemah(hasil.perSubTopik, PASSING_GRADE);

    const displayAvatar =
      profile?.avatarUrl ||
      "https://api.dicebear.com/7.x/micah/svg?seed=Pemain&backgroundColor=transparent";
    const displayName = profile?.namaMahasiswa || "Pemain Misterius";

    return (
      <div className="relative -m-4 flex min-h-[650px] w-full flex-col overflow-hidden rounded-3xl border border-[#e4e2ee] bg-[#f8f7fd] p-5 text-[#2b2540] shadow-[0_8px_30px_rgb(61,52,102,0.12)] sm:p-6 md:m-0 md:p-10">
        <div className="mb-6 rounded-2xl bg-gradient-to-br from-[#4a3f7a] via-[#3d3466] to-[#2a224d] px-4 py-6 text-center text-white shadow-lg shadow-[#3d3466]/20 sm:px-6">
          <h1 className="text-2xl font-extrabold sm:text-3xl md:text-4xl">
            {hasil.lulus
              ? earnedXp > 0
                ? `Selamat! Kamu Meraih +${earnedXp} XP${isRepeat ? " (50%)" : ""}`
                : "Selamat! Kamu Lulus"
              : "Yah, Nilaimu Belum Cukup :("}
          </h1>
          <p className="mt-2 text-sm font-semibold text-[#e2dcff]">
            Nilai kamu {hasil.skor}% dari batas lulus {PASSING_GRADE}%
          </p>
          {eloInfo && (
            <p
              className={`mt-2 text-sm font-extrabold ${eloInfo.delta < 0 ? "text-[#fca5a5]" : "text-[#FBBF24]"
                }`}
            >
              {eloInfo.delta === 0
                ? `Elo ${eloInfo.after} (tidak berubah)`
                : `Elo ${eloInfo.after} (${eloInfo.delta > 0 ? "+" : ""}${eloInfo.delta})`}
            </p>
          )}
        </div>

        {saveError && (
          <div className="mx-auto mb-4 flex w-full max-w-xl flex-col items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-center">
            <p className="text-sm font-bold text-rose-700">{saveError}</p>
            <button
              onClick={() => {
                setIsSaving(true);
                simpan().finally(() => setIsSaving(false));
              }}
              disabled={isSaving}
              className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-60"
            >
              {isSaving ? "Menyimpan..." : "Coba simpan lagi"}
            </button>
          </div>
        )}

        {newBadges.length > 0 && (
          <div className="flex flex-wrap justify-center gap-4 mb-4 max-w-xl mx-auto w-full mt-4">
            {newBadges.map((badge, i) => (
              <div
                key={i}
                className="flex items-center gap-3 bg-[#FBBF24]/20 text-[#3A2E65] rounded-2xl px-4 py-3 shadow-sm border border-[#FBBF24]/30"
              >
                <div className="w-10 h-10 rounded-full overflow-hidden bg-white flex-shrink-0">
                  <img src={badge.icon_url} alt={badge.nama_badge} className="w-full h-full object-contain p-1" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-wide opacity-70">Badge Baru!</span>
                  <span className="font-extrabold text-sm">{badge.nama_badge}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <Link
          href="/profile"
          className="flex flex-col items-center justify-center gap-2 mb-8 w-fit mx-auto group cursor-pointer mt-4"
        >
          <div className="w-16 h-16 bg-slate-100 rounded-full overflow-hidden shadow-sm border-2 border-[#E2E8F0] flex-shrink-0 group-hover:scale-105 transition-transform">
            <img src={displayAvatar} alt="Avatar" className="w-full h-full object-cover p-1" />
          </div>
          <span className="text-lg font-bold text-[#3d3466] transition-colors group-hover:text-[#5B5288]">
            {displayName}
          </span>
        </Link>

        <div className="max-w-xl mx-auto w-full mb-6 space-y-5">
          <div className="h-3 bg-slate-100 rounded-full relative overflow-hidden">
            <div
              className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ${hasil.lulus ? "bg-[#10B981]" : "bg-[#EF4444]"
                }`}
              style={{ width: `${hasil.skor}%` }}
            />
          </div>
          <div className="flex justify-center gap-4 w-full">
            <div className="bg-[#10B981] text-white font-bold py-3 px-2 rounded-2xl flex-1 text-center shadow-sm text-sm md:text-base">
              {hasil.benar} benar
            </div>
            <div className="bg-[#EF4444] text-white font-bold py-3 px-2 rounded-2xl flex-1 text-center shadow-sm text-sm md:text-base">
              {hasil.salah} salah
            </div>
            <div className="flex-1 rounded-2xl bg-[#e8e4f5] px-2 py-3 text-center text-sm font-black text-[#3d3466] shadow-sm md:text-base">
              {hasil.skor}%
            </div>
          </div>
        </div>

        {/* SUB-TOPIK YANG PERLU DIPERKUAT */}
        {hasil.perSubTopik.length > 0 && (
          <div className="mx-auto mb-8 w-full max-w-xl rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <p className="mb-3 text-sm font-extrabold text-[#3d3466]">
              {lemah.length > 0 ? "Perlu diperkuat" : "Penguasaan per sub-topik"}
            </p>
            <ul className="space-y-2">
              {(lemah.length > 0 ? lemah : hasil.perSubTopik).map((h) => (
                <li key={h.id_sub_topik} className="flex items-center justify-between gap-3 text-xs font-bold">
                  <span className="text-[#2b2540]">{h.judul}</span>
                  <span
                    className={`rounded-full px-3 py-1 ring-1 ${h.benar / h.total < PASSING_GRADE / 100
                        ? "bg-rose-50 text-rose-700 ring-rose-200"
                        : "bg-emerald-50 text-emerald-700 ring-emerald-200"
                      }`}
                  >
                    {h.benar}/{h.total} benar
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <h2 className="mb-4 text-center text-xl font-extrabold text-[#3d3466]">Review Kuis</h2>

        <div className="mx-auto flex h-[400px] w-full max-w-3xl flex-col gap-4 overflow-y-auto rounded-2xl bg-[#eeebf7] p-3 pb-28 no-scrollbar sm:p-4">
          {questions.map((q, i) => {
            const dipilih = jawabanDipilih(q);
            const isCorrect = Boolean(dipilih?.jawaban_benar);
            const borderClass = isCorrect
              ? "border-l-4 border-l-[#10B981]"
              : "border-l-4 border-l-[#EF4444]";

            return (
              <div
                key={q.id_soal}
                className={`relative rounded-2xl border border-[#e4e2ee] bg-white p-4 text-[#2b2540] shadow-sm sm:p-5 ${borderClass}`}
              >
                <h3 className="mb-4 pr-8 text-[15px] font-bold leading-relaxed text-[#3d3466]">
                  {i + 1}. {q.soal}
                </h3>
                <div className="flex flex-col gap-2 pl-2">
                  {q.jawaban.map((opt, optIdx) => {
                    let textStyle = "text-[#5b6072] text-sm px-3 py-1.5";
                    if (isCorrect && opt.jawaban_benar) {
                      textStyle =
                        "text-[#10B981] font-bold text-sm bg-[#10B981]/10 px-3 py-1.5 rounded-lg w-fit";
                    } else if (opt.id_jawaban === dipilih?.id_jawaban && !isCorrect) {
                      textStyle =
                        "text-[#EF4444] font-bold text-sm bg-[#EF4444]/10 px-3 py-1.5 rounded-lg w-fit";
                    }
                    return (
                      <span key={opt.id_jawaban} className={textStyle}>
                        {String.fromCharCode(97 + optIdx)}. {opt.jawaban}
                      </span>
                    );
                  })}
                </div>
                <div className="absolute top-5 right-5">
                  {isCorrect ? (
                    <CheckCircle2 className="w-6 h-6 text-[#10B981]" />
                  ) : (
                    <XCircle className="w-6 h-6 text-[#EF4444]" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Tombol aksi */}
        <div className="absolute bottom-0 left-0 right-0 z-10 flex flex-col items-center gap-3 rounded-b-3xl bg-gradient-to-t from-[#f8f7fd] via-[#f8f7fd] to-transparent px-5 pb-5 pt-12 sm:px-8">
          {!hasil.lulus && (
            <div className="text-[#EF4444] text-sm font-bold mb-1">
              {onFailed
                ? `*Syarat lulus: ${PASSING_GRADE}%. Pelajari materi remedial sebelum mengulang.`
                : `*Syarat lulus: ${PASSING_GRADE}%. Silakan coba lagi.`}
            </div>
          )}
          <div className="flex gap-4">
            {!hasil.lulus && onFailed ? (
              <button
                onClick={onFailed}
                disabled={isSaving}
                className="bg-[#FBBF24] hover:bg-[#F59E0B] text-[#3A2E65] font-extrabold py-3 px-8 rounded-xl shadow-sm transition-all text-center min-w-[140px] disabled:opacity-60"
              >
                Lihat Materi Remedial
              </button>
            ) : (
              <button
                onClick={mulaiUlang}
                disabled={isSaving}
                className="bg-slate-100 text-slate-600 font-bold py-3 px-8 rounded-xl hover:bg-slate-200 transition-all text-center min-w-[140px] disabled:opacity-60"
              >
                Ulangi
              </button>
            )}
            {hasil.lulus && onContinue && (
              <button
                onClick={() => onContinue(hasil.skor)}
                disabled={isSaving || Boolean(saveError)}
                className="bg-[#FBBF24] hover:bg-[#F59E0B] text-[#3A2E65] font-extrabold py-3 px-8 rounded-xl shadow-sm transition-all text-center min-w-[140px] disabled:opacity-60"
              >
                Lanjut
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---------------- SOAL AKTIF ----------------
  const q = questions[current];
  const progressPercent = ((current + 1) / questions.length) * 100;
  const sudahJawab = answers[q.id_soal] !== undefined;

  return (
    <div className="flex flex-col h-full w-full max-w-3xl mx-auto py-6 px-4 bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-50">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">
            Pertanyaan {current + 1} dari {questions.length}
          </span>
          <span className="text-sm font-extrabold text-[#3A2E65]">{Math.round(progressPercent)}%</span>
        </div>
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#FBBF24] rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <h2 className="text-2xl md:text-3xl font-extrabold text-[#3A2E65] mb-8 leading-snug">{q.soal}</h2>

      <div className="space-y-4 flex-1">
        {q.jawaban.map((opt, index) => {
          const isSelected = answers[q.id_soal] === opt.id_jawaban;
          return (
            <button
              key={opt.id_jawaban}
              onClick={() => setAnswers((prev) => ({ ...prev, [q.id_soal]: opt.id_jawaban }))}
              className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-4 group ${isSelected
                  ? "border-[#3A2E65] bg-[#3A2E65]/5 shadow-sm"
                  : "border-slate-100 hover:border-[#3A2E65]/30 hover:bg-slate-50"
                }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-colors ${isSelected
                    ? "bg-[#3A2E65] text-white"
                    : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                  }`}
              >
                {String.fromCharCode(65 + index)}
              </div>
              <span className={`font-semibold text-[15px] ${isSelected ? "text-[#3A2E65]" : "text-slate-600"}`}>
                {opt.jawaban}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-10 pt-6 border-t border-slate-100">
        <button
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0 || isSaving}
          className="px-6 py-3 text-sm font-bold text-slate-400 hover:text-[#3A2E65] disabled:opacity-30 transition-colors"
        >
          Sebelumnya
        </button>

        <button
          onClick={handleNext}
          disabled={!sudahJawab || isSaving}
          className="flex items-center justify-center gap-2 px-8 py-3.5 bg-[#3A2E65] text-white text-sm font-bold rounded-xl hover:bg-[#2A214D] transition-colors disabled:opacity-50 shadow-md min-w-[160px]"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Merekap...
            </>
          ) : current === questions.length - 1 ? (
            "Selesai & Cek Nilai"
          ) : (
            "Selanjutnya"
          )}
        </button>
      </div>
    </div>
  );
}