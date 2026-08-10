"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom"; // <-- Wajib import ini biar backgroundnya full layar
import { supabase } from "@/lib/supabase";

interface EditProfileModalProps {
  mahasiswaId: number;
  initialName: string | null;
  initialDesc: string | null;
  initialAvatar: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditProfileModal({ mahasiswaId, initialName, initialDesc, initialAvatar, onClose, onSuccess }: EditProfileModalProps) {
  const [nama, setNama] = useState(initialName || "");
  const [deskripsi, setDeskripsi] = useState(initialDesc || "");
  const [selectedAvatar, setSelectedAvatar] = useState(initialAvatar || "/images/avatars/avatar1.svg");
  
  const [isSaving, setIsSaving] = useState(false);
  
  // State untuk memastikan window browser sudah siap me-render Portal
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const avatars = Array.from({ length: 9 }, (_, i) => `/images/avatars/avatar${i + 1}.svg`);

  const handleSave = async () => {
    if (!nama.trim()) return alert("Nama tidak boleh kosong!");
    setIsSaving(true);

    const { error } = await supabase
      .from("mahasiswa")
      .update({ 
        nama_mahasiswa: nama,
        deskripsi: deskripsi,
        avatar_url: selectedAvatar 
      })
      .eq("id_mahasiswa", mahasiswaId);

    setIsSaving(false);

    if (!error) {
      onSuccess(); 
      onClose(); 
    } else {
      alert("Gagal menyimpan profil: " + error.message);
    }
  };

  // Kita bungkus semua UI Modal-nya ke dalam variabel
  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in-up">
      <div className="bg-white w-full max-w-2xl rounded-[30px] p-6 lg:p-8 shadow-2xl relative flex flex-col max-h-[90vh]">
        
        <button onClick={onClose} className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-500 hover:bg-red-100 hover:text-red-500 transition-colors font-bold z-10">
          ✕
        </button>

        <h3 className="text-2xl font-bold text-[#5B5288] mb-6 text-center">Edit Profil</h3>

        <div className="overflow-y-auto no-scrollbar px-2 space-y-6">
          
          {/* SECTION: UBAH AVATAR */}
          <div>
            <label className="block text-sm font-bold text-gray-500 mb-3">Pilih Avatar</label>
            <div className="grid grid-cols-4 md:grid-cols-5 gap-3">
              {avatars.map((url, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedAvatar(url)}
                  className={`relative aspect-square rounded-full border-4 transition-all duration-300 overflow-hidden bg-gray-50 flex items-center justify-center ${
                    selectedAvatar === url 
                      ? "border-[#39C936] shadow-[0_0_10px_rgba(57,201,54,0.4)] scale-105" 
                      : "border-transparent hover:border-[#5B5288]/30"
                  }`}
                >
                  <img src={url} alt={`Avatar ${index + 1}`} className="w-full h-full object-contain p-1" />
                </button>
              ))}
            </div>
          </div>

          {/* SECTION: INFORMASI DASAR */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-500 mb-1">Nama Tampilan</label>
              <input 
                type="text" 
                value={nama} 
                onChange={(e) => setNama(e.target.value)}
                className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-[#5B5288] font-bold focus:outline-none focus:border-[#5B5288] transition-colors"
                placeholder="Masukkan nama kamu..."
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-500 mb-1">Deskripsi / Jurusan</label>
              <input 
                type="text" 
                value={deskripsi} 
                onChange={(e) => setDeskripsi(e.target.value)}
                className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-[#5B5288] font-bold focus:outline-none focus:border-[#5B5288] transition-colors"
                placeholder="Contoh: Sistem Informasi Bisnis..."
              />
            </div>
          </div>

        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`w-full py-4 rounded-xl text-lg font-bold transition-all shadow-md mt-6 ${
            isSaving ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-[#5B5288] text-white hover:bg-[#4a4270] active:scale-95"
          }`}
        >
          {isSaving ? "Menyimpan... ⏳" : "Simpan Perubahan"}
        </button>
        
      </div>
    </div>
  );

  // Jurus Portal: Lempar modal ini keluar dari sangkar Sidebar, langsung ke tag <body> HTML
  if (!mounted) return null;
  return createPortal(modalContent, document.body);
}