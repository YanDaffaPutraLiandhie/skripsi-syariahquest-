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
import AnswerResultModal from "@/components/Arena/AnswerResultModal";
import SkillEffectModal, {
  type SkillEffectConfig,
} from "@/components/Arena/SkillEffectModal";

import PlayerDock from "@/components/Arena/PlayerDock";
import GameBoardCanvas from "@/components/Arena/GameBoardCanvas";
import DiceControl from "@/components/Arena/DiceControl";
import WaitingRoom from "@/components/Arena/WaitingRoom";

import { useGameBoard } from "@/hooks/useGameBoard";
import { useSkills } from "@/hooks/useSkills";
import { useSoalBank, type Soal } from "@/hooks/useSoalBank";
import { useRoom } from "@/hooks/useRoom";
import { usePlayerProfiles } from "@/hooks/usePlayerProfiles";

import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";
import { useSoundEffects } from "@/hooks/useSoundEffects";

const SKILL_EFFECTS: Record<number, SkillEffectConfig> = {
  1: {
    animationPath: "/animations/dice-skill.json",
    title: "LEMPARAN GANDA!",
    subtitle: "Dadu akan dilempar 2 kali!",
    colorClass: "text-white",
    customStyle:
      "w-64 h-64 md:w-[350px] md:h-[350px] scale-125 translate-y-6",
  },
  2: {
    animationPath: "/animations/shield-skill.json",
    title: "PERISAI AKTIF!",
    subtitle: "Kamu kebal dari 1 bom!",
    colorClass: "text-blue-400",
  },
  3: {
    animationPath: "/animations/potion-skill.json",
    title: "RAMUAN WAKTU!",
    subtitle: "Kamu dapat 1 giliran ekstra!",
    colorClass: "text-cyan-400",
    customStyle: "w-64 h-64 md:w-[300px] md:h-[300px]",
  },
  4: {
    animationPath: "/animations/teleport-skill.json",
    title: "TELEPORTASI!",
    subtitle: "Posisi disalin ke musuh terdepan!",
    colorClass: "text-purple-400",
    customStyle: "w-64 h-64 md:w-80 md:h-80 scale-125",
  },
};

const SHIELD_BLOCK_EFFECT: SkillEffectConfig = {
  animationPath: "/animations/shield-skill.json",
  title: "PERISAI MENAHAN!",
  subtitle: "Ledakan bom berhasil ditahan!",
  colorClass: "text-blue-400",
  customStyle: "w-64 h-64 md:w-80 md:h-80 scale-110",
};

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
    leaveRoom,
  } = useRoom(roomId);

  const gameId = room?.id_game ?? null;

  const {
    boardData,
    mapCoords,
    isLoading: isBoardLoading,
    error: boardError,
  } = useGameBoard(gameId);

  const { skillList, isLoading: isSkillLoading } = useSkills();
  const { pickRandomSoal } = useSoalBank();

  const allUserIds = useMemo(
    () => players.map((p) => p.id_user),
    [players]
  );

  const { profiles } = usePlayerProfiles(allUserIds);
  const myName = profiles[currentUserId as string]?.namaMahasiswa || "Pemain"; 

  const [showSettings, setShowSettings] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showSkills, setShowSkills] = useState(false);

  const [isBgmEnabled, setIsBgmEnabled] = useState(true);
  const [isSfxEnabled, setIsSfxEnabled] = useState(true);

  useBackgroundMusic("/sounds/bgm-arena.mp3", isBgmEnabled);
  const { playSfx } = useSoundEffects(isSfxEnabled);

  const [diceValue, setDiceValue] = useState(6);
  const [playerPosition, setPlayerPosition] = useState(0);
  const [targetPosition, setTargetPosition] = useState(0);
  const [isMoving, setIsMoving] = useState(false);
  const [isRolling, setIsRolling] = useState(false);

  // STATE BARU BUAT DADU MANTUL
  const [bounceTarget, setBounceTarget] = useState<number | null>(null);

  const [trapTiles, setTrapTiles] = useState<number[]>([]);
  const [showBoom, setShowBoom] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [currentSoal, setCurrentSoal] = useState<Soal | null>(null);
  const [canSkipTurn, setCanSkipTurn] = useState(false);

  const [answerResult, setAnswerResult] = useState<boolean | null>(null);

  const [skillEffect, setSkillEffect] = useState<SkillEffectConfig | null>(null);

  const flashSkillEffect = (config: SkillEffectConfig) => {
    setSkillEffect(config);
    setTimeout(() => {
      setSkillEffect(null);
    }, 1800);
  };

  const [hasRolled, setHasRolled] = useState(false);
  const hasRolledRef = useRef(false);
  const turnPassedRef = useRef(false);
  const hasTriggeredTrapRef = useRef(false); // GEMBOK BOM GANDA

  const [usedSoalIds, setUsedSoalIds] = useState<number[]>([]);

  const [activeSkillId, setActiveSkillId] = useState<number | null>(null);

  const [hasShield, setHasShield] = useState(false);
  const [hasExtraTurn, setHasExtraTurn] = useState(false);
  const [hasUsedSkillThisTurn, setHasUsedSkillThisTurn] = useState(false);

  const [earnedBadge, setEarnedBadge] = useState<{
    nama_badge: string;
    icon_url: string;
  } | null>(null);

  const hasPlayedEndSfx = useRef(false);

  // ==========================================================
  // FITUR BARU: BROADCAST MULTIPLAYER
  // ==========================================================
  const broadcastChannelRef = useRef<any>(null);
  const [isBroadcastReady, setIsBroadcastReady] = useState(false); 

  useEffect(() => {
    if (!roomId || !currentUserId) return;

    const channel = supabase.channel(`arena-events-${roomId}`);
    
    channel.on("broadcast", { event: "game_action" }, (payload) => {
      const { message, userId } = payload.payload;
      
      if (userId !== currentUserId) {
        setToastMsg(message);
        
        setTimeout(() => {
          setToastMsg((prev) => (prev === message ? "" : prev));
        }, 4000);
      }
    }).subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setIsBroadcastReady(true);
      }
    });

    broadcastChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, currentUserId]);

  const sendBroadcast = (msg: string) => {
    if (!isBroadcastReady) {
      console.warn("Broadcast belum siap, pesan ditahan:", msg);
      return; 
    }
    
    broadcastChannelRef.current?.send({
      type: "broadcast",
      event: "game_action",
      payload: { message: msg, userId: currentUserId },
    });
  };
  // ==========================================================

  useEffect(() => {
    if (
      room?.status === "finished" &&
      !hasPlayedEndSfx.current
    ) {
      hasPlayedEndSfx.current = true;
      if (
        currentUserId &&
        currentUserId !== room.winner_user_id
      ) {
        playSfx("lose");
      }
    }
  }, [room?.status, currentUserId, room?.winner_user_id, playSfx]);
  
  const incrementStat = async (
    idMahasiswa: number,
    statColumn: "arena_main" | "arena_menang" | "arena_jebakan"
  ) => {
    try {
      const { data } = await supabase
        .from("mahasiswa")
        .select(statColumn)
        .eq("id_mahasiswa", idMahasiswa)
        .single();

      if (data) {
        const currentValue =
          (data as Record<string, number>)[statColumn] || 0;

        await supabase
          .from("mahasiswa")
          .update({
            [statColumn]: currentValue + 1,
          })
          .eq("id_mahasiswa", idMahasiswa);
      }
    } catch (err) {
      console.error("Gagal update statistik:", err);
    }
  };

  useEffect(() => {
    if (isMyTurn) {
      setHasRolled(false);
      hasRolledRef.current = false;
      setHasUsedSkillThisTurn(false);
      turnPassedRef.current = false;
      hasTriggeredTrapRef.current = false; // Buka gembok bom saat ganti giliran
    }
  }, [isMyTurn]);

  useEffect(() => {
    if (room?.trap_tiles && room.trap_tiles.length > 0) {
      setTrapTiles(room.trap_tiles);
    }
  }, [room?.trap_tiles]);

  const hasIncrementedMainRef = useRef(false);

  useEffect(() => {
    if (
      room?.status === "playing" &&
      currentUserId &&
      profiles[currentUserId] &&
      !hasIncrementedMainRef.current
    ) {
      hasIncrementedMainRef.current = true;
      const myIdMahasiswa = profiles[currentUserId].idMahasiswa;
      incrementStat(myIdMahasiswa, "arena_main");
    }
  }, [room?.status, currentUserId, profiles]);

  useEffect(() => {
    setCanSkipTurn(false);
    if (!room?.turn_started_at || isMyTurn) {
      return;
    }

    const turnStartedAt = new Date(room.turn_started_at).getTime();
    const msRemaining = 60_000 - (Date.now() - turnStartedAt);

    if (msRemaining <= 0) {
      setCanSkipTurn(true);
      return;
    }

    const timer = setTimeout(() => {
      setCanSkipTurn(true);
    }, msRemaining);

    return () => clearTimeout(timer);
  }, [room?.turn_started_at, room?.current_turn_user_id, isMyTurn]);

  const handleSkipTurn = () => {
    passTurnToNext();
    setCanSkipTurn(false);
  };

  const endTurnOnce = () => {
    if (turnPassedRef.current) return;
    turnPassedRef.current = true;

    if (hasExtraTurn) {
      setHasExtraTurn(false);
      setHasRolled(false);
      hasRolledRef.current = false;
      setHasUsedSkillThisTurn(false);
      turnPassedRef.current = false;

      setToastMsg("❄️ Ramuan Waktu: Kamu dapat 1 giliran lagi!");
      setTimeout(() => setToastMsg(""), 3000);
      return;
    }

    passTurnToNext();
  };

  const handleStartGame = async () => {
    if (mapCoords.length === 0) return;

    const max = mapCoords.length - 1;
    const totalPetakBermain = max - 1;

    if (totalPetakBermain <= 0) return;

    let jumlahJebakan = Math.ceil(totalPetakBermain * 0.25);
    jumlahJebakan = Math.max(
      1,
      Math.min(jumlahJebakan, Math.floor(totalPetakBermain * 0.5))
    );

    const newTraps = new Set<number>();
    while (newTraps.size < jumlahJebakan) {
      const randomTile = Math.floor(Math.random() * totalPetakBermain) + 1;
      newTraps.add(randomTile);
    }

    await startGame(Array.from(newTraps));
  };

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

    const { data: mhsData } = await supabase
      .from("mahasiswa")
      .select("total_xp")
      .eq("id_mahasiswa", myIdMahasiswa)
      .single();

    const currentXp = mhsData?.total_xp || 0;

    if (currentXp < hargaPoin) {
      setToastMsg(`❌ XP kurang! Butuh ${hargaPoin} pts, XP kamu ${currentXp} pts.`);
      setTimeout(() => setToastMsg(""), 3000);
      return;
    }

    let skillSuccess = true;

    if (Number(skillId) === 1) {
      setActiveSkillId(1);
      playSfx("skill_double");
      setToastMsg("⚔️ Lemparan Ganda Aktif! (Dadu x2)");
      flashSkillEffect(SKILL_EFFECTS[1]);
      
      sendBroadcast(`⚔️ ${myName} menggunakan skill Lemparan Ganda!`); 
      
    } else if (Number(skillId) === 2) {
      setHasShield(true);
      playSfx("skill_shield");
      setToastMsg("🛡️ Perisai Aktif! Kamu kebal dari 1 bom.");
      flashSkillEffect(SKILL_EFFECTS[2]);
      
      sendBroadcast(`🛡️ ${myName} mengaktifkan skill Perisai!`); 
      
    } else if (Number(skillId) === 3) {
      setHasExtraTurn(true);
      playSfx("skill_time");
      setToastMsg("❄️ Ramuan Waktu! Kamu mendapat 1 giliran ekstra.");
      flashSkillEffect(SKILL_EFFECTS[3]);
      
      sendBroadcast(`❄️ ${myName} meminum Ramuan Waktu! (Dapat giliran ekstra)`); 
      
    } else if (Number(skillId) === 4) {
      const opponentPositions = players
        .filter((p) => p.id_user !== currentUserId)
        .map((p) => p.posisi);

      const maxOpponentPos =
        opponentPositions.length > 0 ? Math.max(0, ...opponentPositions) : 0;

      if (maxOpponentPos > playerPosition) {
        hasRolledRef.current = true;
        setHasRolled(true);
        turnPassedRef.current = false;

        playSfx("skill_teleport");
        setToastMsg("🔀 Teleportasi! Kamu menyalin posisi musuh terdepan.");
        flashSkillEffect(SKILL_EFFECTS[4]);
        
        sendBroadcast(`🔀 ${myName} Teleportasi ke posisi terdepan!`); 

        setPlayerPosition(maxOpponentPos);
        setTargetPosition(maxOpponentPos);
        updateMyPosisi(maxOpponentPos);

        setTimeout(() => {
          endTurnOnce();
        }, 2500);
      } else {
        skillSuccess = false;
        setToastMsg("⚠️ Kamu sudah di depan, Teleportasi gagal!");
      }
    }

    if (!skillSuccess) {
      setTimeout(() => setToastMsg(""), 3000);
      return;
    }

    setHasUsedSkillThisTurn(true);
    setTimeout(() => setToastMsg(""), 3000);
    setShowSkills(false);

    await supabase
      .from("mahasiswa")
      .update({ total_xp: currentXp - hargaPoin })
      .eq("id_mahasiswa", myIdMahasiswa);
  };

  const handleRollDice = () => {
    if (
      !isMyTurn ||
      isMoving ||
      mapCoords.length === 0 ||
      hasRolledRef.current ||
      isRolling
    ) {
      return;
    }

    hasRolledRef.current = true;
    setHasRolled(true);
    turnPassedRef.current = false;
    setIsRolling(true);
    playSfx("roll_dice");

    let finalRoll = Math.floor(Math.random() * 6) + 1;
    let totalSteps = finalRoll;
    const isDouble = activeSkillId === 1;
    let roll2 = 0;

    if (isDouble) {
      roll2 = Math.floor(Math.random() * 6) + 1;
      totalSteps = finalRoll + roll2;
    }

    const rollInterval = setInterval(() => {
      setDiceValue(Math.floor(Math.random() * 6) + 1);
    }, 100);

    setTimeout(() => {
      clearInterval(rollInterval);
      setIsRolling(false);
      setActiveSkillId(null);
      setDiceValue(finalRoll);

      if (isDouble) {
        setToastMsg(`🎲 Lemparan Ganda: ${finalRoll} + ${roll2} = ${totalSteps}`);
        setTimeout(() => {
          setToastMsg("");
        }, 3000);
      }

      setTargetPosition((prevTarget) => {
        const newTarget = prevTarget + totalSteps;
        const maxPos = mapCoords.length - 1;
        
        // JURUS MANTUL ULAR TANGGA
        if (newTarget > maxPos) {
          const excess = newTarget - maxPos;
          setBounceTarget(maxPos - excess);
          return maxPos;
        }
        
        return newTarget;
      });
    }, 1000);
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
          const maxPos = mapCoords.length - 1;

          // CEK MANTUL ULAR TANGGA
          if (nextPos === maxPos && bounceTarget !== null) {
            setTargetPosition(bounceTarget);
            setBounceTarget(null);
            
            setToastMsg("💨 Dadu kelebihan! Kamu mantul mundur wkwk");
            sendBroadcast(`💨 Dadu ${myName} kelebihan, dia mantul mundur!`);
            return; 
          }

          setIsMoving(false);

          // MENANG BENERAN
          if (nextPos === maxPos) {
            if (currentUserId) {
              finishGame(currentUserId);
              playSfx("win");
              sendBroadcast(`🏆 ${myName} mencapai Finish dan mendapat 50 XP!`);

              const myIdMahasiswa = profiles[currentUserId]?.idMahasiswa;
              if (myIdMahasiswa) {
                incrementStat(myIdMahasiswa, "arena_menang");
                
                // TAMBAH 50 XP BUAT PEMENANG
                supabase
                  .from("mahasiswa")
                  .select("total_xp")
                  .eq("id_mahasiswa", myIdMahasiswa)
                  .single()
                  .then(({ data }) => {
                    const currentXp = data?.total_xp || 0;
                    supabase
                      .from("mahasiswa")
                      .update({ total_xp: currentXp + 50 })
                      .eq("id_mahasiswa", myIdMahasiswa)
                      .then(() => console.log("Berhasil tambah 50 XP!"));
                  });

                const ID_BADGE_FINISH = 2;
                supabase
                  .from("mahasiswa_badges")
                  .upsert(
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
          } 
          // KENA JEBAKAN BOM (DENGAN PENAHAN GEMBOK GANDA)
          else if (trapTiles.includes(nextPos)) {
            
            if (!hasTriggeredTrapRef.current) {
              hasTriggeredTrapRef.current = true; // KUNCI GEMBOK
              
              setTrapTiles((prev) => prev.filter((t) => t !== nextPos));

              if (hasShield) {
                setHasShield(false);
                playSfx("skill_shield");
                flashSkillEffect(SHIELD_BLOCK_EFFECT);
                setToastMsg("🛡️ DARR! Tapi Perisaimu menahan ledakan bom!");
                
                sendBroadcast(`🛡️ ${myName} berhasil menahan jebakan BOM dengan perisai!`);

                setTimeout(() => {
                  endTurnOnce();
                }, 2500);
              } else {
                const myIdMahasiswa = profiles[currentUserId as string]?.idMahasiswa;
                if (myIdMahasiswa) {
                  incrementStat(myIdMahasiswa, "arena_jebakan");
                }

                let newSoal = pickRandomSoal();
                let attempts = 0;
                while (usedSoalIds.includes(newSoal.id_soal) && attempts < 10) {
                  newSoal = pickRandomSoal();
                  attempts++;
                }
                setUsedSoalIds((prev) => [...prev, newSoal.id_soal]);
                setCurrentSoal(newSoal);
                
                sendBroadcast(`💥 BOOM! ${myName} menginjak Jebakan!`); 

                setTimeout(() => {
                  setShowBoom(true);
                  playSfx("boom");
                  
                  setTimeout(() => {
                    setShowBoom(false);
                    setShowQuestionModal(true);
                  }, 1500);
                }, 300);
              }
            }
          } else {
            endTurnOnce();
          }
        }
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [
    playerPosition,
    targetPosition,
    trapTiles,
    mapCoords.length,
    usedSoalIds,
    hasShield,
    bounceTarget, // TAMBAH DEPENDENCY BOUNCE
  ]);

  const handleAnswer = async (id_jawaban: number) => {
    setShowQuestionModal(false);

    let isCorrect = false;
    if (currentSoal?.id_soal === 999) {
      isCorrect = id_jawaban === 2;
    } else {
      const { data } = await supabase
        .from("jawaban")
        .select("jawaban_benar")
        .eq("id_jawaban", id_jawaban)
        .single();
      isCorrect = !!(data && data.jawaban_benar === true);
    }

    setAnswerResult(isCorrect);
    if (isCorrect) playSfx("correct");
    else playSfx("wrong");

    setTimeout(() => {
      setAnswerResult(null);

      if (isCorrect) {
        setToastMsg("✅ Benar! Kamu maju 1 Langkah.");
        sendBroadcast(`✅ ${myName} menjawab benar dan maju!`);
        
        setTargetPosition((prev) => Math.min(prev + 1, mapCoords.length - 1));
      } else {
        setToastMsg("❌ Salah! Kamu dihukum mundur 2 Langkah.");
        sendBroadcast(`❌ ${myName} menjawab salah dan dihukum mundur!`); 
        
        setTargetPosition((prev) => Math.max(0, prev - 2));
      }

      setTimeout(() => {
        setToastMsg("");
        endTurnOnce();
      }, 3000);
    }, 1800);
  };

  const activePlayersList = players.map((p) => {
    const isMe = p.id_user === currentUserId;
    const pos = isMe ? playerPosition : p.posisi;
    const profile = profiles[p.id_user] || {
      idMahasiswa: 0,
      namaMahasiswa: "Pemain",
      avatarUrl: null,
    };
    return {
      id: p.id_user,
      idMahasiswa: profile.idMahasiswa,
      position: pos,
      name: profile.namaMahasiswa,
      avatarUrl: profile.avatarUrl,
      isMe,
    };
  });

  if (isRoomLoading || isBoardLoading) {
    return (
      <div className="h-screen bg-[#F8F9FB] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
        <p className="text-white">Memuat arena...</p>
      </div>
    );
  }

  if (!room || boardError || !boardData) {
    return (
      <div className="h-screen bg-[#F8F9FB] flex flex-col items-center justify-center gap-3 text-center px-6">
        <p className="text-red-500 font-bold text-lg">
          {boardError ?? "Ruangan tidak ditemukan."}
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
        leaveRoom={leaveRoom}
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
          <span className="text-[#5B5288] font-bold text-lg">
            {toastMsg}
          </span>
        </div>
      )}

      {/* HEADER NAVIGASI */}
      <div className="w-full flex justify-between items-center p-8 shrink-0 z-10 relative">
        <h1 className="text-3xl font-extrabold text-[#5B5288]">
          Arena Kelas — {boardData.nama_game}
        </h1>

        <div className="flex items-center gap-6">
          <span
            className={`px-4 py-2 rounded-xl font-bold text-sm ${
              isMyTurn ? "bg-[#39C936] text-white" : "bg-gray-100 text-slate-400"
            }`}
          >
            {isMyTurn ? "Giliranmu! 🎲" : "Menunggu giliran..."}
          </span>

          {canSkipTurn && !isMyTurn && isHost && (
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
              className="p-2 text-slate-400 hover:text-slate-300 transition-colors"
            >
              <Settings className="w-6 h-6" />
            </button>

            <button
              onClick={() => setShowGuide(true)}
              className="p-2 text-slate-400 hover:text-slate-300 transition-colors"
            >
              <HelpCircle className="w-6 h-6" />
            </button>

            <MiniProfile />
          </div>
        </div>
      </div>

      {/* AREA GAME */}
      <div className="flex-1 relative w-full h-full flex flex-col items-center justify-center p-4 lg:p-8 z-10 overflow-hidden">
        {/* BOARD */}
        <div className="w-full max-w-3xl lg:max-w-4xl xl:max-w-5xl z-10 flex justify-center mb-auto lg:mb-0 shrink-0">
          <GameBoardCanvas
            boardData={boardData}
            mapCoords={mapCoords}
            activePlayers={activePlayersList}
          />
        </div>

        {/* HUD */}
        <div className="w-full flex justify-between items-end lg:static z-20 mt-4 lg:mt-0 shrink-0">
          {/* PLAYER DOCK */}
          <div className="lg:absolute lg:bottom-8 lg:left-8 lg:z-30 flex flex-col items-start">
            <PlayerDock
              showSkills={showSkills}
              onToggleSkills={() => setShowSkills((prev) => !prev)}
              isSkillLoading={isSkillLoading}
              skillList={skillList}
              activePlayers={activePlayersList}
              onUseSkill={handleUseSkill}
            />
          </div>

          {/* DICE */}
          <div className="w-[180px] sm:w-[220px] lg:w-[280px] lg:absolute lg:right-8 lg:top-1/2 lg:-translate-y-1/2 lg:z-30">
            <DiceControl
              diceValue={diceValue}
              disabled={
                !isMyTurn ||
                isMoving ||
                hasRolled ||
                playerPosition === mapCoords.length - 1 ||
                isRolling
              }
              onRoll={handleRollDice}
            />
          </div>
        </div>
      </div>

      {showBoom && <BoomModal />}

      {answerResult !== null && (
        <AnswerResultModal isCorrect={answerResult} />
      )}

      {skillEffect && (
        <SkillEffectModal {...skillEffect} />
      )}

      {showQuestionModal && currentSoal && (
        <QuestionModal
          currentSoal={currentSoal}
          onAnswer={handleAnswer}
        />
      )}

      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          isBgmEnabled={isBgmEnabled}
          setIsBgmEnabled={setIsBgmEnabled}
          isSfxEnabled={isSfxEnabled}
          setIsSfxEnabled={setIsSfxEnabled}
        />
      )}

      {showGuide && (
        <GuideModal onClose={() => setShowGuide(false)} />
      )}
    </div>
  );
}