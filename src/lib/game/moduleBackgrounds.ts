const MODULE_BACKGROUNDS = [
  "/game/scene-6.jpg",
  "/game/scene-4.jpg",
  "/game/scene-5.jpg",
  "/game/scene-3.jpg",
  "/game/scene-7.jpg",
  "/game/scene-8.jpg",
  "/game/scene-1.jpg",
  "/game/scene-2.jpg",
] as const;

/**
 * Keeps one visual-novel background for the whole module.
 * A new background is selected only when the module id changes.
 */
export function getModuleBackground(moduleId: number): string {
  const safeModuleId = Number.isFinite(moduleId) && moduleId > 0 ? Math.floor(moduleId) : 1;
  return MODULE_BACKGROUNDS[(safeModuleId - 1) % MODULE_BACKGROUNDS.length];
}
