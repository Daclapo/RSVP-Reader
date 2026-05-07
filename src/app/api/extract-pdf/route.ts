import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const ensurePromiseWithResolvers = () => {
  if ("withResolvers" in Promise) return;
  Object.defineProperty(Promise, "withResolvers", {
    configurable: true,
    writable: true,
    value: <T>() => {
      let resolve!: (value: T | PromiseLike<T>) => void;
      let reject!: (reason?: unknown) => void;
      const promise = new Promise<T>((promiseResolve, promiseReject) => {
        resolve = promiseResolve;
        reject = promiseReject;
      });
      return { promise, resolve, reject };
    },
  });
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "PDF file is required." }, { status: 400 });
    }

    ensurePromiseWithResolvers();
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const data = await file.arrayBuffer();
    const documentInit = {
      data: new Uint8Array(data.slice(0)),
      disableWorker: true,
      useWorkerFetch: false,
      isEvalSupported: false,
    } as unknown as Parameters<typeof pdfjsLib.getDocument>[0];
    const loadingTask = pdfjsLib.getDocument(documentInit);
    const pdf = await loadingTask.promise;

    const chunks: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      if (pageText) chunks.push(pageText);
    }

    const text = chunks.join("\n\n").trim();
    if (!text) {
      return NextResponse.json(
        { error: "No selectable text could be extracted from this PDF. It may be scanned or image-only." },
        { status: 422 }
      );
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error("PDF extraction failed:", error);
    return NextResponse.json(
      { error: "PDF extraction failed. Try converting the file to .txt, .docx, or an OCR text PDF." },
      { status: 500 }
    );
  }
}
