"use client";

import type { GameBoard, PetakCoord } from "@/hooks/useGameBoard";

export type ActivePlayer = {
  id: string;
  position: number;
  name: string;
  avatarUrl: string | null;
  isMe: boolean;
};

type GameBoardCanvasProps = {
  boardData: GameBoard;
  mapCoords: PetakCoord[];
  activePlayers: ActivePlayer[]; // <-- Diubah
};

const OFFSET_PATTERNS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [
    [-12, 0],
    [12, 0],
  ],
  3: [
    [0, -12],
    [-13, 9],
    [13, 9],
  ],
  4: [
    [-13, -13],
    [13, -13],
    [-13, 13],
    [13, 13],
  ],
};

export default function GameBoardCanvas({
  boardData,
  mapCoords,
  activePlayers,
}: GameBoardCanvasProps) {
  // Kelompokkan index pemain (di array activePlayers) berdasarkan posisi
  const groupedByPosition = new Map<number, number[]>();
  activePlayers.forEach((player, playerIdx) => {
    const group = groupedByPosition.get(player.position) ?? [];
    group.push(playerIdx);
    groupedByPosition.set(player.position, group);
  });

  return (
    <div className="relative w-full max-w-[500px] xl:max-w-[750px] h-[60vh] lg:h-full overflow-y-auto no-scrollbar z-10 flex flex-col px-2 order-1 lg:order-2">
      <div className="relative w-full m-auto shadow-2xl rounded-[30px] xl:rounded-[40px] overflow-hidden border-4 border-white/50 bg-gray-200 flex-shrink-0">
        <img
          src={boardData.thumbnail_url}
          alt={boardData.nama_game}
          className="w-full h-auto block"
        />

        {activePlayers.map((player, playerIdx) => {
          const coord = mapCoords[player.position];
          if (!coord) return null;

          const group = groupedByPosition.get(player.position) ?? [playerIdx];
          const indexInGroup = group.indexOf(playerIdx);
          const groupSize = Math.min(group.length, 4);

          const pattern = OFFSET_PATTERNS[groupSize] ?? OFFSET_PATTERNS[4];
          const [offsetX, offsetY] = pattern[indexInGroup] ?? [0, 0];
          
          const finalAvatarUrl = player.avatarUrl || `https://api.dicebear.com/7.x/micah/svg?seed=${encodeURIComponent(player.name)}`;

          return (
            <div
              key={`pion-${player.id}`}
              className={`absolute w-8 h-8 xl:w-10 xl:h-10 bg-white rounded-full border-4 ${
                player.isMe
                  ? "border-blue-500 z-30"
                  : "border-gray-400 z-20"
              } shadow-lg flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-300 linear`}
              style={{
                top: `calc(${coord.y}% + ${offsetY}px)`,
                left: `calc(${coord.x}% + ${offsetX}px)`,
              }}
            >
              <img
                src={finalAvatarUrl}
                alt={`Pion ${player.name}`}
                className="w-full h-full object-cover rounded-full"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}