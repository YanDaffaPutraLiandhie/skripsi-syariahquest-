export function formatDialogue(text: string, playerName: string): string {
  return text.replace(/\{\{playerName\}\}/g, playerName || "Mahasiswa");
}
