"use client";

import { useCallback } from 'react';

// Daftar semua efek suara kamu sesuai struktur folder
export const SFX_PATHS = {
  boom: '/sounds/sfx/boom.mp3',
  correct: '/sounds/sfx/correct.mp3',
  wrong: '/sounds/sfx/wrong.mp3',
  skill_double: '/sounds/sfx/skill_double.mp3',
  skill_shield: '/sounds/sfx/skill_shield.mp3',
  skill_time: '/sounds/sfx/skill_time.mp3',
  skill_teleport: '/sounds/sfx/skill_teleport.mp3',
  win: '/sounds/sfx/win.mp3',
  lose: '/sounds/sfx/lose.mp3',
  roll_dice: '/sounds/sfx/roll_dice.mp3' // BARU: Suara dadu dikocok!
};

export type SfxName = keyof typeof SFX_PATHS;

export function useSoundEffects(isEnabled: boolean) {
  const playSfx = useCallback((name: SfxName) => {
    if (!isEnabled || typeof window === 'undefined') return;
    
    const audio = new Audio(SFX_PATHS[name]);
    audio.volume = 0.8;
    audio.play().catch(e => console.warn("Gagal memutar SFX:", e));
  }, [isEnabled]);

  return { playSfx };
}