"use client";

import { Loader2 } from "lucide-react";
import type { Skill } from "@/hooks/useSkills";

type SkillPanelProps = {
  isOpen: boolean;
  isLoading: boolean;
  skillList: Skill[];
  onUseSkill: (skillId: number, hargaPoin: number) => void; // <-- TAMBAHAN BARU
};

export default function SkillPanel({
  isOpen,
  isLoading,
  skillList,
  onUseSkill,
}: SkillPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute bottom-[110%] left-0 w-[280px] bg-[#5B5288] rounded-2xl p-3 shadow-2xl border border-white/10 z-40">
      <div className="flex flex-col gap-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          </div>
        ) : skillList.length === 0 ? (
          <p className="text-white text-xs text-center py-2">
            Belum ada skill tersedia.
          </p>
        ) : (
          skillList.map((skill) => (
            <button
              key={skill.id_skill}
              title={skill.fungsi}
              onClick={() => onUseSkill(skill.id_skill, skill.harga_poin)} // <-- KLIK SKILL DISINI
              className="flex items-center justify-between bg-white px-3 py-3 rounded-xl hover:bg-gray-50 hover:scale-[1.02] transition-all"
            >
              <div className="flex items-center gap-3">
                <img
                  src={skill.icon_url}
                  alt={skill.nama_skill}
                  className="w-6 h-6 object-contain"
                />
                <span className="text-[#5B5288] font-bold text-[13px]">
                  {skill.nama_skill}
                </span>
              </div>
              <span className="text-gray-400 text-xs font-semibold bg-gray-100 px-2 py-1 rounded-md">
                {skill.harga_poin} pts
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}