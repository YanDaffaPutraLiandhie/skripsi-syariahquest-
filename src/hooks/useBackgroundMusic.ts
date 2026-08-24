"use client";

import { useEffect, useRef, useState } from 'react';

export function useBackgroundMusic(src: string, isEnabled: boolean) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);

  // Setup elemen audio
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio(src);
      audioRef.current.loop = true;
      audioRef.current.volume = 0.35; // Volume agak pelan biar gak nutupin SFX
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, [src]);

  // Buka gembok autoplay browser pada interaksi pertama (klik layar)
  useEffect(() => {
    const unlockAudio = () => {
      setIsUnlocked(true);
      document.removeEventListener('click', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);
    
    return () => document.removeEventListener('click', unlockAudio);
  }, []);

  // Logika Mainkan/Jeda BGM
  useEffect(() => {
    if (!audioRef.current) return;

    if (isEnabled && isUnlocked) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => console.warn("Browser belum mengizinkan Autoplay BGM", error));
      }
    } else {
      audioRef.current.pause();
    }
  }, [isEnabled, isUnlocked]);
}