"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react"; // Sisakan X saja untuk tombol close

export default function GuideModal({ onClose }: { onClose: () => void }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#5B5288] w-full max-w-[450px] rounded-3xl p-6 shadow-2xl relative animate-fade-in-up flex flex-col max-h-[90vh]">
        
        <button onClick={onClose} className="absolute top-4 right-4 text-red-500 bg-white rounded-lg p-1 hover:bg-red-50 transition-colors shadow-sm">
          <X className="w-5 h-5 font-bold" />
        </button>

        <h2 className="text-2xl font-bold text-white text-center mb-6 mt-2">
          Panduan Bermain
        </h2>

        {/* KONTEN PANDUAN MENGGUNAKAN IMAGE CUSTOM */}
        <div className="overflow-y-auto no-scrollbar flex flex-col gap-3 pb-4">
          {[
            { img: "/images/guide-lempar.png", title: "Lempar & Melangkah", desc: "Tekan tombol ROLL saat giliranmu tiba. Bidakmu akan maju sesuai angka dadu." },
            { img: "/images/guide-jebakan.png", title: "Jebakan Kuis", desc: "Jika bidakmu berhenti di petak Bom, kamu wajib menjawab kuis!" },
            { img: "/images/guide-pedang.png", title: "Toko Skill", desc: "Kumpulkan poin XP untuk membeli taktik rahasia. Skill hanya bisa dibeli 1x per giliran." },
            { img: "/images/skill-dadu.png", title: "Lemparan Ganda (30 Poin)", desc: "Melempar 2 dadu sekaligus untuk melangkah lebih jauh." },
            { img: "/images/skill-perisai.png", title: "Perisai Anti-Bom (40 Poin)", desc: "Menahan 1x ledakan jebakan bom. Kamu aman dan tidak perlu menjawab kuis." },
            { img: "/images/ramuan-pembeku.png", title: "Ramuan Waktu (50 Poin)", desc: "Ajaib! Memberikanmu 1 kali giliran ekstra secara instan." },
            { img: "/images/skill-tukar.png", title: "Jubah Teleportasi (70 Poin)", desc: "Menyalin posisi musuh yang berada paling depan. (Gagal jika kamu sudah di posisi terdepan)." },
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-xl p-4 flex gap-4 items-center shadow-sm">
              <div className="w-12 h-12 flex-shrink-0 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-100 p-1">
                <img src={item.img} alt={item.title} className="w-full h-full object-contain" />
              </div>
              <div>
                <h4 className="font-bold text-[#5B5288] text-sm">{item.title}</h4>
                <p className="text-xs text-gray-500 leading-snug mt-1">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>,
    document.body
  );
}