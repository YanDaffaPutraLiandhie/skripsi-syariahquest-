export type CharacterId =
  | "teacher_male"
  | "teacher_female"
  | "student_male"
  | "student_female"
  | "npc_pedagang"
  | "npc_banker"
  | "npc_umkm"
  | "npc_klien";

export type Expression =
  | "normal"
  | "happy"
  | "smile"
  | "sad"
  | "confused"
  | "thinking"
  | "surprised"
  | "serious"
  | "disappointed";

export type CharacterDef = {
  id: CharacterId;
  name: string;
  role: "player_avatar" | "npc" | "mentor";
  avatar: string;
  expressions: Partial<Record<Expression, string>>;
};

export const CHARACTER_REGISTRY: Record<CharacterId, CharacterDef> = {
  teacher_female: {
    id: "teacher_female",
    name: "Aisyah (Mentor Konsultan)",
    role: "mentor",
    avatar: "/game/npc-2.png",
    expressions: {
      normal: "/game/npc-2.png",
      happy: "/game/npc-2.png",
      smile: "/game/npc-2.png",
      sad: "/game/npc-2.png",
      confused: "/game/npc-2.png",
      thinking: "/game/npc-2.png",
      surprised: "/game/npc-2.png",
      serious: "/game/npc-2.png",
      disappointed: "/game/npc-2.png",
    },
  },
  teacher_male: {
    id: "teacher_male",
    name: "Ustadz Rayhan (Mentor Fiqih)",
    role: "mentor",
    avatar: "/game/npc-1.png",
    expressions: {
      normal: "/game/npc-1.png",
      happy: "/game/npc-1.png",
      smile: "/game/npc-1.png",
      sad: "/game/npc-1.png",
      confused: "/game/npc-1.png",
      thinking: "/game/npc-1.png",
      surprised: "/game/npc-1.png",
      serious: "/game/npc-1.png",
      disappointed: "/game/npc-1.png",
    },
  },
  student_male: {
    id: "student_male",
    name: "Ahmad Fauzi (Mahasiswa)",
    role: "player_avatar",
    avatar: "/game/student-1.png",
    expressions: {
      normal: "/game/student-1.png",
      happy: "/game/student-1.png",
      smile: "/game/student-1.png",
      sad: "/game/student-1.png",
      thinking: "/game/student-1.png",
    },
  },
  student_female: {
    id: "student_female",
    name: "Siti Rahma (Mahasiswi)",
    role: "player_avatar",
    avatar: "/game/student-2.png",
    expressions: {
      normal: "/game/student-2.png",
      happy: "/game/student-2.png",
      smile: "/game/student-2.png",
      sad: "/game/student-2.png",
      thinking: "/game/student-2.png",
    },
  },
  npc_pedagang: {
    id: "npc_pedagang",
    name: "Pak Hasan (Pedagang Pasar)",
    role: "npc",
    avatar: "/game/npc-3.png",
    expressions: {
      normal: "/game/npc-3.png",
      smile: "/game/npc-3.png",
    },
  },
  npc_banker: {
    id: "npc_banker",
    name: "Pak Burhan (Bankir Syariah)",
    role: "npc",
    avatar: "/game/npc-4.png",
    expressions: {
      normal: "/game/npc-4.png",
      smile: "/game/npc-4.png",
    },
  },
  npc_umkm: {
    id: "npc_umkm",
    name: "Bu Halimah (Pelaku UMKM)",
    role: "npc",
    avatar: "/game/npc-5.png",
    expressions: {
      normal: "/game/npc-5.png",
      smile: "/game/npc-5.png",
    },
  },
  npc_klien: {
    id: "npc_klien",
    name: "Mas Dimas (Klien Konsultasi)",
    role: "npc",
    avatar: "/game/npc-6.png",
    expressions: {
      normal: "/game/npc-6.png",
      smile: "/game/npc-6.png",
    },
  },
};

export function getCharacter(id: CharacterId): CharacterDef | undefined {
  return CHARACTER_REGISTRY[id] || CHARACTER_REGISTRY.teacher_female;
}

export function getExpressionSrc(id: CharacterId | string | null | undefined, expr: Expression = "normal"): string {
  if (!id) return "/game/npc-2.png";
  const c = CHARACTER_REGISTRY[id as CharacterId];
  if (!c) return "/game/npc-2.png";
  return c.expressions[expr] ?? c.avatar ?? "/game/npc-2.png";
}
