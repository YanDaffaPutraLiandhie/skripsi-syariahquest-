"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Copy } from "lucide-react";
import { useRouter } from "next/navigation"; // <-- Import Router untuk pindah halaman

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  
  // STATE BARU: Untuk melacak apakah tampilan konfirmasi keluar sedang aktif
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  
  const router = useRouter(); // Inisialisasi router

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#5B5288] w-full max-w-[400px] rounded-3xl p-8 shadow-2xl relative animate-fade-in-up transition-all">
        
        {/* LOGIKA TAMPILAN: Jika konfirmasi belum aktif, tampilkan setting biasa */}
        {!showExitConfirm ? (
          <>
            {/* User Info */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-[#769FCD] rounded-2xl overflow-hidden shadow-sm border-2 border-white/20">
                <img src="https://api.dicebear.com/7.x/micah/svg?seed=Renald&backgroundColor=transparent" className="w-full h-full object-cover pt-1" alt="Avatar" />
              </div>
              <span className="text-xl font-bold text-white">Renald Agustinus</span>
            </div>

            {/* Room Link */}
            <div className="bg-white rounded-xl flex items-center justify-between p-1.5 pl-4 mb-8 shadow-sm">
              <span className="text-[#5B5288]/70 font-medium text-sm truncate flex-1">syariahquest.app/play/room-xyz98</span>
              <button className="p-2 rounded-lg hover:bg-gray-100 text-[#5B5288] transition-colors">
                <Copy className="w-5 h-5" />
              </button>
            </div>

            {/* Sound Toggles */}
            <h3 className="text-white text-center font-bold mb-4">Pengaturan Suara</h3>
            <div className="space-y-4 mb-8 px-4">
              <div className="flex justify-between items-center text-white/90 text-sm font-semibold">
                <span className="flex items-center gap-2">Musik Latar</span>
                <div className="w-12 h-6 bg-[#39C936] rounded-full relative cursor-pointer shadow-inner">
                  <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5 shadow-sm"></div>
                </div>
              </div>
              <div className="flex justify-between items-center text-white/90 text-sm font-semibold">
                <span className="flex items-center gap-2">Efek Suara</span>
                <div className="w-12 h-6 bg-[#39C936] rounded-full relative cursor-pointer shadow-inner">
                  <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5 shadow-sm"></div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button 
                onClick={onClose} 
                className="flex-1 bg-[#39C936] text-white font-extrabold py-3.5 rounded-xl text-sm shadow-lg hover:brightness-110 transition-all"
              >
                Lanjutkan
              </button>
              
              <button 
                // KETIKA DIKLIK, AKTIFKAN TAMPILAN KONFIRMASI (Bukan onClose)
                onClick={() => setShowExitConfirm(true)} 
                className="flex-1 bg-white text-[#E73131] font-extrabold py-3.5 rounded-xl text-sm shadow-lg hover:bg-gray-50 transition-all"
              >
                Keluar
              </button>
            </div>
          </>
        ) : (
          /* ========================================= */
          /* TAMPILAN KONFIRMASI KELUAR                */
          /* ========================================= */
          <div className="text-center py-4 animate-fade-in-up">
            <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">⚠️</span>
            </div>
            
            <h3 className="text-white text-xl font-bold mb-2">
              Yakin Ingin Keluar?
            </h3>
            
            <p className="text-white/70 text-sm mb-8 px-4">
              Progress permainanmu di ruangan ini mungkin tidak akan tersimpan jika kamu keluar sekarang.
            </p>
            
            <div className="flex gap-4">
              <button 
                // KEMBALI KE SETTING AWAL JIKA BATAL
                onClick={() => setShowExitConfirm(false)} 
                className="flex-1 bg-white text-[#5B5288] font-extrabold py-3.5 rounded-xl text-sm shadow-lg hover:bg-gray-50 transition-all"
              >
                Batal
              </button>
              
              <button 
                // TENDANG USER KE DASHBOARD ARENA JIKA IYA
                onClick={() => router.push('/arena')} 
                className="flex-1 bg-[#E73131] text-white font-extrabold py-3.5 rounded-xl text-sm shadow-lg hover:brightness-110 transition-all"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        )}

      </div>
    </div>,
    document.body
  );
}