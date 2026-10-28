"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation"; 
import { useCurrentUser } from "@/hooks/useCurrentUser"; 

interface SettingsModalProps {
  onClose: () => void;
  isBgmEnabled: boolean;
  setIsBgmEnabled: (val: boolean) => void;
  isSfxEnabled: boolean;
  setIsSfxEnabled: (val: boolean) => void;
}

export default function SettingsModal({ onClose, isBgmEnabled, setIsBgmEnabled, isSfxEnabled, setIsSfxEnabled }: SettingsModalProps) {
  const [mounted, setMounted] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  
  const router = useRouter(); 
  const { profile } = useCurrentUser(); 

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const displayAvatar = profile?.avatarUrl || "https://api.dicebear.com/7.x/micah/svg?seed=Renald&backgroundColor=transparent";
  const displayName = profile?.namaMahasiswa || "Pemain Misterius";

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#5B5288] w-full max-w-[400px] rounded-3xl p-8 shadow-2xl relative animate-fade-in-up transition-all">
        
        {!showExitConfirm ? (
          <>
            {/* User Info Dinamis */}
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 bg-[#769FCD] rounded-full overflow-hidden shadow-sm border-2 border-white/20">
                <img src={displayAvatar} className="w-full h-full object-cover p-1" alt="Avatar" />
              </div>
              <span className="text-xl font-bold text-white">{displayName}</span>
            </div>

            {/* Link Ruangan DIHAPUS dari sini karena permainan sudah dimulai */}

            {/* Sound Toggles */}
            <h3 className="text-white text-center font-bold mb-5">Pengaturan Suara</h3>
            <div className="space-y-5 mb-10 px-2">
              
              <div className="flex justify-between items-center text-white/90 text-[15px] font-semibold">
                <span className="flex items-center gap-2">Musik Latar (BGM)</span>
                <div 
                  onClick={() => setIsBgmEnabled(!isBgmEnabled)}
                  className={`w-14 h-7 rounded-full relative cursor-pointer shadow-inner transition-colors ${isBgmEnabled ? 'bg-[#39C936]' : 'bg-gray-400'}`}
                >
                  <div className={`w-6 h-6 bg-white rounded-full absolute top-0.5 shadow-sm transition-all ${isBgmEnabled ? 'right-0.5' : 'left-0.5'}`}></div>
                </div>
              </div>

              <div className="flex justify-between items-center text-white/90 text-[15px] font-semibold">
                <span className="flex items-center gap-2">Efek Suara (SFX)</span>
                <div 
                  onClick={() => setIsSfxEnabled(!isSfxEnabled)}
                  className={`w-14 h-7 rounded-full relative cursor-pointer shadow-inner transition-colors ${isSfxEnabled ? 'bg-[#39C936]' : 'bg-gray-400'}`}
                >
                  <div className={`w-6 h-6 bg-white rounded-full absolute top-0.5 shadow-sm transition-all ${isSfxEnabled ? 'right-0.5' : 'left-0.5'}`}></div>
                </div>
              </div>

            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button onClick={onClose} className="flex-1 bg-[#39C936] text-white font-extrabold py-3.5 rounded-xl text-sm shadow-lg hover:brightness-110 transition-all">
                Lanjutkan
              </button>
              <button onClick={() => setShowExitConfirm(true)} className="flex-1 bg-white text-[#E73131] font-extrabold py-3.5 rounded-xl text-sm shadow-lg hover:bg-gray-50 transition-all">
                Keluar Arena
              </button>
            </div>
          </>
        ) : (
          /* TAMPILAN KONFIRMASI KELUAR */
          <div className="text-center py-4 animate-fade-in-up">
            <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">⚠️</span>
            </div>
            <h3 className="text-white text-xl font-bold mb-2">Yakin Ingin Keluar?</h3>
            <p className="text-white/70 text-sm mb-8 px-4">
              Progress permainanmu di ruangan ini mungkin tidak akan tersimpan jika kamu keluar sekarang.
            </p>
            <div className="flex gap-4">
              <button onClick={() => setShowExitConfirm(false)} className="flex-1 bg-white text-[#5B5288] font-extrabold py-3.5 rounded-xl text-sm shadow-lg hover:bg-gray-50 transition-all">
                Batal
              </button>
              <button onClick={() => router.push('/mahasiswa/arena')} className="flex-1 bg-[#E73131] text-white font-extrabold py-3.5 rounded-xl text-sm shadow-lg hover:brightness-110 transition-all">
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