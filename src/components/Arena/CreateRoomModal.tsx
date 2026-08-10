"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Copy, Check, CheckSquare, Square, X, Loader2 } from "lucide-react";
import { useCreateRoom } from "@/hooks/useCreateRoom";
import { supabase } from "@/lib/supabase";

function generatePin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export default function CreateRoomModal({
  gameId,
  onClose,
}: {
  gameId: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const { createRoom, isCreating, error } = useCreateRoom();

  const [isPrivate, setIsPrivate] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isUpdatingPrivacy, setIsUpdatingPrivacy] = useState(false);

  // Hasil setelah room berhasil dibuat
  const [roomId, setRoomId] = useState<string | null>(null);
  const [pin, setPin] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Buat room SEKALI SAJA waktu modal pertama kali dibuka.
  // Toggle privat/publik sesudahnya TIDAK bikin room baru lagi -- lihat handleTogglePrivate.
  useEffect(() => {
    async function run() {
      const result = await createRoom(gameId, isPrivate);
      if (result) {
        setRoomId(result.idRoom);
        setPin(result.pin);
      }
    }
    run();
    // sengaja cuma jalan sekali saat mount, TIDAK boleh depend ke isPrivate
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Toggle privat/publik -> UPDATE row room yang sama, bukan insert baru
  const handleTogglePrivate = async () => {
    if (!roomId || isCreating || isUpdatingPrivacy) return;

    const nextIsPrivate = !isPrivate;
    const nextPin = nextIsPrivate ? generatePin() : null;

    setIsUpdatingPrivacy(true);

    const { error: updateError } = await supabase
      .from("room")
      .update({ is_private: nextIsPrivate, pin: nextPin })
      .eq("id_room", roomId);

    if (!updateError) {
      setIsPrivate(nextIsPrivate);
      setPin(nextPin);
    } else {
      console.error("Gagal update status privat room:", updateError);
    }

    setIsUpdatingPrivacy(false);
  };

  const roomLink = roomId
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/arena/join/${roomId}`
    : "";

  const handleCopyLink = () => {
    if (!roomLink) return;
    navigator.clipboard.writeText(roomLink);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const shareText = `Ayo gabung Arena SyariahQuest bareng aku!${
    pin ? ` PIN: ${pin}` : ""
  } ${roomLink}`;

  const handleShareWhatsapp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
  };

  const handleShareTelegram = () => {
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(roomLink)}&text=${encodeURIComponent(shareText)}`,
      "_blank"
    );
  };

  const handleShareFacebook = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(roomLink)}`,
      "_blank"
    );
  };

  const handleMasukRuang = () => {
    if (!roomId) return;
    router.push(`/arena/play/${roomId}`);
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#5B5288] w-full max-w-[420px] rounded-3xl p-8 shadow-2xl relative animate-fade-in-up">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-white/50 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-2xl font-bold text-white text-center mb-8 px-4 leading-snug">
          {isCreating ? "Membuat Ruang..." : "Ruang Berhasil Dibuat!"}
        </h2>

        {error && (
          <p className="text-red-200 text-sm text-center mb-4">{error}</p>
        )}

        {isCreating ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        ) : (
          <>
            {/* Private Toggle & PIN */}
            <div className="flex items-center justify-between mb-6 h-12">
              <div
                className={`flex items-center gap-3 group ${
                  isUpdatingPrivacy ? "opacity-50 cursor-wait" : "cursor-pointer"
                }`}
                onClick={handleTogglePrivate}
              >
                <span className="text-white font-semibold text-sm group-hover:text-gray-200 transition-colors">
                  Ruang Privat
                </span>
                {isPrivate ? (
                  <CheckSquare className="text-white w-6 h-6" />
                ) : (
                  <Square className="text-white w-6 h-6" />
                )}
              </div>

              {isPrivate && pin && (
                <div className="bg-white text-[#5B5288] font-black text-xl px-6 py-2 rounded-xl text-center shadow-inner tracking-widest min-w-[120px]">
                  {pin}
                </div>
              )}
            </div>

            {/* Share Link Area */}
            <div className="bg-white rounded-xl flex items-center justify-between p-1.5 pl-4 mb-6 shadow-sm">
              <span className="text-[#5B5288]/70 font-medium text-sm truncate flex-1">
                {roomLink}
              </span>
              <button
                onClick={handleCopyLink}
                className={`p-2 rounded-lg transition-all ${
                  isCopied
                    ? "bg-green-100 text-green-600"
                    : "hover:bg-gray-100 text-[#5B5288]"
                }`}
              >
                {isCopied ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Share via Sosmed */}
            <div className="mb-8">
              <p className="text-white text-sm font-semibold mb-3">Bagikan via</p>
              <div className="flex gap-4">
                <button
                  onClick={handleShareWhatsapp}
                  className="w-10 h-10 bg-[#25D366] rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-md"
                >
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.031 0C5.397 0 .013 5.385.013 12.019c0 2.122.553 4.195 1.603 6.01L0 24l6.126-1.606c1.737.95 3.722 1.452 5.895 1.452 6.634 0 12.018-5.385 12.018-12.019S18.665 0 12.031 0zm0 21.84c-1.8 0-3.565-.483-5.115-1.397l-.367-.217-3.8.997 1.015-3.704-.238-.378c-.997-1.583-1.523-3.413-1.523-5.282 0-5.467 4.448-9.915 9.918-9.915 5.467 0 9.916 4.448 9.916 9.915 0 5.467-4.449 9.915-9.916 9.915h-.002z" />
                  </svg>
                </button>
                <button
                  onClick={handleShareTelegram}
                  className="w-10 h-10 bg-[#0088cc] rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-md"
                >
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.94z" />
                  </svg>
                </button>
                <button
                  onClick={handleShareFacebook}
                  className="w-10 h-10 bg-[#1877F2] rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-md"
                >
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </button>
              </div>
            </div>

            <button
              onClick={handleMasukRuang}
              disabled={!roomId}
              className="w-full bg-[#39C936] text-white font-extrabold py-3.5 rounded-xl text-[15px] hover:brightness-110 transition-all shadow-lg mt-8 disabled:opacity-50"
            >
              Masuk ke Ruang Tunggu
            </button>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
