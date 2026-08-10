"use client";

import { useState, useEffect, useRef, use, useMemo } from "react";
import { Settings, HelpCircle, Loader2 } from "lucide-react";

import { supabase } from "@/lib/supabase";

import SettingsModal from "@/components/Arena/SettingsModal";
import GuideModal from "@/components/Arena/GuideModal";
import MiniProfile from "@/components/layout/MiniProfile";

import BoomModal from "@/components/Arena/BoomModal";
import QuestionModal from "@/components/Arena/QuestionModal";
import GameOverModal from "@/components/Arena/GameOverModal";

import PlayerDock from "@/components/Arena/PlayerDock";
import GameBoardCanvas from "@/components/Arena/GameBoardCanvas";
import DiceControl from "@/components/Arena/DiceControl";
import WaitingRoom from "@/components/Arena/WaitingRoom";

import { useGameBoard } from "@/hooks/useGameBoard";
import { useSkills } from "@/hooks/useSkills";
import { useSoalBank, type Soal } from "@/hooks/useSoalBank";
import { useRoom } from "@/hooks/useRoom";
import { usePlayerProfiles } from "@/hooks/usePlayerProfiles";

export default function BoardGameArena({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = use(params);

  const {
    room,
    players,
    currentUserId,
    isHost,
    isMyTurn,
    isLoading: isRoomLoading,
    startGame,
    updateMyPosisi,
    passTurnToNext,
    finishGame,
  } = useRoom(roomId);

  const gameId = room?.id_game ?? null;

  const { boardData, mapCoords, isLoading: isBoardLoading, error: boardError } =
    useGameBoard(gameId);
  const { skillList, isLoading: isSkillLoading } = useSkills();
  const { pickRandomSoal } = useSoalBank();

  const allUserIds = useMemo(() => players.map(p => p.id_user), [players]);
  const { profiles } = usePlayerProfiles(allUserIds);

  const [showSettings, setShowSettings] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showSkills, setShowSkills] = useState(false);

  const [diceValue, setDiceValue] = useState(6);
  const [playerPosition, setPlayerPosition] = useState(0);
  const [targetPosition, setTargetPosition] = useState(0);
  const [isMoving, setIsMoving] = useState(false);

  // BARU: State untuk Animasi Dadu
  const [isRolling, setIsRolling] = useState(false);

  const [trapTiles, setTrapTiles] = useState<number[]>([]);
  const [showBoom, setShowBoom] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [currentSoal, setCurrentSoal] = useState<Soal | null>(null);
  const [canSkipTurn, setCanSkipTurn] = useState(false);

  const [hasRolled, setHasRolled] = useState(false);
  const hasRolledRef = useRef(false);
  const [usedSoalIds, setUsedSoalIds] = useState<number[]>([]);

  // ==========================================
  // STATE BARU: SKILLS & EFEKNYA
  // ==========================================
  const [activeSkillId, setActiveSkillId] = useState<number | null>(null);
  const [hasShield, setHasShield] = useState(false); // Untuk Skill Perisai (ID 2)
  const [hasExtraTurn, setHasExtraTurn] = useState(false); // Untuk Skill Pembeku (ID 3)
  
  // BARU: Gembok agar skill hanya bisa dibeli 1x per giliran
  const [hasUsedSkillThisTurn, setHasUsedSkillThisTurn] = useState(false);
  
  const [earnedBadge, setEarnedBadge] = useState<{ nama_badge: string; icon_url: string } | null>(null);

  const incrementStat = async (idMahasiswa: number, statColumn: 'arena_main' | 'arena_menang' | 'arena_jebakan') => {
    try {
      const { data } = await supabase.from('mahasiswa').select(statColumn).eq('id_mahasiswa', idMahasiswa).single();
      if (data) {
        const currentValue = (data as Record<string, number>)[statColumn] || 0;
        await supabase.from('mahasiswa').update({ [statColumn]: currentValue + 1 }).eq('id_mahasiswa', idMahasiswa);
      }
    } catch (err) {
      console.error("Gagal update statistik:", err);
    }
  };

  useEffect(() => {
    if (isMyTurn) {
      setHasRolled(false);
      hasRolledRef.current = false;
      // Buka gembok skill saat giliran kita tiba
      setHasUsedSkillThisTurn(false);
    }
  }, [isMyTurn]);

  useEffect(() => {
    if (room?.trap_tiles && room.trap_tiles.length > 0) {
      setTrapTiles(room.trap_tiles);
    }
  }, [room?.trap_tiles]);

  const hasIncrementedMainRef = useRef(false);
  useEffect(() => {
    if (room?.status === "playing" && currentUserId && profiles[currentUserId as string] && !hasIncrementedMainRef.current) {
      hasIncrementedMainRef.current = true;
      const myIdMahasiswa = profiles[currentUserId as string].idMahasiswa;
      incrementStat(myIdMahasiswa, 'arena_main');
    }
  }, [room?.status, currentUserId, profiles]);

  useEffect(() => {
    setCanSkipTurn(false);
    if (!room?.turn_started_at || isMyTurn) return;

    const turnStartedAt = new Date(room.turn_started_at).getTime();
    const msRemaining = 60_000 - (Date.now() - turnStartedAt);

    if (msRemaining <= 0) {
      setCanSkipTurn(true);
      return;
    }

    const timer = setTimeout(() => setCanSkipTurn(true), msRemaining);
    return () => clearTimeout(timer);
  }, [room?.turn_started_at, room?.current_turn_user_id, isMyTurn]);

  const handleSkipTurn = () => {
    passTurnToNext();
    setCanSkipTurn(false);
  };

  const turnPassedRef = useRef(false);

  const endTurnOnce = () => {
    if (turnPassedRef.current) return;
    turnPassedRef.current = true;

    // JIKA PUNYA GILIRAN EKSTRA DARI SKILL BOM PEMBEKU (RAMUAN WAKTU)
    if (hasExtraTurn) {
      setHasExtraTurn(false);
      setHasRolled(false);
      hasRolledRef.current = false;
      setHasUsedSkillThisTurn(false); // Buka gembok skill lagi buat giliran ekstra
      setToastMsg("❄️ Ramuan Waktu: Kamu dapat 1 giliran lagi!");
      setTimeout(() => setToastMsg(""), 3000);
      return; 
    }

    passTurnToNext();
  };

  const handleStartGame = async () => {
    if (mapCoords.length === 0) return;
    const max = mapCoords.length - 1;
    const newTraps = new Set<number>();
    const jumlahJebakan = Math.min(6, Math.max(0, max - 2));

    while (newTraps.size < jumlahJebakan) {
      const randomTile = Math.floor(Math.random() * (max - 2)) + 1;
      newTraps.add(randomTile);
    }
    
    await startGame(Array.from(newTraps));
  };

  // ==========================================
  // LOGIKA PENGGUNAAN SKILL (SUDAH DI-FIX)
  // ==========================================
  const handleUseSkill = async (skillId: number, hargaPoin: number) => {
    if (!isMyTurn) {
      setToastMsg("⚠️ Skill hanya bisa dipakai saat giliranmu!");
      setTimeout(() => setToastMsg(""), 3000);
      return;
    }
    if (hasRolledRef.current) {
      setToastMsg("⚠️ Tidak bisa pakai skill karena dadu sudah dilempar!");
      setTimeout(() => setToastMsg(""), 3000);
      return;
    }
    if (hasUsedSkillThisTurn) {
      setToastMsg("⚠️ Kamu sudah menggunakan skill di giliran ini!");
      setTimeout(() => setToastMsg(""), 3000);
      return;
    }

    const myIdMahasiswa = profiles[currentUserId as string]?.idMahasiswa;
    if (!myIdMahasiswa) return;

    // 1. Cek XP Terkini
    const { data: mhsData } = await supabase.from('mahasiswa').select('total_xp').eq('id_mahasiswa', myIdMahasiswa).single();
    const currentXp = mhsData?.total_xp || 0;

    if (currentXp < hargaPoin) {
      setToastMsg(`❌ XP kurang! Butuh ${hargaPoin} pts, XP kamu ${currentXp} pts.`);
      setTimeout(() => setToastMsg(""), 3000);
      return;
    }

    // 2. APLIKASIKAN EFEK SKILL
    let skillSuccess = true; // Penanda apakah skill berhasil dieksekusi

    if (Number(skillId) === 1) {
      setActiveSkillId(1);
      setToastMsg(`⚔️ Lemparan Ganda Aktif! (Dadu x2)`);
    } else if (Number(skillId) === 2) {
      setHasShield(true);
      setToastMsg(`🛡️ Perisai Aktif! Kamu kebal dari 1 bom.`);
    } else if (Number(skillId) === 3) {
      setHasExtraTurn(true);
      setToastMsg(`❄️ Ramuan Waktu! Kamu mendapat 1 giliran ekstra.`);
    } else if (Number(skillId) === 4) {
      const opponentPositions = players.filter(p => p.id_user !== currentUserId).map(p => p.posisi);
      const maxOpponentPos = opponentPositions.length > 0 ? Math.max(0, ...opponentPositions) : 0;

      if (maxOpponentPos > playerPosition) {
         setPlayerPosition(maxOpponentPos);
         updateMyPosisi(maxOpponentPos);
         setToastMsg("🔀 Teleportasi! Kamu menyalin posisi musuh terdepan.");
         setTimeout(() => endTurnOnce(), 2000); 
      } else {
         // KITA HENTIKAN PROSES DI SINI AGAR XP TIDAK TERPOTONG!
         skillSuccess = false;
         setToastMsg("⚠️ Kamu sudah di depan, Teleportasi gagal!");
      }
    }

    // Jika skill gagal dieksekusi (contoh: teleportasi), hentikan dan jangan potong XP!
    if (!skillSuccess) {
      setTimeout(() => setToastMsg(""), 3000);
      return; 
    }

    // Kunci penggunaan skill agar tidak bisa beli lagi giliran ini
    setHasUsedSkillThisTurn(true);
    setTimeout(() => setToastMsg(""), 3000);
    setShowSkills(false);

    // 3. KURANGI XP DI BACKGROUND (Hanya dieksekusi jika skillSuccess === true)
    await supabase.from('mahasiswa').update({ total_xp: currentXp - hargaPoin }).eq('id_mahasiswa', myIdMahasiswa);
  };

  // ==========================================
  // LOGIKA ROLL DADU (DENGAN ANIMASI)
  // ==========================================
  const handleRollDice = () => {
    if (!isMyTurn || isMoving || mapCoords.length === 0 || hasRolledRef.current || isRolling) return;
    
    hasRolledRef.current = true;
    setHasRolled(true);
    turnPassedRef.current = false;
    setIsRolling(true); // Mulai animasi

    let finalRoll = Math.floor(Math.random() * 6) + 1;
    let totalSteps = finalRoll;
    let isDouble = activeSkillId === 1;

    if (isDouble) {
      const roll2 = Math.floor(Math.random() * 6) + 1;
      totalSteps = finalRoll + roll2; 
    }

    // Efek ngacak dadu super cepat selama 1 detik
    const rollInterval = setInterval(() => {
      setDiceValue(Math.floor(Math.random() * 6) + 1);
    }, 100);

    setTimeout(() => {
      clearInterval(rollInterval); // Hentikan efek ngacak
      setIsRolling(false); // Selesai animasi

      // Tampilkan hasil akhir
      setActiveSkillId(null);
      setDiceValue(totalSteps > 6 ? 6 : totalSteps); 

      if (isDouble) {
        setToastMsg(`🎲 Lemparan Ganda: ${finalRoll} + ${totalSteps - finalRoll} = ${totalSteps}`);
        setTimeout(() => setToastMsg(""), 3000);
      }

      setTargetPosition((prevTarget) => {
        const newTarget = prevTarget + totalSteps;
        const maxPos = mapCoords.length - 1;
        return newTarget > maxPos ? maxPos : newTarget;
      });
    }, 1000); // Durasi animasi 1 detik
  };

  useEffect(() => {
    if (mapCoords.length === 0) return;

    if (playerPosition !== targetPosition) {
      setIsMoving(true);

      const timer = setTimeout(() => {
        const isForward = targetPosition > playerPosition;
        const nextPos = isForward ? playerPosition + 1 : playerPosition - 1;

        setPlayerPosition(nextPos);
        updateMyPosisi(nextPos); 

        if (nextPos === targetPosition) {
          setIsMoving(false);
          const maxPos = mapCoords.length - 1;

          if (nextPos === maxPos) {
            if (currentUserId) {
              finishGame(currentUserId);

              const myIdMahasiswa = profiles[currentUserId as string]?.idMahasiswa;
              if (myIdMahasiswa) {
                incrementStat(myIdMahasiswa, 'arena_menang');

                const ID_BADGE_FINISH = 2; 

                supabase.from("mahasiswa_badges").upsert(
                  { id_mahasiswa: myIdMahasiswa, id_badge: ID_BADGE_FINISH },
                  { onConflict: "id_mahasiswa,id_badge", ignoreDuplicates: true }
                )
                .select() 
                .then(async ({ data, error }) => {
                  if (error) {
                    console.error("Gagal trigger badge Finish:", error);
                  } else if (data && data.length > 0) {
                    const { data: badgeData } = await supabase
                      .from("badges")
                      .select("nama_badge, icon_url")
                      .eq("id_badge", ID_BADGE_FINISH)
                      .single();
                    
                    if (badgeData) {
                      setEarnedBadge(badgeData);
                    }
                  }
                });
              }
            }
          } else if (trapTiles.includes(nextPos)) {
            // ==========================================
            // SKILL 2: CEK PERISAI SAAT MENGINJAK BOM
            // ==========================================
            setTrapTiles((prev) => prev.filter((t) => t !== nextPos));

            if (hasShield) {
              setHasShield(false); 
              setToastMsg("🛡️ DARR! Tapi Perisaimu menahan ledakan bom!");
              setTimeout(() => endTurnOnce(), 2500); 
            } else {
              const myIdMahasiswa = profiles[currentUserId as string]?.idMahasiswa;
              if (myIdMahasiswa) {
                incrementStat(myIdMahasiswa, 'arena_jebakan');
              }

              let newSoal = pickRandomSoal();
              let attempts = 0;
              while (usedSoalIds.includes(newSoal.id_soal) && attempts < 10) {
                newSoal = pickRandomSoal();
                attempts++;
              }
              
              setUsedSoalIds(prev => [...prev, newSoal.id_soal]);
              setCurrentSoal(newSoal);

              setTimeout(() => {
                setShowBoom(true);
                setTimeout(() => {
                  setShowBoom(false);
                  setShowQuestionModal(true);
                }, 1500);
              }, 300);
            }
          } else {
            endTurnOnce();
          }
        }
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [playerPosition, targetPosition, trapTiles, mapCoords.length, usedSoalIds, hasShield]);

  const handleAnswer = async (id_jawaban: number) => {
    setShowQuestionModal(false);
    setToastMsg("Mengecek jawaban... ⏳");

    if (currentSoal?.id_soal === 999) {
      if (id_jawaban === 2) {
        setToastMsg("✅ Benar! Kamu maju 1 Langkah.");
        setTargetPosition((prev) => Math.min(prev + 1, mapCoords.length - 1));
      } else {
        setToastMsg("❌ Salah! Kamu dihukum mundur 2 Langkah.");
        setTargetPosition((prev) => Math.max(0, prev - 2));
      }
    } else {
      const { data } = await supabase
        .from("jawaban")
        .select("jawaban_benar")
        .eq("id_jawaban", id_jawaban)
        .single();

      if (data && data.jawaban_benar === true) {
        setToastMsg("✅ Benar! Kamu maju 1 Langkah.");
        setTargetPosition((prev) => Math.min(prev + 1, mapCoords.length - 1));
      } else {
        setToastMsg("❌ Salah! Kamu dihukum mundur 2 Langkah.");
        setTargetPosition((prev) => Math.max(0, prev - 2));
      }
    }

    setTimeout(() => {
      setToastMsg("");
      endTurnOnce();
    }, 3000);
  };

  const activePlayersList = players.map(p => {
    const isMe = p.id_user === currentUserId;
    const pos = isMe ? playerPosition : p.posisi;
    const profile = profiles[p.id_user as string] || { idMahasiswa: 0, namaMahasiswa: "Pemain", avatarUrl: null };
    
    return {
      id: p.id_user,
      idMahasiswa: profile.idMahasiswa,
      position: pos,
      name: profile.namaMahasiswa,
      avatarUrl: profile.avatarUrl,
      isMe: isMe
    };
  });

  if (isRoomLoading) {
    return (
      <div className="h-screen bg-[#F8F9FB] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-[#5B5288] animate-spin" />
        <p className="text-[#5B5288] font-semibold">Memuat ruang...</p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="h-screen bg-[#F8F9FB] flex flex-col items-center justify-center gap-3 text-center px-6">
        <p className="text-red-500 font-bold text-lg">Ruang tidak ditemukan.</p>
        <p className="text-gray-500 text-sm">
          Pastikan PIN atau link yang kamu pakai benar, dan kamu sudah login.
        </p>
      </div>
    );
  }

  if (isBoardLoading) {
    return (
      <div className="h-screen bg-[#F8F9FB] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-[#5B5288] animate-spin" />
        <p className="text-[#5B5288] font-semibold">Memuat papan permainan...</p>
      </div>
    );
  }

  if (boardError || !boardData) {
    return (
      <div className="h-screen bg-[#F8F9FB] flex flex-col items-center justify-center gap-3 text-center px-6">
        <p className="text-red-500 font-bold text-lg">
          {boardError ?? "Papan tidak ditemukan."}
        </p>
      </div>
    );
  }

  if (room.status === "waiting") {
    return (
      <WaitingRoom
        players={players}
        isHost={isHost}
        currentUserId={currentUserId}
        onStart={handleStartGame} 
        roomId={roomId}
        isPrivate={room.is_private}
        pin={room.pin}
        profiles={profiles}
      />
    );
  }

  return (
    <div className="h-screen bg-[#F8F9FB] flex flex-col overflow-hidden relative">
      {room.status === "finished" && (
        <GameOverModal 
          isWinner={currentUserId === room.winner_user_id} 
          earnedBadge={earnedBadge} 
        />
      )}

      {toastMsg && (
        <div className="fixed top-8 left-1/2 transform -translate-x-1/2 z-[9999] bg-white px-6 py-3 rounded-2xl shadow-2xl border-2 border-[#5B5288] animate-fade-in-down flex items-center justify-center text-center">
          <span className="text-[#5B5288] font-bold text-lg">{toastMsg}</span>
        </div>
      )}

      <div className="w-full flex justify-between items-center p-8 shrink-0 z-10">
        <h1 className="text-3xl font-extrabold text-[#5B5288]">
          Arena Kelas — {boardData.nama_game}
        </h1>
        <div className="flex items-center gap-6">
          <span
            className={`px-4 py-2 rounded-xl font-bold text-sm ${
              isMyTurn
                ? "bg-[#39C936] text-white"
                : "bg-gray-100 text-gray-400"
            }`}
          >
            {isMyTurn ? "Giliranmu! 🎲" : "Menunggu giliran..."}
          </span>

          {canSkipTurn && !isMyTurn && (
            <button
              onClick={handleSkipTurn}
              className="px-4 py-2 rounded-xl font-bold text-sm bg-red-100 text-red-500 hover:bg-red-200 transition-colors"
            >
              Lewati Giliran ⏭️
            </button>
          )}
          <div className="flex gap-4 items-center">
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-gray-400 hover:text-[#5B5288] transition-colors"
            >
              <Settings className="w-6 h-6" />
            </button>
            <button
              onClick={() => setShowGuide(true)}
              className="p-2 text-gray-400 hover:text-[#5B5288] transition-colors"
            >
              <HelpCircle className="w-6 h-6" />
            </button>
            <MiniProfile />
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-[1fr_auto_1fr] items-center lg:items-stretch w-full px-4 lg:px-8 pb-8 gap-6 lg:gap-4 min-h-0 overflow-y-auto lg:overflow-hidden z-10">
        
        <PlayerDock
          showSkills={showSkills}
          onToggleSkills={() => setShowSkills((prev) => !prev)}
          isSkillLoading={isSkillLoading}
          skillList={skillList}
          activePlayers={activePlayersList}
          onUseSkill={handleUseSkill} 
        />

        <GameBoardCanvas
          boardData={boardData}
          mapCoords={mapCoords}
          activePlayers={activePlayersList}
        />

        {/* PROPERTI DISABLED DITAMBAH isRolling AGAR TOMBOL MATI SAAT ANIMASI JALAN */}
        <DiceControl
          diceValue={diceValue}
          disabled={
            !isMyTurn || isMoving || hasRolled || playerPosition === mapCoords.length - 1 || isRolling
          }
          onRoll={handleRollDice}
        />
      </div>

      {showBoom && <BoomModal />} 

      {showQuestionModal && currentSoal && (
        <QuestionModal currentSoal={currentSoal} onAnswer={handleAnswer} />
      )}

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
    </div>
  );
}