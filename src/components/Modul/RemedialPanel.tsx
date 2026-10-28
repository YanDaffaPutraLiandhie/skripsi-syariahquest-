"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { markRemedialDone, type ModulState } from "@/lib/remedial";
import {
  Brain,
  Sparkles,
  BookOpen,
  Lightbulb,
  CheckCircle2,
  RefreshCw,
  Bot,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  GraduationCap,
  TrendingUp,
  Clock,
  Star,
  ArrowLeft,
  ArrowRight,
  BookMarked,
  RotateCcw,
  Scale,
  Shield,
  Flame,
  Zap,
  Trophy,
  Compass,
  Target,
  Scroll,
} from "lucide-react";

export type GeneratedMaterial = {
  id: string;
  judul: string;
  tipe: "ringkasan" | "penjelasan" | "contoh_soal" | "tips";
  konten: string;
  idSubTopik: number;
  prioritas: number;
  source?: {
    soal_salah?: string;
    sumber?: string;
    kemiripan?: number;
    topik?: string;
  };
};

type Props = {
  idMahasiswa: number;
  idModul: number;
  state: ModulState;
  onChanged: () => void | Promise<void>;
  onRetake: () => void;
  selectedSubTopikId?: number | null;
  onSelectSubTopik?: (id: number) => void;
};

function urlAman(raw: string): string | null {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" || u.protocol === "http:" ? raw : null;
  } catch {
    return null;
  }
}

/* ── Markdown-aware konten renderer ── */
function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-bold text-[#3D2C6D] bg-purple-100/70 px-1 py-0.5 rounded">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function KontenRenderer({ konten }: { konten: string }) {
  const lines = konten.split("\n");
  return (
    <div className="space-y-3">
      {lines.map((line, i) => {
        const key = `l-${i}`;
        const trimmed = line.trim();
        if (!trimmed) return <div key={key} className="h-1" />;

        // 1. Headings (### or ##)
        if (trimmed.startsWith("### ") || trimmed.startsWith("## ")) {
          const title = trimmed.replace(/^#+\s*/, "");
          return (
            <div key={key} className="mt-4 mb-2 flex items-center gap-2 border-b border-purple-100 pb-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#5B5288] text-white">
                <BookMarked className="h-3 w-3" />
              </span>
              <h4 className="text-sm md:text-base font-black text-[#3D2C6D]">
                {title}
              </h4>
            </div>
          );
        }

        // 2. Dalil / Hadits / Kutipan (> ...)
        if (trimmed.startsWith("> ") || trimmed.toLowerCase().startsWith("dalil:") || trimmed.toLowerCase().startsWith("hadits:")) {
          const cleanText = trimmed.startsWith("> ") ? trimmed.slice(2) : trimmed;
          return (
            <div
              key={key}
              className="my-3 rounded-xl border-l-4 border-emerald-500 bg-emerald-50/70 p-3.5 text-xs md:text-sm text-emerald-950 shadow-xs"
            >
              <div className="flex items-center gap-1.5 font-black text-emerald-800 text-[11px] uppercase tracking-wider mb-1">
                <Scroll className="h-3.5 w-3.5 text-emerald-600" />
                <span>Rujukan Dalil / Hadits</span>
              </div>
              <blockquote className="italic font-serif leading-relaxed text-emerald-900">
                “{renderInline(cleanText)}”
              </blockquote>
            </div>
          );
        }

        // 3. Contoh Kasus (💡 ...)
        if (trimmed.includes("💡") || trimmed.toLowerCase().startsWith("contoh kasus:") || trimmed.toLowerCase().startsWith("contoh:")) {
          return (
            <div
              key={key}
              className="my-3 rounded-xl border border-amber-300 bg-amber-50/70 p-3.5 text-xs md:text-sm text-amber-950 shadow-xs"
            >
              <div className="flex items-center gap-1.5 font-black text-amber-900 text-[11px] uppercase tracking-wider mb-1">
                <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
                <span>Penerapan / Contoh Kasus</span>
              </div>
              <div className="leading-relaxed font-medium">
                {renderInline(trimmed.replace(/💡/g, "").trim())}
              </div>
            </div>
          );
        }

        // 4. Catatan Penting / Perhatian (⚠️ ...)
        if (trimmed.includes("⚠️") || trimmed.toLowerCase().startsWith("perhatian:") || trimmed.toLowerCase().startsWith("catatan:")) {
          return (
            <div
              key={key}
              className="my-2.5 rounded-xl border border-rose-200 bg-rose-50/60 p-3 text-xs md:text-sm text-rose-950 shadow-xs flex items-start gap-2"
            >
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium">
                {renderInline(trimmed.replace(/⚠️/g, "").trim())}
              </div>
            </div>
          );
        }

        // 5. Bullet items (- or * or •)
        if (trimmed.match(/^[\-\*•]\s+/)) {
          return (
            <div key={key} className="flex items-start gap-2.5 pl-1 text-xs md:text-sm text-gray-700 leading-relaxed">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white mt-1">
                <CheckCircle2 className="h-3 w-3 stroke-[3]" />
              </span>
              <div className="flex-1">{renderInline(trimmed.replace(/^[\-\*•]\s+/, ""))}</div>
            </div>
          );
        }

        // 6. Numbered items (1. , 2. )
        const numMatch = trimmed.match(/^([0-9]+)[\.\)]\s+(.+)$/);
        if (numMatch) {
          return (
            <div key={key} className="flex items-start gap-2.5 pl-1 text-xs md:text-sm text-gray-700 leading-relaxed">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#5B5288] text-[10px] font-black text-white mt-0.5">
                {numMatch[1]}
              </span>
              <div className="flex-1">{renderInline(numMatch[2])}</div>
            </div>
          );
        }

        // 7. Regular paragraph
        return (
          <p key={key} className="text-xs md:text-sm text-gray-700 leading-relaxed font-normal">
            {renderInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

/* ── Konfigurasi tampilan materi pembelajaran terfokus ── */
const TIPE_CFG = {
  ringkasan: {
    icon: BookOpen,
    label: "Intisari Konsep Pokok",
    from: "from-blue-50/90",
    to: "to-indigo-50/60",
    border: "border-blue-200/80",
    iconBg: "bg-gradient-to-br from-blue-600 to-indigo-700 shadow-blue-500/20",
    badge: "bg-blue-100/80 text-blue-800 border-blue-200",
    title: "text-blue-950",
  },
  penjelasan: {
    icon: Brain,
    label: "Materi & Pemahaman Konsep",
    from: "from-purple-50/90",
    to: "to-violet-50/60",
    border: "border-purple-200/80",
    iconBg: "bg-gradient-to-br from-purple-600 to-violet-700 shadow-purple-500/20",
    badge: "bg-purple-100/80 text-purple-800 border-purple-200",
    title: "text-purple-950",
  },
  contoh_soal: {
    icon: Scale,
    label: "Contoh Kasus & Penerapan",
    from: "from-emerald-50/90",
    to: "to-teal-50/60",
    border: "border-emerald-200/80",
    iconBg: "bg-gradient-to-br from-emerald-600 to-teal-700 shadow-emerald-500/20",
    badge: "bg-emerald-100/80 text-emerald-800 border-emerald-200",
    title: "text-emerald-950",
  },
  tips: {
    icon: Lightbulb,
    label: "Catatan Tambahan",
    from: "from-amber-50/90",
    to: "to-yellow-50/60",
    border: "border-amber-200/80",
    iconBg: "bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/20",
    badge: "bg-amber-100/80 text-amber-800 border-amber-200",
    title: "text-amber-950",
  },
};

/* ── Komponen tampilan materi terfokus dengan checkpoint baca ── */
function MaterialCard({
  material,
}: {
  material: GeneratedMaterial;
}) {
  const [isUnderstood, setIsUnderstood] = useState(false);
  const cfg = TIPE_CFG[material.tipe] ?? TIPE_CFG.penjelasan;
  const Icon = cfg.icon;
  const kemiripan = material.source?.kemiripan;
  const sumber = material.source?.sumber;

  return (
    <div
      className={`rounded-2xl border overflow-hidden bg-gradient-to-br ${cfg.from} ${cfg.to} ${cfg.border} shadow-sm transition-all hover:shadow-md`}
    >
      <div className="flex items-start gap-3.5 p-4 md:p-5 border-b border-white/60 bg-white/40">
        <span
          className={`shrink-0 mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl ${cfg.iconBg} shadow-sm`}
        >
          <Icon className="h-5 w-5 text-white" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${cfg.badge}`}
            >
              {cfg.label}
            </span>
            {sumber === "database" && kemiripan && kemiripan > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200">
                <Bot className="h-3 w-3" /> Modul Resmi {kemiripan}%
              </span>
            )}
          </div>
          <h3 className={`text-base md:text-lg font-black leading-snug ${cfg.title}`}>
            {material.judul}
          </h3>
        </div>
      </div>

      <div className="p-5 md:p-6 bg-white/85">
        <KontenRenderer konten={material.konten} />

        {/* Checkpoint interaktif pemahaman per kartu */}
        <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
          <span className="text-xs text-gray-500 font-medium">
            {isUnderstood ? "✓ Telah dipelajari & dipahami" : "Sudah selesai membaca materi ini?"}
          </span>
          <button
            type="button"
            onClick={() => setIsUnderstood(!isUnderstood)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              isUnderstood
                ? "bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs"
                : "bg-gray-100 hover:bg-purple-100 text-gray-700 hover:text-purple-900 border border-gray-200"
            }`}
          >
            <CheckCircle2 className={`h-3.5 w-3.5 ${isUnderstood ? "text-emerald-600" : "text-gray-400"}`} />
            <span>{isUnderstood ? "Selesai Dipahami" : "Tandai Paham"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   KOMPONEN UTAMA — REMEDIAL PANEL (PER TOPIK PEMBAHASAN)
   ══════════════════════════════════════════════════════════ */
export default function RemedialPanel({
  idMahasiswa,
  idModul,
  state,
  onChanged,
  onRetake,
  selectedSubTopikId,
  onSelectSubTopik,
}: Props) {
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiMaterials, setAiMaterials] = useState<GeneratedMaterial[]>([]);
  const [isLoadingAi, setIsLoadingAi] = useState(true);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const hasAutoGenerated = useRef(false);
  const sibuk = busyId !== null || isGeneratingAi;

  /* ── 1. Buat daftar topik pembahasan remedial ── */
  const remedialTopics = useMemo(() => {
    if (state.subTopikLemah && state.subTopikLemah.length > 0) {
      return state.subTopikLemah.map((s) => ({
        id_sub_topik: s.id_sub_topik,
        judul: s.judul,
        benar: s.benar,
        total: s.total,
      }));
    }
    const map = new Map<number, string>();
    for (const r of state.remedial) {
      if (r.id_sub_topik) {
        map.set(r.id_sub_topik, r.judul || `Topik ${r.id_sub_topik}`);
      }
    }
    if (map.size > 0) {
      return Array.from(map.entries()).map(([id, judul]) => ({
        id_sub_topik: id,
        judul,
        benar: 0,
        total: 0,
      }));
    }
    return [{ id_sub_topik: 0, judul: "Materi Pembelajaran Remedial", benar: 0, total: 0 }];
  }, [state.subTopikLemah, state.remedial]);

  /* ── 2. Topik aktif yang sedang dipelajari ── */
  const activeTopicId =
    selectedSubTopikId !== undefined && selectedSubTopikId !== null
      ? selectedSubTopikId
      : remedialTopics[0]?.id_sub_topik ?? 0;

  let currentTopicIndex = remedialTopics.findIndex((t) => t.id_sub_topik === activeTopicId);
  if (currentTopicIndex === -1) currentTopicIndex = 0;
  const currentTopic = remedialTopics[currentTopicIndex] || remedialTopics[0];

  const handleSelectTopic = (id: number) => {
    if (onSelectSubTopik) {
      onSelectSubTopik(id);
    }
  };

  const handleNextTopic = () => {
    if (currentTopicIndex < remedialTopics.length - 1) {
      handleSelectTopic(remedialTopics[currentTopicIndex + 1].id_sub_topik);
    } else if (state.canRetake) {
      onRetake();
    }
  };

  const handlePrevTopic = () => {
    if (currentTopicIndex > 0) {
      handleSelectTopic(remedialTopics[currentTopicIndex - 1].id_sub_topik);
    }
  };

  /* ── Fetch materi AI yang sudah tersimpan ── */
  const fetchAiMaterials = useCallback(async () => {
    setIsLoadingAi(true);
    try {
      const {
        data: { session },
      } = await (await import("@/lib/supabase")).supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch("/api/get-ai-materials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ idModul, idMahasiswa, idAttemptKe: state.lastAttemptKe }),
      });
      if (res.ok) setAiMaterials((await res.json()).materials ?? []);
    } catch (e) {
      console.error("Gagal memuat materi AI:", e);
    } finally {
      setIsLoadingAi(false);
    }
  }, [idMahasiswa, idModul, state.lastAttemptKe]);

  /* ── Generate materi baru via ML/Gemini ── */
  const handleGenerateAiMaterials = useCallback(async () => {
    setIsGeneratingAi(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await (await import("@/lib/supabase")).supabase.auth.getSession();
      if (!session?.access_token) {
        setError("Sesi login berakhir. Silakan muat ulang halaman.");
        return;
      }
      const res = await fetch("/api/generate-ai-remedial", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ idModul, idAttemptKe: state.lastAttemptKe }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "Gagal menghasilkan materi");
      }
      await fetchAiMaterials();
      await onChanged();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memproses remedial.");
    } finally {
      setIsGeneratingAi(false);
    }
  }, [idModul, state.lastAttemptKe, fetchAiMaterials, onChanged]);

  useEffect(() => {
    fetchAiMaterials();
  }, [fetchAiMaterials]);

  /* Auto-generate jika belum ada materi untuk attempt ini */
  useEffect(() => {
    if (
      !isLoadingAi &&
      aiMaterials.length === 0 &&
      state.subTopikLemah.length > 0 &&
      !hasAutoGenerated.current &&
      !isGeneratingAi
    ) {
      hasAutoGenerated.current = true;
      handleGenerateAiMaterials();
    }
  }, [
    isLoadingAi,
    aiMaterials.length,
    state.subTopikLemah.length,
    isGeneratingAi,
    handleGenerateAiMaterials,
  ]);

  if (state.status !== "remedial" && state.status !== "retake") return null;

  async function selesai(idRemedial: number) {
    if (sibuk) return;
    setBusyId(idRemedial);
    setError(null);
    try {
      await markRemedialDone(idMahasiswa, idModul, idRemedial, state.lastAttemptKe);
      await onChanged();
    } catch {
      setError("Gagal menyimpan. Periksa koneksi lalu coba lagi.");
    } finally {
      setBusyId(null);
    }
  }

  const isLoading = isLoadingAi || isGeneratingAi;
  const pct = Math.min(100, Math.round((state.bestScore / state.passScore) * 100));

  /* ── 3. Filter materi HANYA untuk topik aktif & fokus ke penjelasan materi ── */
  const focusedAiMaterials = useMemo(() => {
    const pure = aiMaterials.filter((m) => {
      // Abaikan tipe non-materi (tips/panduan umum dsb) agar mahasiswa fokus ke materi
      if (m.tipe === "tips") return false;
      if (remedialTopics.length <= 1) return true;
      if (m.idSubTopik === currentTopic.id_sub_topik) return true;
      if ((!m.idSubTopik || m.idSubTopik === 0) && currentTopicIndex === 0) return true;
      return false;
    });

    // Dahulukan materi penjelasan (batasi 1 materi utama yang komprehensif agar fokus)
    const penjelasanList = pure.filter((m) => m.tipe === "penjelasan");
    if (penjelasanList.length > 0) {
      return penjelasanList.slice(0, 1);
    }
    return pure.slice(0, 1);
  }, [aiMaterials, remedialTopics.length, currentTopic.id_sub_topik, currentTopicIndex]);

  const currentOfficialRemedial = state.remedial.filter((r) => {
    if (remedialTopics.length <= 1) return true;
    if (r.id_sub_topik === currentTopic.id_sub_topik) return true;
    if (!r.id_sub_topik && currentTopicIndex === 0) return true;
    return false;
  });

  return (
    <div className="space-y-6">
      {/* ─── 1. REMEDIAL HEADER ─── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#2f1f58] to-[#1f1538] p-6 text-white shadow-lg border border-purple-400/20">
        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
                <Brain className="h-5 w-5 text-purple-200" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-purple-200">
                    Pembelajaran Remedial
                  </span>
                  <span className="text-xs text-purple-300/80">
                    Percobaan ke-{state.lastAttemptKe}
                  </span>
                </div>
                <h3 className="text-lg md:text-xl font-bold tracking-tight mt-0.5">
                  Pelajari Kembali Materi yang Belum Dikuasai
                </h3>
                <p className="text-sm text-purple-100/80 mt-0.5">
                  Pahami materi di bawah ini terlebih dahulu sebelum mengerjakan kuis ulang.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerateAiMaterials}
              disabled={isGeneratingAi}
              className="group flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 px-3.5 py-2 text-sm font-medium text-white transition disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${isGeneratingAi ? "animate-spin" : ""}`}
              />
              {isGeneratingAi ? "Memperbarui materi..." : "Perbarui materi remedial"}
            </button>
          </div>

          {/* Progress */}
          <div className="rounded-xl bg-black/20 p-3.5 space-y-2">
            <div className="flex flex-wrap items-center justify-between text-sm">
              <span className="text-purple-100 flex items-center gap-1.5">
                <Target className="h-4 w-4" />
                Target nilai lulus
              </span>
              <div className="flex items-center gap-2">
                <span className="text-purple-200">Nilai tertinggi:</span>
                <span className="font-semibold">{state.bestScore}%</span>
                <span className="text-purple-300/70">/</span>
                <span className="font-semibold text-emerald-300">{state.passScore}%</span>
              </div>
            </div>

            <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-400 to-emerald-400 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-purple-100/90">
              <span>
                {state.canRetake
                  ? "Semua materi wajib sudah dipelajari. Kamu siap mengerjakan kuis ulang."
                  : `Pelajari topik ${currentTopicIndex + 1} dari ${remedialTopics.length} untuk bisa mengerjakan kuis ulang.`}
              </span>
              <span className="shrink-0">{pct}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. TOPIK REMEDIAL ─── */}
      {remedialTopics.length > 1 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
              <Compass className="h-4 w-4 text-purple-600" />
              Daftar topik yang perlu dipelajari ({remedialTopics.length})
            </span>
            <span className="text-sm text-gray-500">
              Topik {currentTopicIndex + 1} dari {remedialTopics.length}
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {remedialTopics.map((topik, idx) => {
              const isActive = idx === currentTopicIndex;
              return (
                <button
                  key={topik.id_sub_topik}
                  type="button"
                  onClick={() => handleSelectTopic(topik.id_sub_topik)}
                  className={`group relative flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm transition-all ${
                    isActive
                      ? "bg-purple-700 text-white shadow-sm"
                      : "bg-white text-gray-700 border border-gray-200 hover:border-purple-300 hover:bg-purple-50/60"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-purple-100 text-purple-700"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className="max-w-[200px] truncate">{topik.judul}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── 3. ERROR BANNER ─── */}
      {error && (
        <div className="flex items-start gap-2.5 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs font-semibold text-rose-700 shadow-sm">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* ─── 4. KONTEN TOPIK AKTIF ─── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 shadow-sm space-y-6">
        {/* Judul topik */}
        <div className="border-b border-gray-100 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700">
              <BookMarked className="h-3.5 w-3.5" />
              Topik {currentTopicIndex + 1} dari {remedialTopics.length}
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-semibold text-gray-900 leading-snug">
            {currentTopic.judul}
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Pelajari materi ini untuk memperkuat pemahaman sebelum mengerjakan kuis ulang.
          </p>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="space-y-4 py-6">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-gray-200 bg-gray-50/50 p-5 animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-28 rounded-full bg-gray-200" />
                    <div className="h-4 w-56 rounded-full bg-gray-200" />
                  </div>
                </div>
              </div>
            ))}
            <p className="flex items-center justify-center gap-2 text-center text-sm text-gray-500 pt-2">
              <Clock className="h-4 w-4 animate-spin" />
              {isGeneratingAi
                ? "Membuat materi remedial..."
                : "Memuat materi..."}
            </p>
          </div>
        )}

        {/* Konten jika tidak sedang loading */}
        {!isLoading && (
          <div className="space-y-6">
            {/* Materi Resmi Dosen (jika ada pada topik ini) */}
            {currentOfficialRemedial.length > 0 && (
              <div className="space-y-3">
                <h4 className="flex items-center gap-2 text-xs font-black text-gray-700 uppercase tracking-wider">
                  <BookOpen className="h-4 w-4 text-purple-600" />
                  Materi Pembelajaran Resmi Modul
                </h4>
                {currentOfficialRemedial.map((r) => {
                  const tautan = r.tipe === "teks" ? null : urlAman(r.konten);
                  return (
                    <div
                      key={r.id_remedial}
                      className={`rounded-xl border p-4 transition-all ${
                        r.selesai
                          ? "border-emerald-200 bg-emerald-50/40"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          {r.selesai ? (
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shrink-0 mt-0.5">
                              <CheckCircle2 className="h-4 w-4" />
                            </span>
                          ) : (
                            <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-gray-300 text-gray-400 shrink-0 mt-0.5" />
                          )}
                          <div className="min-w-0">
                            <p
                              className={`text-sm font-medium leading-snug ${
                                r.selesai
                                  ? "text-emerald-800 line-through decoration-emerald-400"
                                  : "text-gray-900"
                              }`}
                            >
                              {r.judul}
                            </p>
                            {r.tipe === "teks" && r.konten && (
                              <p className="mt-2 text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                                {r.konten}
                              </p>
                            )}
                            {r.tipe !== "teks" &&
                              (tautan ? (
                                <a
                                  href={tautan}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-2 inline-flex items-center gap-1.5 text-sm text-purple-700 hover:text-purple-900"
                                >
                                  {r.tipe === "video" ? "Putar video" : "Buka dokumen"}
                                </a>
                              ) : (
                                <p className="mt-1 text-sm text-gray-400">
                                  Tautan tidak tersedia
                                </p>
                              ))}
                          </div>
                        </div>
                        {!r.selesai && (
                          <button
                            type="button"
                            disabled={sibuk}
                            onClick={() => selesai(r.id_remedial)}
                            className="shrink-0 rounded-lg bg-purple-700 hover:bg-purple-800 px-3 py-1.5 text-sm text-white transition disabled:opacity-50"
                          >
                            {busyId === r.id_remedial ? "Menyimpan..." : "Tandai sudah dipelajari"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Materi Rekomendasi Terfokus */}
            {focusedAiMaterials.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <BookOpen className="h-4 w-4 text-purple-600" />
                    Materi penguatan
                  </h4>
                  <span className="text-xs text-gray-500">
                    Fokus pada materi utama
                  </span>
                </div>

                <div className="space-y-4">
                  {focusedAiMaterials.map((m) => (
                    <MaterialCard key={m.id} material={m} />
                  ))}
                </div>
              </div>
            ) : (
              currentOfficialRemedial.length === 0 && (
                <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-8 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-purple-700">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <p className="text-base font-medium text-gray-900">
                    Belum ada materi penguatan
                  </p>
                  <p className="mt-1 text-sm text-gray-600 max-w-md mx-auto">
                    Sistem dapat membuat materi penguatan berdasarkan soal yang kamu salah jawab.
                  </p>
                  <button
                    type="button"
                    onClick={handleGenerateAiMaterials}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-purple-700 hover:bg-purple-800 px-4 py-2 text-sm text-white transition"
                  >
                    <Sparkles className="h-4 w-4" />
                    Buat materi penguatan
                  </button>
                </div>
              )
            )}
          </div>
        )}

        {/* ─── 5. NAVIGASI ─── */}
        <div className="mt-6 border-t border-gray-100 pt-5 flex flex-wrap items-center justify-between gap-4">
          {/* Tombol Sebelumnya */}
          <div>
            {currentTopicIndex > 0 ? (
              <button
                type="button"
                onClick={handlePrevTopic}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 px-3.5 py-2 text-sm text-gray-700 transition"
              >
                <ArrowLeft className="h-4 w-4" />
                Topik sebelumnya
              </button>
            ) : (
              <div className="text-sm text-gray-400 pl-1">
                Awal
              </div>
            )}
          </div>

          {/* Indikator */}
          <div className="flex items-center gap-1.5">
            {remedialTopics.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full ${
                  i === currentTopicIndex
                    ? "w-6 bg-purple-600"
                    : "w-1.5 bg-gray-200"
                }`}
              />
            ))}
          </div>

          {/* Tombol Selanjutnya / Ulangi Kuis */}
          <div>
            {currentTopicIndex < remedialTopics.length - 1 ? (
              <button
                type="button"
                onClick={handleNextTopic}
                className="flex items-center gap-2 rounded-lg bg-purple-700 hover:bg-purple-800 px-4 py-2 text-sm text-white transition"
              >
                Topik selanjutnya
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : state.canRetake ? (
              <button
                type="button"
                onClick={onRetake}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-sm text-white transition"
              >
                <RotateCcw className="h-4 w-4" />
                Kerjakan kuis ulang
              </button>
            ) : (
              <div className="text-sm text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                Selesaikan semua materi untuk mengerjakan kuis ulang
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}