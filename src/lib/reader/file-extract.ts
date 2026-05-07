"use client";

import JSZip from "jszip";
import mammoth from "mammoth";

export type ExtractedFileDocument = {
  fileName: string;
  sizeBytes: number;
  mimeType: string;
  extension: string;
  text: string;
  warning?: string;
};

const EXTENSIONS = [
  ".txt",
  ".md",
  ".markdown",
  ".html",
  ".htm",
  ".pdf",
  ".doc",
  ".docx",
  ".odt",
  ".epub",
] as const;

const getExtension = (name: string) => {
  const lowered = name.toLowerCase();
  return EXTENSIONS.find((extension) => lowered.endsWith(extension)) ?? "";
};

const formatBytes = (value: number) => {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const readText = (file: File) => file.text();
const readArrayBuffer = (file: File) => file.arrayBuffer();

const stripMarkup = (markup: string) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(markup, "text/html");
  return (doc.body?.textContent ?? "").replace(/\s+/g, " ").trim();
};

const extractPdf = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/extract-pdf", {
    method: "POST",
    body: formData,
  });
  const rawPayload = await response.text();
  let payload: { text?: string; error?: string };
  try {
    payload = rawPayload ? JSON.parse(rawPayload) as { text?: string; error?: string } : {};
  } catch {
    payload = { error: `PDF extraction returned ${response.status}: ${rawPayload.slice(0, 140)}` };
  }

  if (!response.ok || !payload.text) {
    throw new Error(payload.error ?? "PDF extraction failed.");
  }

  return payload.text;
};

const extractDocx = async (file: File) => {
  const buffer = await readArrayBuffer(file);
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value.replace(/\s+\n/g, "\n").trim();
};

const extractFromZipEntry = async (zip: JSZip, path: string) => {
  const entry = zip.file(path);
  if (!entry) return "";
  const xml = await entry.async("string");
  return stripMarkup(xml);
};

const extractOdt = async (file: File) => {
  const buffer = await readArrayBuffer(file);
  const zip = await JSZip.loadAsync(buffer);
  return extractFromZipEntry(zip, "content.xml");
};

const extractEpub = async (file: File) => {
  const buffer = await readArrayBuffer(file);
  const zip = await JSZip.loadAsync(buffer);

  const containerXml = await extractFromZipEntry(zip, "META-INF/container.xml");
  const fullPathMatch = containerXml.match(/full-path\s*=\s*"([^"]+)"/i);
  const opfPath = fullPathMatch?.[1] ?? "OEBPS/content.opf";

  const opfRaw = await zip.file(opfPath)?.async("string");
  if (!opfRaw) return "";

  const hrefMatches = Array.from(opfRaw.matchAll(/href\s*=\s*"([^"]+\.(xhtml|html|htm))"/gi));
  const baseDir = opfPath.includes("/") ? opfPath.slice(0, opfPath.lastIndexOf("/") + 1) : "";

  const chunks: string[] = [];
  for (const match of hrefMatches) {
    const relativePath = match[1];
    const normalizedPath = relativePath.startsWith("/") ? relativePath.slice(1) : `${baseDir}${relativePath}`;
    const content = await zip.file(normalizedPath)?.async("string");
    if (!content) continue;
    const cleaned = stripMarkup(content);
    if (cleaned) chunks.push(cleaned);
  }

  return chunks.join("\n\n");
};

const extractDoc = async (file: File) => {
  const raw = await readText(file);
  const cleaned = raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "").trim();
  if (cleaned.length > 60) {
    return {
      text: cleaned,
      warning: "Legacy .doc extraction is best-effort and may lose formatting.",
    };
  }

  return {
    text: "",
    warning:
      "Legacy .doc binary parsing is not fully supported. Please convert to .docx, .pdf, .odt, or .txt for best results.",
  };
};

export const supportedUploadMessage =
  "Supported: txt, md, html, pdf, doc, docx, odt (LibreOffice), epub.";

export const formatFileSize = formatBytes;

export async function extractFileDocument(file: File): Promise<ExtractedFileDocument> {
  const extension = getExtension(file.name);
  const mimeType = file.type || "application/octet-stream";

  let text = "";
  let warning: string | undefined;

  if ([".txt", ".md", ".markdown"].includes(extension)) {
    text = (await readText(file)).trim();
  } else if ([".html", ".htm"].includes(extension)) {
    text = stripMarkup(await readText(file));
  } else if (extension === ".pdf") {
    text = await extractPdf(file);
  } else if (extension === ".docx") {
    text = await extractDocx(file);
  } else if (extension === ".odt") {
    text = await extractOdt(file);
  } else if (extension === ".epub") {
    text = await extractEpub(file);
  } else if (extension === ".doc") {
    const result = await extractDoc(file);
    text = result.text;
    warning = result.warning;
  } else {
    warning = "Unsupported file type for text extraction.";
  }

  if (!text && !warning) {
    warning = "No text could be extracted from this file.";
  }

  return {
    fileName: file.name,
    sizeBytes: file.size,
    mimeType,
    extension,
    text: text.trim(),
    warning,
  };
}
