import type { Scene } from "@/lib/game/sceneTypes";

export const SCENES: Record<string, Scene> = {
  scene_01: {
    id: "scene_01",
    background: "/game/scene-6.jpg",
    characters: [{ characterId: "teacher_female", expression: "happy", position: "left" }],
    speaker: "teacher_female",
    text: "Selamat datang, {{playerName}}! Siap memulai misi pertamamu mempelajari ekonomi syariah?",
    choices: [
      { id: "a", text: "Saya siap belajar!", nextScene: "scene_02" },
      { id: "b", text: "Bisakah jelaskan dulu?", nextScene: "scene_03" },
    ],
  },
  scene_02: {
    id: "scene_02",
    background: "/game/scene-6.jpg",
    characters: [{ characterId: "teacher_female", expression: "smile", position: "left" }],
    speaker: "teacher_female",
    text: "Bagus! Hari ini kita akan membantu seorang pelanggan memahami akad murabahah.",
    nextScene: "scene_04",
  },
  scene_03: {
    id: "scene_03",
    background: "/game/scene-6.jpg",
    characters: [{ characterId: "teacher_female", expression: "thinking", position: "left" }],
    speaker: "teacher_female",
    text: "Tentu. Murabahah adalah jual beli dengan keuntungan yang disepakati secara transparan.",
    nextScene: "scene_04",
  },
  scene_04: {
    id: "scene_04",
    background: "/game/scene-6.jpg",
    characters: [{ characterId: "teacher_female", expression: "normal", position: "left" }],
    speaker: "narrator",
    text: "Misi pertama selesai. Kembali ke peta untuk melanjutkan.",
    nextScene: "scene_01",
  },
};
