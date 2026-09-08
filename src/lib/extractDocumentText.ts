export async function extractDocumentText(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/extract-document", {
    method: "POST",
    body: formData,
  });
  const result = (await response.json()) as { text?: string; error?: string };

  if (!response.ok || !result.text) {
    throw new Error(result.error || "Isi file tidak dapat dibaca.");
  }

  return result.text;
}
