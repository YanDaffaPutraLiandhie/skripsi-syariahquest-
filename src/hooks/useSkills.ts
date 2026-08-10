"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type Skill = {
  id_skill: number;
  nama_skill: string;
  harga_poin: number;
  fungsi: string;
  icon_url: string;
};

export function useSkills() {
  const [skillList, setSkillList] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    async function fetchSkills() {
      setIsLoading(true);

      const { data, error } = await supabase
        .from("skill")
        .select("id_skill, nama_skill, harga_poin, fungsi, icon_url")
        .order("id_skill", { ascending: true });

      if (isCancelled) return;

      if (error) {
        console.error("Gagal menarik data skill:", error);
      } else if (data) {
        setSkillList(data as Skill[]);
      }

      setIsLoading(false);
    }

    fetchSkills();

    return () => {
      isCancelled = true;
    };
  }, []);

  return { skillList, isLoading };
}