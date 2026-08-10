"use client";

import { X, Trophy } from "lucide-react";
import type { UserBadge } from "@/hooks/useBadges";

type AllBadgesModalProps = {
  isOpen: boolean;
  onClose: () => void;
  badges: UserBadge[];
};

export default function AllBadgesModal({ isOpen, onClose, badges }: AllBadgesModalProps) {
  if (!isOpen) return null;

  return (
    // FIX: Tambah z-[9999], h-[100dvh], dan w-screen biar nutup full
    <div className="fixed inset-0 z-[9999] h-[100dvh] w-screen flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[30px] w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* HEADER MODAL */}
        <div className="bg-[#5B5288] p-6 text-white flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2"></div>
          
          <div className="flex items-center gap-3 relative z-10">
            <div className="bg-white/20 p-3 rounded-2xl">
              <Trophy className="w-8 h-8 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black">Koleksi Badges</h2>
              <p className="text-white/70 text-sm font-medium">
                Kamu telah mengumpulkan {badges.length} pencapaian!
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="relative z-10 p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* ISI MODAL (SCROLLABLE) */}
        <div className="p-6 overflow-y-auto bg-gray-50 flex-1 no-scrollbar">
          {badges.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 opacity-50">
              <Trophy className="w-16 h-16 mb-4 text-gray-400" />
              <p className="font-bold text-lg text-gray-500">Belum ada Badge</p>
              <p className="text-sm text-gray-400 text-center mt-2 max-w-xs">
                Mainkan Arena dan selesaikan modul untuk mendapatkan badge pertamamu!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {badges.map((badge) => (
                <div 
                  key={badge.id_badge} 
                  className="bg-white border-2 border-purple-100 rounded-2xl p-4 flex flex-col items-center text-center shadow-sm hover:shadow-md hover:border-[#5B5288] transition-all group"
                >
                  <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center p-2 mb-3 group-hover:scale-110 transition-transform">
                    <img 
                      src={badge.icon_url} 
                      alt={badge.nama_badge} 
                      className="w-full h-full object-contain drop-shadow-md"
                    />
                  </div>
                  <h4 className="font-black text-[#5B5288] text-base">{badge.nama_badge}</h4>
                  <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wider bg-gray-100 px-2 py-1 rounded-md">
                    {badge.jenis_syarat.replace('_', ' ')}
                  </p>
                  <p className="text-xs text-gray-500 mt-2 font-medium line-clamp-2" title={badge.syarat}>
                    {badge.syarat}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FOOTER MODAL */}
        <div className="p-4 bg-white border-t border-gray-100 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}