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
  }, []);

  const handlePinChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    if (value !== "" && index < 3) {
      inputRefs.current[index + 1]?.focus();
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

    // 1. Cek login DULUAN -- WAJIB sebelum query room, karena RLS SELECT
    //    di table "room" cuma mengizinkan role "authenticated". Kalau
    //    dicek belakangan, query room bisa ditolak RLS duluan (kelihatan
    //    seperti "PIN salah" padahal PIN-nya benar, cuma karena browser
    //    ini belum login).
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErrorMsg("Kamu harus login dulu untuk bergabung.");
      setIsJoining(false);
      return;
    }

    // 2. Baru cari room berdasarkan PIN. Diizinkan join/rejoin selama room
    //    belum "finished" -- termasuk room yang statusnya sudah "playing"
    //    (misal host sempat keluar & mau gabung lagi ke game yang sedang
    //    berjalan). Cuma room yang sudah selesai yang ditolak.
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

    // 3. Daftarkan user ke room_player (aman dipanggil berkali-kali karena upsert)
    const { error: joinError } = await supabase.from("room_player").upsert(
      {
        id_room: room.id_room,
        id_user: user.id,
        posisi: 0,
        is_host: false,
      },
      { onConflict: "id_room,id_user", ignoreDuplicates: true }
    );

    if (joinError) {
      console.error("Gagal join room:", joinError);
      setErrorMsg("Gagal bergabung ke ruang. Coba lagi.");
      setIsJoining(false);
      return;
    }

    // 4. Redirect ke halaman arena -- gameId TIDAK perlu dikirim lewat query
    //    lagi, karena halaman arena sekarang ambil id_game dari room itu sendiri.
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
