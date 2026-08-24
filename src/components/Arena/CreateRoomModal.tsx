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

  const [roomId, setRoomId] = useState<string | null>(null);
  const [pin, setPin] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function run() {
      const result = await createRoom(gameId, isPrivate);
      if (result) {
        setRoomId(result.idRoom);
        setPin(result.pin);
      }
    }
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

            <div className="bg-white rounded-xl flex items-center justify-between p-1.5 pl-4 mb-8 shadow-sm">
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

            <button
              onClick={handleMasukRuang}
              disabled={!roomId}
              className="w-full bg-[#39C936] text-white font-extrabold py-3.5 rounded-xl text-[15px] hover:brightness-110 transition-all shadow-lg mt-4 disabled:opacity-50"
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