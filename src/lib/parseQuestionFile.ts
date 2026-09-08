import Papa from "papaparse";
import * as XLSX from "xlsx";

export type ImportedQuestionRow = Record<string, string>;

function normalizeHeader(header: string) {
  return header.replace(/^\uFEFF/, "").trim().toLowerCase();
}

function normalizeRow(row: Record<string, unknown>): ImportedQuestionRow {
  return Object.entries(row).reduce<ImportedQuestionRow>(
    (normalized, [key, value]) => {
      normalized[normalizeHeader(key)] = String(value ?? "").trim();
      return normalized;
    },
    {},
  );
}

export async function parseQuestionFile(
  file: File,
): Promise<ImportedQuestionRow[]> {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "xlsx" || extension === "xls") {
    const workbook = XLSX.read(await file.arrayBuffer(), {
      type: "array",
    });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      return [];
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      defval: "",
    });

    return rows.map(normalizeRow);
  }

  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: normalizeHeader,
      complete: (results) => resolve(results.data.map(normalizeRow)),
      error: reject,
    });
  });
}
