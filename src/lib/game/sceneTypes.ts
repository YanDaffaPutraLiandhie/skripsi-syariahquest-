import type { CharacterId, Expression } from "@/lib/game/characterRegistry";

export type SceneCharacter = {
  characterId: CharacterId;
  expression: Expression;
  position: "left" | "center" | "right";
};

export type SceneChoice = {
  id: string;
  text: string;
  nextScene: string;
};

export type Scene = {
  id: string;
  background: string;
  characters: SceneCharacter[];
  speaker: CharacterId | "narrator";
  text: string;
  choices?: SceneChoice[];
  nextScene?: string;
};
