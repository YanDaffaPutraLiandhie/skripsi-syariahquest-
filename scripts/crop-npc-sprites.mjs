/**
 * crop-npc-sprites.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Crops individual NPC character sprites from the reference sheet images,
 * removes the near-white background using flood fill or global keying,
 * trims empty space, and saves transparent PNGs.
 *
 * Run from project root:
 *   node scripts/crop-npc-sprites.mjs
 */

import sharp from "sharp";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const GAME = join(ROOT, "public", "game");
const BUNDLE = join(GAME, "Syariah-Quest-Visual-Novel-Bundle", "assets",
  "Syariah-Quest-Assets-Individual");

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Sample the background color of a full sheet from its corners.
 * Returns [r, g, b] averaged from the 4 corner 3×3 blocks.
 */
async function sampleSheetBackground(sheetPath) {
  const { data, info } = await sharp(sheetPath)
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const px = new Uint8Array(data);

  function avgBlock(cx, cy) {
    let r = 0, g = 0, b = 0, n = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x2 = Math.min(W - 1, Math.max(0, cx + dx));
        const y2 = Math.min(H - 1, Math.max(0, cy + dy));
        const i = (y2 * W + x2) * C;
        r += px[i]; g += px[i + 1]; b += px[i + 2]; n++;
      }
    }
    return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
  }

  const cs = [avgBlock(0, 0), avgBlock(W-1, 0), avgBlock(0, H-1), avgBlock(W-1, H-1)];
  return [
    Math.round(cs.reduce((s, c) => s + c[0], 0) / 4),
    Math.round(cs.reduce((s, c) => s + c[1], 0) / 4),
    Math.round(cs.reduce((s, c) => s + c[2], 0) / 4),
  ];
}

/**
 * Remove background from a cropped image buffer using global color keying.
 * Uses a known background color (sampled from the source sheet, not the crop).
 *
 * @param {Buffer} cropBuffer - PNG buffer of the cropped character
 * @param {number[]} bgColor  - [r, g, b] background color to remove
 * @param {number} tolerance  - Color distance tolerance (default 28)
 * @returns {Promise<Buffer>} - Transparent PNG buffer, trimmed tight to character
 */
async function removeBg(cropBuffer, bgColor, tolerance = 28) {
  const [bgR, bgG, bgB] = bgColor;

  const { data, info } = await sharp(cropBuffer)
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const pixels = Buffer.from(data);

  for (let i = 0; i < pixels.length; i += C) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
    if (dist <= tolerance) {
      pixels[i + 3] = 0; // fully transparent
    } else if (dist < tolerance + 12) {
      // Soft anti-aliasing edge
      pixels[i + 3] = Math.round(pixels[i + 3] * (dist - tolerance) / 12);
    }
  }

  // Build PNG and trim transparent edges
  const processed = await sharp(pixels, { raw: { width: W, height: H, channels: C } })
    .png().toBuffer();

  let trimmed;
  try {
    trimmed = await sharp(processed)
      .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 2 })
      .png().toBuffer();
  } catch {
    trimmed = processed;
  }
  return trimmed;
}

/**
 * Crop a region from a source sheet, remove its background, trim, and save.
 *
 * @param {string} srcPath    - Source sheet path
 * @param {string} destPath   - Output PNG file path
 * @param {{ x,y,w,h }} region - Crop region in pixels
 * @param {string} label      - Display label for logging
 * @param {number[]} bgColor  - [r,g,b] background color sampled from the source sheet
 * @param {number} [tol=28]   - Color distance tolerance
 */
async function cropAndSave(srcPath, destPath, region, label, bgColor, tol = 28) {
  const cropped = await sharp(srcPath)
    .extract({ left: region.x, top: region.y, width: region.w, height: region.h })
    .png().toBuffer();

  const result = await removeBg(cropped, bgColor, tol);
  const meta = await sharp(result).metadata();
  await sharp(result).toFile(destPath);
  const relPath = destPath.replace(ROOT + "\\", "").replace(ROOT + "/", "");
  console.log(`  ✅ ${label} → ${relPath} [${meta.width}×${meta.height}px]`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🎨 Extracting sprites with transparent backgrounds...\n");

  // ── 1. SIX NPC CHARACTERS — lembar_referensi_enam_NPC.png (530×275) ──────
  const npcSheet = join(BUNDLE, "02_Karakter", "NPC", "lembar_referensi_enam_NPC.png");
  const npcMeta  = await sharp(npcSheet).metadata();
  const nW = npcMeta.width;   // 530
  const nH = npcMeta.height;  // 275

  console.log(`📄 NPC sheet: ${nW}×${nH}px`);
  const npcBg = await sampleSheetBackground(npcSheet);
  console.log(`   Background color: rgb(${npcBg.join(",")})`);

  const npcPadTop = Math.round(nH * 0.10);
  const npcPadBot = Math.round(nH * 0.17);
  const npcH      = nH - npcPadTop - npcPadBot;
  const npcSlotW  = Math.floor(nW / 6);

  const npcDefs = [
    { name: "npc-5.png",     slot: 0, label: "Pedagang Pasar"     },
    { name: "npc-6.png",     slot: 1, label: "Pemilik Usaha"      },
    { name: "npc-3.png",     slot: 2, label: "Mahasiswa (NPC)"    },
    { name: "npc-4.png",     slot: 3, label: "Nasabah Bank"       },
    { name: "npc-6-alt.png", slot: 4, label: "Calon Investor"     },
    { name: "npc-6b.png",    slot: 5, label: "Pengelola Koperasi" },
  ];

  console.log("🎭 Cropping 6 NPC characters...");
  for (const def of npcDefs) {
    const innerPad = 2;
    const region = {
      x: def.slot * npcSlotW + innerPad,
      y: npcPadTop,
      w: npcSlotW - innerPad * 2,
      h: npcH,
    };
    await cropAndSave(npcSheet, join(GAME, def.name), region, def.label, npcBg, 32);
  }

  // ── 2. TEACHER / MENTOR — lembar_referensi_pengajar.png (306×400) ──────────
  const teachSheet = join(BUNDLE, "02_Karakter", "Pengajar", "lembar_referensi_pengajar.png");
  const teachMeta  = await sharp(teachSheet).metadata();
  const tW = teachMeta.width;   // 306
  const tH = teachMeta.height;  // 400

  console.log(`\n📄 Teacher sheet: ${tW}×${tH}px`);
  const teachBg = await sampleSheetBackground(teachSheet);
  console.log(`   Background color: rgb(${teachBg.join(",")})`);

  const teachPadTop  = Math.round(tH * 0.10);
  const teachBodyEnd = Math.round(tH * 0.56);
  const teachH       = teachBodyEnd - teachPadTop;
  const teachSlotW   = Math.floor(tW / 2);

  const teachDefs = [
    { name: "npc-1.png", slot: 0, label: "Pak Arif / Rayhan (Male Teacher)"  },
    { name: "npc-2.png", slot: 1, label: "Bu Sari / Aisyah (Female Teacher)" },
  ];

  console.log("👨‍🏫 Cropping 2 teacher characters...");
  for (const def of teachDefs) {
    const region = {
      x: def.slot * teachSlotW,
      y: teachPadTop,
      w: teachSlotW,
      h: teachH,
    };
    await cropAndSave(teachSheet, join(GAME, def.name), region, def.label, teachBg, 32);
  }

  const npc1buf = await sharp(join(GAME, "npc-1.png")).png().toBuffer();
  await sharp(npc1buf).toFile(join(GAME, "rayhan_transparent.png"));
  console.log("  ✅ Alias: rayhan_transparent.png");

  const npc2buf = await sharp(join(GAME, "npc-2.png")).png().toBuffer();
  await sharp(npc2buf).toFile(join(GAME, "aisyah_transparent.png"));
  console.log("  ✅ Alias: aisyah_transparent.png");

  // ── 3. STUDENT — lembar_referensi_mahasiswa.png (190×400) ───────────────────
  const stuSheet = join(BUNDLE, "02_Karakter", "Mahasiswa", "lembar_referensi_mahasiswa.png");
  const stuMeta  = await sharp(stuSheet).metadata();
  const sW = stuMeta.width;   // 190
  const sH = stuMeta.height;  // 400

  console.log(`\n📄 Student sheet: ${sW}×${sH}px`);
  const stuBg = await sampleSheetBackground(stuSheet);
  console.log(`   Background color: rgb(${stuBg.join(",")})`);

  const stuPadTop = Math.round(sH * 0.08);
  const stuH      = sH - stuPadTop;
  const stuSlotW  = Math.floor(sW / 2);

  const stuDefs = [
    { name: "student-1.png", slot: 0, label: "Male Student"   },
    { name: "student-2.png", slot: 1, label: "Female Student" },
  ];

  console.log("🎓 Cropping 2 student characters...");
  for (const def of stuDefs) {
    const region = {
      x: def.slot * stuSlotW,
      y: stuPadTop,
      w: stuSlotW,
      h: stuH,
    };
    await cropAndSave(stuSheet, join(GAME, def.name), region, def.label, stuBg, 28);
  }

  const stu1buf = await sharp(join(GAME, "student-1.png")).png().toBuffer();
  await sharp(stu1buf).toFile(join(GAME, "student_transparent.png"));
  console.log("  ✅ Alias: student_transparent.png");

  const stu2buf = await sharp(join(GAME, "student-2.png")).png().toBuffer();
  await sharp(stu2buf).toFile(join(GAME, "student2_transparent.png"));
  console.log("  ✅ Alias: student2_transparent.png");

  console.log("\n✨ Done!\n");

  // ── Verification Report ──────────────────────────────────────────────────────
  console.log("📊 Verification:");
  const allFiles = [
    "npc-1.png","npc-2.png","npc-3.png","npc-4.png","npc-5.png","npc-6.png",
    "npc-6-alt.png","npc-6b.png","student-1.png","student-2.png"
  ];
  for (const f of allFiles) {
    const meta = await sharp(join(GAME, f)).metadata();
    const { data, info } = await sharp(join(GAME, f)).ensureAlpha().raw()
      .toBuffer({ resolveWithObject: true });
    const px = new Uint8Array(data);
    const cornerAlpha = px[3];
    let transPx = 0;
    for (let i = 3; i < px.length; i += 4) if (px[i] < 10) transPx++;
    const transPct = Math.round(transPx / (info.width * info.height) * 100);
    const ok = cornerAlpha === 0 ? "✅" : "⚠️ ";
    console.log(`  ${ok} ${f}: ${meta.width}×${meta.height} | corner:${cornerAlpha} | ${transPct}% transparent`);
  }
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
