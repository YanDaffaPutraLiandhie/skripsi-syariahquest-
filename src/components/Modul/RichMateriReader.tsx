"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  BookOpen,
  Sparkles,
  Clock,
  CheckCircle2,
  Bookmark,
  FileText,
  Lightbulb,
  Scale,
  Scroll,
  Type,
  ArrowRight,
  Quote,
  Eye,
  Check,
  Zap,
  HelpCircle,
  AlertTriangle,
  Flame,
  Volume2,
  VolumeX,
} from "lucide-react";

type RichMateriReaderProps = {
  rawContent: string;
  moduleTitle: string;
  subTopikList?: Array<{ id_sub_topik: number; judul: string }>;
  onFinishReading?: () => void;
};

type ContentBlock =
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "dalil"; text: string; source?: string }
  | { type: "case"; title: string; text: string }
  | { type: "alert"; text: string }
  | { type: "numbered"; items: string[] }
  | { type: "bullets"; items: string[] }
  | { type: "paragraph"; text: string; isOpening?: boolean };

// Helper to format inline markdown (bold, italic, code)
function formatInlineText(text: string): React.ReactNode[] {
  // Split on bold **...** first
  const boldParts = text.split(/(\*\*[^*]+\*\*)/g);
  return boldParts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-extrabold text-[#3D2C6D] bg-purple-100/60 px-1 py-0.5 rounded">
          {part.slice(2, -2)}
        </strong>
      );
    }
    // Check italics *...*
    const italicParts = part.split(/(\*[^*]+\*)/g);
    return italicParts.map((sub, j) => {
      if (sub.startsWith("*") && sub.endsWith("*")) {
        return (
          <em key={`${i}-${j}`} className="font-medium italic text-purple-900">
            {sub.slice(1, -1)}
          </em>
        );
      }
      return sub;
    });
  });
}

// Smart parser: Converts raw module text into structured semantic blocks
function parseMateriToBlocks(raw: string): ContentBlock[] {
  if (!raw || raw.trim() === "") return [];

  // Remove HTML tags if present (e.g. from WYSIWYG)
  const clean = raw.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, "");
  const lines = clean.split("\n");

  const blocks: ContentBlock[] = [];
  let currentBullets: string[] = [];
  let currentNumbered: string[] = [];

  const flushLists = () => {
    if (currentBullets.length > 0) {
      blocks.push({ type: "bullets", items: [...currentBullets] });
      currentBullets = [];
    }
    if (currentNumbered.length > 0) {
      blocks.push({ type: "numbered", items: [...currentNumbered] });
      currentNumbered = [];
    }
  };

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx].trim();
    if (!line) {
      flushLists();
      continue;
    }

    // 1. Headings (Markdown ### or ## or #)
    if (line.startsWith("### ")) {
      flushLists();
      blocks.push({ type: "heading", level: 3, text: line.replace(/^###\s*/, "") });
      continue;
    }
    if (line.startsWith("## ") || line.startsWith("# ")) {
      flushLists();
      blocks.push({ type: "heading", level: 2, text: line.replace(/^#+\s*/, "") });
      continue;
    }

    // 2. Heading by title case with colon (e.g., "A. Pengertian Akad:", "1. Rukun Jual Beli:")
    if (
      line.endsWith(":") &&
      line.length < 90 &&
      (line.match(/^[A-Z0-9]\.\s/) || line.match(/^[0-9]+\.\s/) || line.split(" ").length <= 8)
    ) {
      flushLists();
      blocks.push({ type: "heading", level: 3, text: line.slice(0, -1) });
      continue;
    }

    // 3. Dalil / Ayat / Hadits blockquote (> ...)
    if (
      line.startsWith("> ") ||
      line.toLowerCase().startsWith("dalil:") ||
      line.toLowerCase().startsWith("hadits:") ||
      line.toLowerCase().startsWith("firman allah:")
    ) {
      flushLists();
      const content = line.startsWith("> ") ? line.slice(2) : line;
      blocks.push({ type: "dalil", text: content });
      continue;
    }

    // 4. Contoh Kasus / Analisis Penerapan (💡 or "Contoh Kasus:" or "Contoh:")
    if (
      line.includes("💡") ||
      line.toLowerCase().startsWith("contoh kasus:") ||
      line.toLowerCase().startsWith("contoh:") ||
      line.toLowerCase().startsWith("penerapan:")
    ) {
      flushLists();
      const parts = line.split(/:\s*/);
      const title = parts.length > 1 ? parts[0].replace(/💡|\*\*/g, "").trim() : "Contoh Kasus / Penerapan";
      const text = parts.length > 1 ? parts.slice(1).join(": ") : line;
      blocks.push({ type: "case", title, text });
      continue;
    }

    // 5. Alert / Catatan Penting (⚠️ or "Perhatian:" or "Catatan Penting:")
    if (
      line.includes("⚠️") ||
      line.toLowerCase().startsWith("perhatian:") ||
      line.toLowerCase().startsWith("catatan:") ||
      line.toLowerCase().startsWith("penting:")
    ) {
      flushLists();
      blocks.push({ type: "alert", text: line.replace(/⚠️|\*\*/g, "").trim() });
      continue;
    }

    // 6. Numbered list item (e.g. 1. , 2. )
    const numberedMatch = line.match(/^([0-9]+)[\.\)]\s+(.+)$/);
    if (numberedMatch) {
      if (currentBullets.length > 0) flushLists();
      currentNumbered.push(numberedMatch[2]);
      continue;
    }

    // 7. Bullet list item (-, *, •)
    if (line.match(/^[\-\*•]\s+(.+)$/)) {
      if (currentNumbered.length > 0) flushLists();
      currentBullets.push(line.replace(/^[\-\*•]\s+/, ""));
      continue;
    }

    // 8. Regular paragraph
    flushLists();
    blocks.push({
      type: "paragraph",
      text: line,
      isOpening: blocks.length === 0,
    });
  }

  flushLists();
  return blocks;
}

export default function RichMateriReader({
  rawContent,
  moduleTitle,
  subTopikList = [],
  onFinishReading,
}: RichMateriReaderProps) {
  // Reading preferences
  const [fontSize, setFontSize] = useState<"sm" | "base" | "lg">("base");
  const [theme, setTheme] = useState<"clean" | "warm" | "night">("clean");
  const [readCheckpoints, setReadCheckpoints] = useState<Record<number, boolean>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);

  // Parse blocks
  const blocks = useMemo(() => parseMateriToBlocks(rawContent), [rawContent]);

  // Estimated reading time
  const stats = useMemo(() => {
    const wordCount = rawContent.trim().split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.ceil(wordCount / 175)); // Average Indonesian reading speed: 175 wpm
    return { wordCount, minutes };
  }, [rawContent]);

  // Track scroll progress within reader
  const handleScroll = () => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const rect = el.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const totalHeight = el.offsetHeight;
    const visibleTop = Math.max(0, -rect.top);
    const progress = Math.min(100, Math.round((visibleTop / (totalHeight - windowHeight + 200)) * 100));
    setScrollProgress(Math.max(0, progress));
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Theme styling
  const themeClasses = {
    clean: {
      bg: "bg-white",
      text: "text-gray-800",
      border: "border-gray-200",
      subtle: "bg-purple-50/50",
    },
    warm: {
      bg: "bg-[#FFFDF9]",
      text: "text-[#3D352E]",
      border: "border-[#F0E6D8]",
      subtle: "bg-[#F7EFE3]/60",
    },
    night: {
      bg: "bg-[#1E1B2E]",
      text: "text-purple-100",
      border: "border-purple-900/50",
      subtle: "bg-purple-950/40",
    },
  }[theme];

  // Font size classes
  const fontClasses = {
    sm: "text-[13.5px] leading-relaxed",
    base: "text-[15px] leading-[1.8]",
    lg: "text-[16.5px] leading-[1.9]",
  }[fontSize];

  const toggleCheckpoint = (idx: number) => {
    setReadCheckpoints((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const handleComplete = () => {
    setIsCompleted(true);
    if (onFinishReading) {
      onFinishReading();
    }
  };

  if (!rawContent || rawContent.trim() === "") {
    return (
      <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50/70 p-10 text-center">
        <BookOpen className="mx-auto h-10 w-10 text-gray-300 mb-2" />
        <p className="text-sm font-semibold text-gray-500">Materi teks belum ditambahkan oleh dosen pengampu.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`rounded-3xl border ${themeClasses.border} ${themeClasses.bg} shadow-xl shadow-[#3D2C6D]/5 transition-colors duration-300 overflow-hidden relative`}
    >
      {/* ── STICKY READING HUD TOOLBAR ── */}
      <div className="sticky top-16 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200/80 bg-white/95 px-5 py-3 backdrop-blur-md">
        {/* Left: Reading stats */}
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-black text-[#5B5288] border border-purple-200/80">
            <Clock className="h-3.5 w-3.5 text-purple-600" />
            ± {stats.minutes} Menit Baca
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-gray-400">
            <FileText className="h-3 w-3" />
            {stats.wordCount} Kata
          </span>
        </div>

        {/* Right: Controls (Font size, Theme, Focus) */}
        <div className="flex items-center gap-2">
          {/* Font Size controls */}
          <div className="flex items-center rounded-xl bg-gray-100 p-0.5 border border-gray-200/60">
            <button
              type="button"
              onClick={() => setFontSize("sm")}
              title="Huruf Kecil"
              className={`rounded-lg px-2 py-1 text-xs font-bold transition ${
                fontSize === "sm" ? "bg-white text-[#3D2C6D] shadow-xs" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              A-
            </button>
            <button
              type="button"
              onClick={() => setFontSize("base")}
              title="Huruf Standar"
              className={`rounded-lg px-2 py-1 text-xs font-bold transition ${
                fontSize === "base" ? "bg-white text-[#3D2C6D] shadow-xs" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              A
            </button>
            <button
              type="button"
              onClick={() => setFontSize("lg")}
              title="Huruf Besar"
              className={`rounded-lg px-2 py-1 text-xs font-bold transition ${
                fontSize === "lg" ? "bg-white text-[#3D2C6D] shadow-xs" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              A+
            </button>
          </div>

          {/* Theme palette toggle */}
          <div className="flex items-center rounded-xl bg-gray-100 p-0.5 border border-gray-200/60">
            <button
              type="button"
              onClick={() => setTheme("clean")}
              title="Mode Bersih"
              className={`h-6 w-6 rounded-lg flex items-center justify-center transition text-xs font-bold ${
                theme === "clean" ? "bg-white shadow-xs text-purple-900" : "text-gray-400 hover:text-gray-700"
              }`}
            >
              ☀️
            </button>
            <button
              type="button"
              onClick={() => setTheme("warm")}
              title="Mode Hangat / Kertas"
              className={`h-6 w-6 rounded-lg flex items-center justify-center transition text-xs font-bold ${
                theme === "warm" ? "bg-[#FFF4E5] text-amber-800 shadow-xs" : "text-gray-400 hover:text-gray-700"
              }`}
            >
              📖
            </button>
            <button
              type="button"
              onClick={() => setTheme("night")}
              title="Mode Teduh"
              className={`h-6 w-6 rounded-lg flex items-center justify-center transition text-xs font-bold ${
                theme === "night" ? "bg-[#2A2440] text-purple-200 shadow-xs" : "text-gray-400 hover:text-gray-700"
              }`}
            >
              🌙
            </button>
          </div>
        </div>
      </div>

      {/* Reading Progress Indicator line */}
      <div className="h-1 w-full bg-gray-100">
        <div
          className="h-full bg-gradient-to-r from-purple-500 via-amber-400 to-emerald-400 transition-all duration-300"
          style={{ width: `${Math.max(5, scrollProgress)}%` }}
        />
      </div>

      {/* ── PETA POKOK BAHASAN (CONCEPT MAP CARD) ── */}
      {subTopikList.length > 0 && (
        <div className="m-5 md:m-8 rounded-2xl border border-purple-200/80 bg-gradient-to-br from-[#F8F7FD] to-purple-50/40 p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#5B5288] text-white shadow-xs">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-[#3D2C6D]">
                Peta Konsep & Pokok Bahasan
              </h3>
              <p className="text-[11px] text-gray-500 font-medium">
                Kuasai seluruh poin ini untuk mempersiapkan kuis evaluasi
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {subTopikList.map((st, i) => (
              <div
                key={st.id_sub_topik}
                className="flex items-start gap-2.5 rounded-xl border border-purple-100 bg-white/90 p-2.5 shadow-xs hover:border-purple-300 transition-colors"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100 text-[10px] font-black text-[#5B5288]">
                  {i + 1}
                </span>
                <span className="text-xs font-bold text-gray-800 leading-tight">
                  {st.judul}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── KONTEN UTAMA MATERI DENGAN VISUAL CARDS ── */}
      <div className={`p-6 md:p-10 space-y-6 ${themeClasses.text} ${fontClasses}`}>
        {blocks.map((block, idx) => {
          switch (block.type) {
            case "heading": {
              return (
                <div
                  key={idx}
                  className="mt-8 mb-4 pt-4 border-t border-dashed border-gray-200/80 flex items-center gap-3"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#4A3F7A] to-[#3D2C6D] text-white shadow-sm">
                    <Bookmark className="h-4 w-4" />
                  </span>
                  <h3
                    className={`font-black tracking-tight ${
                      block.level === 2
                        ? "text-xl md:text-2xl text-[#3D2C6D]"
                        : "text-lg md:text-xl text-[#4A3F7A]"
                    }`}
                  >
                    {block.text}
                  </h3>
                </div>
              );
            }

            case "dalil": {
              return (
                <div
                  key={idx}
                  className="my-5 rounded-2xl border-l-4 border-emerald-500 bg-gradient-to-r from-emerald-50/80 via-emerald-50/40 to-transparent p-5 shadow-xs"
                >
                  <div className="flex items-center gap-2 mb-2 text-emerald-800 text-xs font-black uppercase tracking-wider">
                    <Scroll className="h-4 w-4 text-emerald-600" />
                    <span>Rujukan Dalil / Fikih Syariah</span>
                  </div>
                  <blockquote className="text-emerald-950 font-serif italic text-[15px] md:text-[16px] leading-relaxed">
                    “{block.text}”
                  </blockquote>
                </div>
              );
            }

            case "case": {
              return (
                <div
                  key={idx}
                  className="my-5 rounded-2xl border border-amber-300/80 bg-gradient-to-br from-amber-50/90 to-yellow-50/50 p-5 shadow-xs"
                >
                  <div className="flex items-center gap-2 mb-2 text-amber-900 text-xs font-black uppercase tracking-wider">
                    <Lightbulb className="h-4 w-4 text-amber-600" />
                    <span>{block.title}</span>
                  </div>
                  <p className="text-amber-950 font-medium leading-relaxed">
                    {formatInlineText(block.text)}
                  </p>
                </div>
              );
            }

            case "alert": {
              return (
                <div
                  key={idx}
                  className="my-4 rounded-2xl border border-purple-300/80 bg-purple-50/70 p-4 flex items-start gap-3 shadow-xs"
                >
                  <AlertTriangle className="h-5 w-5 text-purple-700 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-purple-900 mb-1">
                      Catatan Penting
                    </h4>
                    <p className="text-purple-950 text-sm font-medium leading-relaxed">
                      {formatInlineText(block.text)}
                    </p>
                  </div>
                </div>
              );
            }

            case "numbered": {
              return (
                <div key={idx} className="my-4 space-y-2.5">
                  {block.items.map((item, itemIdx) => (
                    <div
                      key={itemIdx}
                      className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white/80 p-3.5 shadow-2xs hover:border-purple-200 transition"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#5B5288] text-xs font-black text-white shadow-2xs">
                        {itemIdx + 1}
                      </span>
                      <div className="flex-1 font-medium text-gray-800 leading-relaxed">
                        {formatInlineText(item)}
                      </div>
                    </div>
                  ))}
                </div>
              );
            }

            case "bullets": {
              return (
                <div key={idx} className="my-4 space-y-2">
                  {block.items.map((item, itemIdx) => (
                    <div
                      key={itemIdx}
                      className="flex items-start gap-3 rounded-xl border border-purple-50 bg-purple-50/30 p-3 hover:bg-purple-50/60 transition"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white mt-0.5">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </span>
                      <div className="flex-1 font-medium text-gray-800 leading-relaxed">
                        {formatInlineText(item)}
                      </div>
                    </div>
                  ))}
                </div>
              );
            }

            case "paragraph":
            default: {
              return (
                <p
                  key={idx}
                  className={`leading-relaxed text-justify ${
                    block.isOpening
                      ? "first-letter:text-4xl first-letter:font-black first-letter:text-[#4A3F7A] first-letter:mr-2 first-letter:float-left font-medium"
                      : ""
                  }`}
                >
                  {formatInlineText(block.text)}
                </p>
              );
            }
          }
        })}
      </div>

      {/* ── CARD SELESAI MEMBACA & CELEBRATION CHECKPOINT ── */}
      <div className="m-5 md:m-8 rounded-3xl border border-emerald-300 bg-gradient-to-br from-emerald-50/80 via-white to-purple-50/50 p-6 md:p-8 text-center shadow-lg shadow-emerald-500/10">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 shadow-sm border border-emerald-200">
          {isCompleted ? (
            <CheckCircle2 className="h-8 w-8 text-emerald-600 animate-bounce" />
          ) : (
            <Sparkles className="h-7 w-7 text-emerald-600" />
          )}
        </div>

        <h3 className="text-xl md:text-2xl font-black text-gray-900">
          {isCompleted ? "Luar Biasa! Materi Telah Kamu Pahami 🎉" : "Selesai Membaca Materi Ini?"}
        </h3>
        <p className="mx-auto mt-2 max-w-lg text-sm text-gray-600 leading-relaxed">
          {isCompleted
            ? "Kamu sudah membaca seluruh penjelasan konsep. Sekarang saatnya menguji pemahamanmu di Kuis Evaluasi untuk meraih XP dan meluluskan modul!"
            : "Setelah memahami konsep di atas, tandai penyelesaian bacamu dan lanjutkan ke Kuis Evaluasi untuk menguji pemahaman."}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {!isCompleted ? (
            <button
              type="button"
              onClick={handleComplete}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 px-6 py-3 text-sm font-black text-white shadow-md shadow-emerald-600/30 transition transform hover:-translate-y-0.5"
            >
              <Check className="h-4 w-4 stroke-[3]" />
              Saya Sudah Paham Materi Ini
            </button>
          ) : (
            <button
              type="button"
              onClick={handleComplete}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#4A3F7A] to-[#3D2C6D] hover:opacity-95 px-6 py-3 text-sm font-black text-white shadow-md shadow-purple-900/30 transition transform hover:-translate-y-0.5"
            >
              <span>Lanjut ke Kuis Evaluasi</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
