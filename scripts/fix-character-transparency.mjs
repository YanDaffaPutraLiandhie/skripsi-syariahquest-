/**
 * fix-character-transparency.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Reprocesses AI-generated character sprites from original JPG files.
 *
 * Uses BFS flood-fill from image EDGES (not global keying) to safely remove
 * only the background, preserving white shirts, skin highlights, light areas.
 *
 * Run from project root:
 *   node scripts/fix-character-transparency.mjs
 */

import sharp from "sharp";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const GAME = join(ROOT, "public", "game");
const BRAIN = "C:/Users/YAN DAFFA/.gemini/antigravity/brain/f1943f75-8ffc-4776-b356-bd8cfc4f8764";

/**
 * BFS flood-fill background removal from all 4 image edges.
 * Only removes pixels CONNECTED to the edge that match the background color.
 * This safely preserves white shirts, skin highlights etc. inside the character.
 *
 * @param {Buffer} inputBuffer - PNG or JPG buffer
 * @param {number} tolerance   - Color distance tolerance (default 20 — conservative)
 * @returns {Promise<Buffer>}  - Transparent PNG, trimmed
 */
async function removeBackgroundFloodFill(inputBuffer, tolerance = 20) {
  const { data, info } = await sharp(inputBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width: W, height: H, channels: C } = info;
  const pixels = Buffer.from(data);

  // Sample background from corner 3×3 blocks and average
  function sampleBlock(cx, cy) {
    let r = 0, g = 0, b = 0, n = 0;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const x2 = Math.min(W - 1, Math.max(0, cx + dx));
        const y2 = Math.min(H - 1, Math.max(0, cy + dy));
        const i = (y2 * W + x2) * C;
        r += pixels[i]; g += pixels[i + 1]; b += pixels[i + 2]; n++;
      }
    }
    return [r / n, g / n, b / n];
  }

  const corners = [
    sampleBlock(0, 0), sampleBlock(W - 1, 0),
    sampleBlock(0, H - 1), sampleBlock(W - 1, H - 1),
    // Also sample edge midpoints for better bg estimate
    sampleBlock(W >> 1, 0), sampleBlock(0, H >> 1),
    sampleBlock(W - 1, H >> 1), sampleBlock(W >> 1, H - 1),
  ];

  const bgR = corners.reduce((s, c) => s + c[0], 0) / corners.length;
  const bgG = corners.reduce((s, c) => s + c[1], 0) / corners.length;
  const bgB = corners.reduce((s, c) => s + c[2], 0) / corners.length;

  function colorDist(r, g, b) {
    return Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
  }

  // BFS: seed from ALL edge pixels that look like background
  const visited = new Uint8Array(W * H);
  const queue = [];
  let head = 0;

  function tryAdd(idx) {
    if (visited[idx]) return;
    const pi = idx * C;
    if (colorDist(pixels[pi], pixels[pi + 1], pixels[pi + 2]) <= tolerance) {
      visited[idx] = 1;
      queue.push(idx);
    }
  }

  // Seed entire top/bottom rows and left/right columns
  for (let x = 0; x < W; x++) {
    tryAdd(x);               // top row
    tryAdd((H - 1) * W + x); // bottom row
  }
  for (let y = 1; y < H - 1; y++) {
    tryAdd(y * W);           // left col
    tryAdd(y * W + W - 1);   // right col
  }

  // BFS expansion
  while (head < queue.length) {
    const idx = queue[head++];
    const pi = idx * C;
    const r = pixels[pi], g = pixels[pi + 1], b = pixels[pi + 2];

    if (colorDist(r, g, b) > tolerance) continue; // Not background

    // Make fully transparent
    pixels[pi + 3] = 0;

    // Check 4 neighbors
    const y = Math.floor(idx / W);
    const x = idx % W;
    if (x > 0)     tryAdd(idx - 1);
    if (x < W - 1) tryAdd(idx + 1);
    if (y > 0)     tryAdd(idx - W);
    if (y < H - 1) tryAdd(idx + W);
  }

  // Build PNG from modified pixels
  const processed = await sharp(pixels, { raw: { width: W, height: H, channels: C } })
    .png()
    .toBuffer();

  // Trim transparent edges
  let trimmed;
  try {
    trimmed = await sharp(processed)
      .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 2 })
      .png()
      .toBuffer();
  } catch {
    trimmed = processed;
  }
  return trimmed;
}

/**
 * Process one character: load JPG → remove bg → trim → resize to 800px height → save
 */
async function processChar(srcPath, destPaths, label, tolerance = 18) {
  if (!existsSync(srcPath)) {
    console.log(`  ⏭️  Skipped (not found): ${label}`);
    return;
  }

  const noBg = await removeBackgroundFloodFill(
    await sharp(srcPath).png().toBuffer(),
    tolerance
  );

  // Resize: scale to 800px height, maintain ratio
  const tm = await sharp(noBg).metadata();
  const tw = Math.round(tm.width * (800 / tm.height));

  const resized = await sharp(noBg)
    .resize(tw, 800, {
      kernel: sharp.kernel.lanczos3,
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toBuffer();

  const rm = await sharp(resized).metadata();

  for (const dest of destPaths) {
    await sharp(resized).toFile(dest);
  }
  console.log(
    `  ✅ ${label}: ${rm.width}×${rm.height}px → ${destPaths.map((d) => d.split("/").pop()).join(", ")}`
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🔧 Fixing character transparency (flood-fill, tol=18)...\n");

  // AI-generated characters (from brain JPG files)
  await processChar(
    join(BRAIN, "aisyah_npc_sprite_1794277107540.jpg"),
    [join(GAME, "npc-2.png"), join(GAME, "aisyah_transparent.png")],
    "Aisyah (Mentor)", 18
  );

  await processChar(
    join(BRAIN, "ustadz_rayhan_sprite_1794198394536.jpg"),
    [join(GAME, "npc-1.png"), join(GAME, "rayhan_transparent.png")],
    "Rayhan (Ustadz)", 18
  );

  await processChar(
    join(BRAIN, "ahmad_student_sprite_1794277202415.jpg"),
    [join(GAME, "student-1.png"), join(GAME, "student_transparent.png")],
    "Ahmad (Male Student)", 18
  );

  await processChar(
    join(BRAIN, "siti_rahma_student_sprite_v2_1794277192946.jpg"),
    [join(GAME, "student-2.png"), join(GAME, "student2_transparent.png")],
    "Siti Rahma (Female Student)", 18
  );

  await processChar(
    join(BRAIN, "bu_halimah_npc6_1794277181735.jpg"),
    [join(GAME, "npc-6.png")],
    "Bu Halimah (UMKM)", 18
  );

  await processChar(
    join(BRAIN, "npc_6_alt_1794277190812.jpg"),
    [join(GAME, "npc-6-alt.png")],
    "Mas Dimas (Investor)", 18
  );

  // NPC from sheet (npc-3, npc-4, npc-5) — reprocess from sheet with tight tol
  console.log("\n🗒️  Reprocessing sheet-based NPCs...");
  const BUNDLE = join(
    ROOT, "public", "game",
    "Syariah-Quest-Visual-Novel-Bundle", "assets",
    "Syariah-Quest-Assets-Individual"
  );
  const npcSheet = join(BUNDLE, "02_Karakter", "NPC", "lembar_referensi_enam_NPC.png");
  const npcMeta = await sharp(npcSheet).metadata();
  const nW = npcMeta.width, nH = npcMeta.height;
  const padTop = Math.round(nH * 0.10);
  const padBot = Math.round(nH * 0.17);
  const slotH  = nH - padTop - padBot;
  const slotW  = Math.floor(nW / 6);

  const npcSlots = [
    { slot: 0, file: "npc-5.png", label: "Pak Hasan (Pedagang)" },
    { slot: 2, file: "npc-3.png", label: "NPC Mahasiswa" },
    { slot: 3, file: "npc-4.png", label: "Nasabah Bank" },
  ];

  for (const { slot, file, label } of npcSlots) {
    const cropped = await sharp(npcSheet)
      .extract({ left: slot * slotW + 2, top: padTop, width: slotW - 4, height: slotH })
      .png()
      .toBuffer();

    const noBg = await removeBackgroundFloodFill(cropped, 22);
    const tm = await sharp(noBg).metadata();
    const tw = Math.round(tm.width * (800 / tm.height));
    const resized = await sharp(noBg)
      .resize(tw, 800, { kernel: sharp.kernel.lanczos3, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    const rm = await sharp(resized).metadata();
    await sharp(resized).toFile(join(GAME, file));
    console.log(`  ✅ ${label}: ${rm.width}×${rm.height}px → ${file}`);
  }

  // ── Verification ─────────────────────────────────────────────────────────────
  console.log("\n📊 Verification (transparency % = area outside character):");
  const allFiles = [
    "npc-1.png", "npc-2.png", "npc-3.png", "npc-4.png",
    "npc-5.png", "npc-6.png", "npc-6-alt.png",
    "student-1.png", "student-2.png",
  ];

  for (const f of allFiles) {
    const p = join(GAME, f);
    if (!existsSync(p)) { console.log(`  ⚠️  MISSING: ${f}`); continue; }
    const { data, info } = await sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const px = new Uint8Array(data);
    let transPx = 0;
    for (let i = 3; i < px.length; i += info.channels) if (px[i] < 10) transPx++;
    const pct = Math.round(transPx / (info.width * info.height) * 100);
    const m = await sharp(p).metadata();
    const ok = pct > 10 && pct < 90 ? "✅" : "⚠️ ";
    console.log(`  ${ok} ${f}: ${m.width}×${m.height} | ${pct}% transparent`);
  }
}

main().catch((err) => { console.error("❌", err); process.exit(1); });

