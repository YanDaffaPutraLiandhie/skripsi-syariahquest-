"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function JoinRoomModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [pin, setPin] = useState(["", "", "", ""]);
  const [mounted, setMounted] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setMounted(true);
    // Auto-focus ke kotak pertama saat modal terbuka
    setTimeout(() => {
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus();
      }
    }, 100);
  }, []);

  const handlePinChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    // Otomatis pindah ke kotak berikutnya jika diisi
    if (value !== "" && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // UX Tambahan: Enter untuk submit & Backspace untuk mundur
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleGabung();
    } else if (e.key === "Backspace" && pin[index] === "" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleGabung = async () => {
    const enteredPin = pin.join("");
    if (enteredPin.length !== 4) {
      setErrorMsg("Masukkan 4 digit PIN dengan benar!");
      return;
    }

    setIsJoining(true);
    setErrorMsg("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErrorMsg("Kamu harus login dulu untuk bergabung.");
      setIsJoining(false);
      return;
    }

    const { data: room, error: roomError } = await supabase
      .from("room")
      .select("id_room, id_game, status")
      .eq("pin", enteredPin)
      .neq("status", "finished")
      .single();

    if (roomError || !room) {
      setErrorMsg("PIN tidak ditemukan atau ruang sudah tidak aktif.");
      setIsJoining(false);
      return;
    }

    // PERBAIKAN: ignoreDuplicates diubah ke false + is_inRoom: true, supaya
    // user yang pernah join lalu keluar (row sudah ada, is_inRoom=false)
    // tetap bisa gabung ulang -- upsert akan meng-UPDATE row itu, bukan
    // diabaikan seperti sebelumnya.
    const { error: joinError } = await supabase.from("room_player").upsert(
      {
        id_room: room.id_room,
        id_user: user.id,
        posisi: 0,
        is_host: false,
        is_inRoom: true,
      },
      { onConflict: "id_room,id_user", ignoreDuplicates: false }
    );

    if (joinError) {
      console.error("Gagal join room:", joinError);
      setErrorMsg("Gagal bergabung ke ruang. Coba lagi.");
      setIsJoining(false);
      return;
    }

    // Update status inRoom di tabel mahasiswa
    const { data: userData } = await supabase
      .from("user")
      .select("id_mahasiswa")
      .eq("auth_user_id", user.id)
      .single();

    if (userData?.id_mahasiswa) {
      await supabase
        .from("mahasiswa")
        .update({ inRoom: true })
        .eq("id_mahasiswa", userData.id_mahasiswa);
    }

    router.push(`/arena/play/${room.id_room}`);
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#5B5288] w-full max-w-[420px] rounded-3xl p-8 shadow-2xl relative animate-fade-in-up">
        <h2 className="text-xl font-bold text-white text-center mb-2 px-4 leading-snug">
          Gabung ke Arena Teman
        </h2>

        <p className="text-white/70 text-sm font-semibold text-center mb-6">
          Masukkan PIN Arena
        </p>

        <div className="flex justify-center gap-3 mb-4">
          {pin.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              value={digit}
              onChange={(e) => handlePinChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-14 h-14 bg-white rounded-xl text-center text-2xl font-black text-[#5B5288] shadow-inner focus:outline-none focus:ring-4 focus:ring-[#39C936]/50 transition-all placeholder-gray-300"
              placeholder="X"
            />
          ))}
        </div>

        {errorMsg && (
          <p className="text-red-200 text-sm text-center mb-4">{errorMsg}</p>
        )}

        <div className="flex gap-4 mt-4">
          <button
            onClick={handleGabung}
            disabled={isJoining}
            className="flex-1 bg-[#39C936] text-white font-extrabold py-3.5 rounded-xl text-[15px] hover:brightness-110 transition-all shadow-lg disabled:opacity-50"
          >
            {isJoining ? "Menghubungkan..." : "Gabung"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-white text-[#5B5288] font-extrabold py-3.5 rounded-xl text-[15px] hover:bg-gray-100 transition-all shadow-lg"
          >
            Batal
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}