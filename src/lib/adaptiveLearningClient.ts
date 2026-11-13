import { supabase } from "@/lib/supabase";
import type { AdaptiveLearningPlan } from "@/lib/adaptiveLearning";

export type AdaptiveResponse = {
  id_soal: number;
  id_jawaban: number | null;
};

async function getAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Sesi login berakhir.");
  return session.access_token;
}

async function readJson(response: Response) {
  const body: unknown = await response.json();
  if (!body || typeof body !== "object") {
    throw new Error("Respons personalisasi tidak valid.");
  }
  return body as Record<string, unknown>;
}

export async function fetchAdaptiveLearningPlan(
  idModul: number,
): Promise<AdaptiveLearningPlan> {
  const accessToken = await getAccessToken();
  const response = await fetch(`/api/adaptive-learning?idModul=${idModul}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = await readJson(response);
  if (!response.ok || !body.plan) {
    throw new Error(
      typeof body.error === "string"
        ? body.error
        : "Gagal memuat rencana belajar adaptif.",
    );
  }
  return body.plan as AdaptiveLearningPlan;
}

export async function recordAdaptiveResponses(
  idModul: number,
  submissionKey: string,
  responses: AdaptiveResponse[],
): Promise<{ plan: AdaptiveLearningPlan; unmapped: number }> {
  const accessToken = await getAccessToken();
  const response = await fetch("/api/adaptive-learning", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ idModul, submissionKey, responses }),
  });
  const body = await readJson(response);
  if (!response.ok || !body.plan) {
    throw new Error(
      typeof body.error === "string"
        ? body.error
        : "Gagal menyimpan progres penguasaan.",
    );
  }

  return {
    plan: body.plan as AdaptiveLearningPlan,
    unmapped: Number(body.unmapped ?? 0),
  };
}
