import { NextResponse } from "next/server";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 15 * 1024 * 1024;

function cleanText(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File materi tidak ditemukan." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Ukuran file maksimal 15 MB." }, { status: 413 });
    }

    const extension = file.name.split(".").pop()?.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());
    let text = "";

    if (extension === "pdf" || file.type === "application/pdf") {
      const parser = new PDFParse({ data: buffer });
      try {
        const result = await parser.getText();
        text = result.text;
      } finally {
        await parser.destroy();
      }
    } else if (extension === "docx" || file.type.includes("wordprocessingml")) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else {
      return NextResponse.json(
        { error: "Format yang dapat dibaca otomatis hanya PDF dan DOCX. File asli tetap dapat diunduh." },
        { status: 415 },
      );
    }

    const cleanedText = cleanText(text);
    if (!cleanedText) {
      return NextResponse.json(
        { error: "Teks tidak ditemukan. File mungkin berupa hasil scan/gambar." },
        { status: 422 },
      );
    }

    return NextResponse.json({ text: cleanedText });
  } catch (error) {
    console.error("Gagal mengekstrak materi:", error);
    return NextResponse.json({ error: "File tidak dapat dibaca." }, { status: 500 });
  }
}
