
const ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

type Opsi = {
  system?: string;
  temperature?: number;
};

const TIMEOUT_MS = 20000;
const jeda = [1500, 4000];

const tunggu = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

function ambilDetailError(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const cause = (error as Error & {
    cause?: {
      code?: string;
      message?: string;
    };
  }).cause;

  if (cause?.code || cause?.message) {
    return `${error.message} (${cause.code ?? ""} ${cause.message ?? ""})`;
  }

  return error.message;
}

export async function panggilGemini(
  prompt: string,
  opsi: Opsi = {},
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY belum diisi di .env.local");
  }

  const modelUtama =
    process.env.GEMINI_MODEL || "gemini-flash-latest";

  const modelCadangan = process.env.GEMINI_FALLBACK_MODEL;

  const daftarModel = modelCadangan
    ? [modelUtama, modelCadangan]
    : [modelUtama];

  const messages = [
    ...(opsi.system
      ? [{ role: "system", content: opsi.system }]
      : []),
    {
      role: "user",
      content: prompt,
    },
  ];

  let errorTerakhir = "Tidak diketahui";

  for (const model of daftarModel) {
    for (let percobaan = 0; percobaan <= jeda.length; percobaan++) {
      const controller = new AbortController();

      const timeout = setTimeout(() => {
        controller.abort();
      }, TIMEOUT_MS);

      try {
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
          signal: controller.signal,
        });

        const responseText = await res.text();

        if (!res.ok) {
          errorTerakhir = `${res.status}: ${responseText.slice(0, 1500)}`;

          const bisaDiulang =
            res.status === 429 ||
            res.status === 500 ||
            res.status === 502 ||
            res.status === 503 ||
            res.status === 504;

          console.warn(
            `[gemini] ${model} gagal pada percobaan ${percobaan + 1}: ${res.status}`,
          );

          if (!bisaDiulang) {
            break;
          }
        } else {
          let data: {
            choices?: {
              message?: {
                content?: string;
              };
            }[];
            error?: {
              message?: string;
            };
          };

          try {
            data = JSON.parse(responseText);
          } catch {
            errorTerakhir = "Respons Gemini bukan JSON yang valid";
            console.warn(`[gemini] ${model}: respons JSON tidak valid`);
            data = {};
          }

          const hasil = data.choices?.[0]?.message?.content;

          if (typeof hasil === "string" && hasil.trim()) {
            return hasil.trim();
          }

          if (data.error?.message) {
            errorTerakhir = data.error.message;
          } else if (errorTerakhir === "Tidak diketahui") {
            errorTerakhir = "Respons Gemini kosong";
          }

          console.warn(`[gemini] ${model}: respons tidak memiliki konten`);
        }
      } catch (error) {
        errorTerakhir = error instanceof Error && error.name === "AbortError"
          ? `Timeout: Gemini tidak merespons dalam ${TIMEOUT_MS / 1000} detik`
          : ambilDetailError(error);

        console.warn(
          `[gemini] ${model} gagal pada percobaan ${percobaan + 1}: ${errorTerakhir}`,
        );
      } finally {
        clearTimeout(timeout);
      }

      if (percobaan < jeda.length) {
        await tunggu(jeda[percobaan]);
      }
    }

    console.warn(`[gemini] Model ${model} tidak berhasil: ${errorTerakhir}`);
  }

  throw new Error(`Gemini gagal: ${errorTerakhir}`);
}
