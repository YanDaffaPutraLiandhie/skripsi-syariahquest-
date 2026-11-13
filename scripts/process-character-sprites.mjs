/**
 * process-character-sprites.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Post-processes AI-generated character sprites:
 * 1. Removes white/near-white background (if not already transparent)
 * 2. Trims empty space to tight character bounds
 * 3. Upscales to consistent height (800px) keeping aspect ratio
 * 4. Saves as high-quality PNG with transparency
 *
 * Run from project root:
 *   node scripts/process-character-sprites.mjs
 */

import sharp from "sharp";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const GAME = join(ROOT, "public", "game");

// Target height for all character sprites (consistent in-game display)
const TARGET_HEIGHT = 800;

// Characters to process
const CHARACTERS = [
  { file: "npc-1.png",        alias: "rayhan_transparent.png",  label: "Rayhan (Male Teacher)" },
  { file: "npc-2.png",        alias: "aisyah_transparent.png",  label: "Aisyah (Female Mentor)" },
  { file: "student-1.png",    alias: "student_transparent.png", label: "Ahmad (Male Student)" },
  { file: "student-2.png",    alias: "student2_transparent.png",label: "Siti (Female Student)" },
  { file: "npc-5.png",        alias: null,                      label: "Pak Hasan (Pedagang)" },
  { file: "npc-6.png",        alias: null,                      label: "Bu Halimah (UMKM)" },
  { file: "npc-4.png",        alias: null,                      label: "Nasabah Bank" },
  { file: "npc-6-alt.png",    alias: null,                      label: "Mas Dimas (Klien)" },
];

async function removeWhiteBg(inputBuffer, tolerance = 30) {
  const { data, info } = await sharp(inputBuffer)
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const pixels = Buffer.from(data);

  // Sample background from corner 3×3 blocks
  function avgBlock(cx, cy) {
    let r = 0, g = 0, b = 0, n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x2 = Math.min(W-1, Math.max(0, cx+dx));
      const y2 = Math.min(H-1, Math.max(0, cy+dy));
      const i = (y2*W+x2)*C; r+=pixels[i]; g+=pixels[i+1]; b+=pixels[i+2]; n++;
    }
    return [r/n|0, g/n|0, b/n|0];
  }
  const cs = [avgBlock(0,0), avgBlock(W-1,0), avgBlock(0,H-1), avgBlock(W-1,H-1)];
  const bgR = cs.reduce((s,c)=>s+c[0],0)/4|0;
  const bgG = cs.reduce((s,c)=>s+c[1],0)/4|0;
  const bgB = cs.reduce((s,c)=>s+c[2],0)/4|0;
  const isBg = (r,g,b) => Math.sqrt((r-bgR)**2+(g-bgG)**2+(b-bgB)**2) <= tolerance;

  // Check if already has significant transparency
  let existingTransparent = 0;
  for (let i = 3; i < pixels.length; i += C) if (pixels[i] < 128) existingTransparent++;
  const transparentRatio = existingTransparent / (W * H);
  
  if (transparentRatio > 0.1) {
    // Already has transparency — just trim, don't re-process
    console.log(`    (already ${Math.round(transparentRatio*100)}% transparent, skipping bg removal)`);
    return inputBuffer;
  }

  // Remove background using global color keying
  for (let i = 0; i < pixels.length; i += C) {
    const r = pixels[i], g = pixels[i+1], b = pixels[i+2];
    const dist = Math.sqrt((r-bgR)**2+(g-bgG)**2+(b-bgB)**2);
    if (dist <= tolerance) {
      pixels[i+3] = 0;
    } else if (dist < tolerance + 15) {
      pixels[i+3] = Math.round(pixels[i+3] * (dist - tolerance) / 15);
    }
  }
  return sharp(pixels, { raw: { width: W, height: H, channels: C } }).png().toBuffer();
}

async function processCharacter(charDef) {
  const srcPath = join(GAME, charDef.file);
  if (!existsSync(srcPath)) {
    console.log(`  ⏭️  Skipped (not found): ${charDef.file}`);
    return;
  }

  const meta = await sharp(srcPath).metadata();
  console.log(`  📐 ${charDef.label}: ${meta.width}×${meta.height}px input`);

  // Step 1: Read and remove background if needed
  const raw = await sharp(srcPath).png().toBuffer();
  const noBg = await removeWhiteBg(raw, 32);

  // Step 2: Trim transparent edges
  let trimmed;
  try {
    trimmed = await sharp(noBg)
      .trim({ background: { r:0,g:0,b:0,alpha:0 }, threshold: 3 })
      .png().toBuffer();
  } catch {
    trimmed = noBg;
  }

  // Step 3: Resize to target height keeping aspect ratio
  const trimMeta = await sharp(trimmed).metadata();
  const scaleFactor = TARGET_HEIGHT / trimMeta.height;
  const targetWidth = Math.round(trimMeta.width * scaleFactor);

  const resized = await sharp(trimmed)
    .resize(targetWidth, TARGET_HEIGHT, {
      kernel: sharp.kernel.lanczos3,
      fit: "contain",
      background: { r:0, g:0, b:0, alpha:0 }
    })
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();

  // Save main file
  await sharp(resized).toFile(srcPath);
  const finalMeta = await sharp(resized).metadata();
  console.log(`  ✅ ${charDef.file}: ${finalMeta.width}×${finalMeta.height}px (${Math.round(resized.length/1024)}KB)`);

  // Save alias
  if (charDef.alias) {
    await sharp(resized).toFile(join(GAME, charDef.alias));
    console.log(`  ✅ Alias: ${charDef.alias}`);
  }
}

async function main() {
  console.log(`🎨 Processing character sprites → target height: ${TARGET_HEIGHT}px\n`);
  for (const char of CHARACTERS) {
    await processCharacter(char);
  }
  console.log("\n✨ Done processing all character sprites!");
}

main().catch(err => { console.error("❌", err); process.exit(1); });

