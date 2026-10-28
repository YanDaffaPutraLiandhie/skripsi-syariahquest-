const ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

type Opsi = { system?: string; temperature?: number };

const tunggu = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Memanggil Gemini dan mengembalikan teks balasan.
 * Mengulang otomatis kalau server sibuk (503) atau kena batas laju (429).
 * Opsional: set GEMINI_FALLBACK_MODEL di .env.local untuk model cadangan.
 */
export async function panggilGemini(
  prompt: string,
  opsi: Opsi = {},
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY belum diisi di .env.local");

  const modelUtama = process.env.GEMINI_MODEL || "gemini-flash-latest";
  const modelCadangan = process.env.GEMINI_FALLBACK_MODEL;
  const daftarModel = modelCadangan ? [modelUtama, modelCadangan] : [modelUtama];
  const jeda = [1500, 4000]; // percobaan ke-2 dan ke-3

  const messages = [
    ...(opsi.system ? [{ role: "system", content: opsi.system }] : []),
    { role: "user", content: prompt },
  ];

  let errorTerakhir = "";

  for (const model of daftarModel) {
    for (let percobaan = 0; percobaan <= jeda.length; percobaan++) {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: opsi.temperature ?? 0.3,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text: string = data.choices?.[0]?.message?.content ?? "";
        if (text) return text;
        errorTerakhir = "Respons kosong";
      } else {
        errorTerakhir = `${res.status}: ${await res.text()}`;
        const bisaDiulang = res.status === 503 || res.status === 429;
        console.warn(
          `[gemini] ${model} gagal (percobaan ${percobaan + 1}): ${res.status}`,
        );
        if (!bisaDiulang) break; // 400/401/403/404: tidak ada gunanya diulang
      }

      if (percobaan < jeda.length) await tunggu(jeda[percobaan]);
    }
  }

  throw new Error(`Gemini gagal: ${errorTerakhir}`);
}