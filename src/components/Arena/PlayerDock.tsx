"use client";

import SkillPanel from "./SkillPanel";
import type { Skill } from "@/hooks/useSkills";

export type ActivePlayer = {
  id: string;
  position: number;
  name: string;
  avatarUrl: string | null;
  isMe: boolean;
};

type PlayerDockProps = {
  showSkills: boolean;
  onToggleSkills: () => void;
  isSkillLoading: boolean;
  skillList: Skill[];
  activePlayers: ActivePlayer[];
  onUseSkill: (skillId: number, hargaPoin: number) => void; // <-- TAMBAHAN BARU
};

export default function PlayerDock({
  showSkills,
  onToggleSkills,
  isSkillLoading,
  skillList,
  activePlayers,
  onUseSkill, // <-- TERIMA PROP
}: PlayerDockProps) {
  return (
    <div className="flex flex-row lg:flex-col gap-4 lg:gap-5 items-center lg:items-start justify-center lg:justify-end h-auto lg:h-full w-full pb-0 lg:pb-4 order-2 lg:order-1">
      <div className="relative">
        <SkillPanel
          isOpen={showSkills}
          isLoading={isSkillLoading}
          skillList={skillList}
          onUseSkill={onUseSkill} // <-- LEMPAR KE SKILL PANEL
        />

        <button
          onClick={onToggleSkills}
          className="w-14 h-14 lg:w-16 lg:h-16 bg-[#5B5288] rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform p-3 relative z-10"
        >
          <img
            src="/images/icon-pedang.png"
            alt="Serang"
            className="w-full h-full object-contain drop-shadow-md"
          />
        </button>
      </div>

      <div className="bg-white px-3 lg:px-4 py-2 lg:py-3 rounded-2xl shadow-lg border border-gray-100 flex gap-2">
        {activePlayers.map((player) => {
          const finalAvatarUrl = player.avatarUrl || `https://api.dicebear.com/7.x/micah/svg?seed=${encodeURIComponent(player.name)}`;

          return (
            <div
              key={player.id}
              title={player.name}
              className={`w-10 h-10 xl:w-12 xl:h-12 bg-blue-100 rounded-full overflow-hidden border-2 ${
                player.isMe ? "border-[#39C936]" : "border-transparent"
              } relative group cursor-pointer`}
            >
              <img
                src={finalAvatarUrl}
                alt={`Pemain ${player.name}`}
                className="w-full h-full object-cover"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}