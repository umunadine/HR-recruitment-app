import mammoth from "mammoth";

export async function extractTextFromFile(
  buffer: Buffer,
  fileName: string
): Promise<string> {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";

  if (ext === "pdf") {
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    return data.text ?? "";
  }

  if (ext === "docx" || ext === "doc") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value ?? "";
  }

  if (ext === "txt") {
    return buffer.toString("utf-8");
  }

  throw new Error(
    `Unsupported file type: .${ext}. Please upload PDF, DOCX, or TXT files.`
  );
}
