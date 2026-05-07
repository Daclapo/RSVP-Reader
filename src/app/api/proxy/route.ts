import { NextRequest, NextResponse } from "next/server";
import { cleanImportedText } from "@/lib/reader/text-cleanup";
import type { ProxyStructuredResponse } from "@/lib/reader/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const REQUEST_TIMEOUT_MS = 20_000;
const TEXT_CONTENT_TYPES = [
  "text/plain",
  "text/markdown",
  "application/octet-stream",
];

const userAgent =
  "RSVP-Reader/1.0 (+https://github.com/Daclapo/RSVP-Reader; local-first reading app)";

const normalizeText = (input: string) => {
  const lines = input
    .replace(/\u00a0/g, " ")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim());

  const compacted: string[] = [];
  lines.forEach((line) => {
    if (line.length === 0 && compacted[compacted.length - 1] === "") return;
    compacted.push(line);
  });

  return cleanImportedText(compacted.join("\n"));
};

const jsonError = (error: string, status = 500, detail?: string) =>
  NextResponse.json({ error, detail }, { status });

const fetchWithTimeout = async (url: string) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": userAgent,
        Accept: "text/html, text/plain, application/xhtml+xml, application/xml;q=0.9, */*;q=0.8",
        "Accept-Language": "en,es;q=0.9",
      },
    });
  } finally {
    clearTimeout(timeout);
  }
};

const titleFromUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    const lastSegment = parsed.pathname.split("/").filter(Boolean).at(-1);
    return lastSegment ? decodeURIComponent(lastSegment).replace(/\.(txt|utf-8|html?|md)$/gi, "").replace(/[-_]+/g, " ") : parsed.hostname;
  } catch {
    return null;
  }
};

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  const format = req.nextUrl.searchParams.get("format");

  if (!url) {
    return jsonError("URL is required", 400);
  }

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return jsonError("Only http and https URLs are supported", 400);
    }

    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      return jsonError(`Failed to fetch: ${response.statusText || response.status}`, response.status);
    }

    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    const body = await response.text();

    if (TEXT_CONTENT_TYPES.some((type) => contentType.includes(type)) || /\.txt(?:\.utf-8)?($|[?#])/i.test(parsedUrl.href)) {
      const text = normalizeText(body);
      if (!text || text.match(/\S+/g)?.length === 0) {
        return jsonError("No readable text was found in this source.", 422);
      }

      if (format === "structured") {
        const payload: ProxyStructuredResponse = {
          text,
          sourceTitle: titleFromUrl(url),
          headings: [],
          canonicalUrl: url,
        };
        return NextResponse.json(payload);
      }

      return new NextResponse(text, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }

    const [{ JSDOM }, { Readability }] = await Promise.all([
      import("jsdom"),
      import("@mozilla/readability"),
    ]);
    const dom = new JSDOM(body, { url });
    const document = dom.window.document;

    document.querySelectorAll("script, style, noscript, svg, canvas, picture, iframe, nav, footer, form, aside").forEach((element) => element.remove());
    document.querySelectorAll("img").forEach((element) => element.remove());

    const reader = new Readability(document.cloneNode(true) as Document);
    const article = reader.parse();

    const mainContentElement =
      article?.textContent ? null :
      document.querySelector("article") ||
      document.querySelector("main") ||
      document.querySelector("[role='main']") ||
      document.querySelector("#content") ||
      document.querySelector(".main-content") ||
      document.body;

    const text = normalizeText(article?.textContent ?? mainContentElement?.textContent ?? "");
    if (!text || text.match(/\S+/g)?.length === 0) {
      return jsonError(
        "No readable article text was found. The page may block extraction, render content with scripts, or contain mostly media. Try pasting the text manually.",
        422
      );
    }

    if (format === "structured") {
      const title =
        article?.title?.trim() ||
        document.querySelector("h1")?.textContent?.trim() ||
        document.querySelector("title")?.textContent?.trim() ||
        null;

      const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4"))
        .map((heading) => {
          const textValue = heading.textContent?.replace(/\s+/g, " ").trim() ?? "";
          if (!textValue) return null;
          const tagLevel = Number(heading.tagName.replace("H", ""));
          const anchor = heading.getAttribute("id") ?? "";
          return {
            level: Number.isNaN(tagLevel) ? 2 : tagLevel,
            text: textValue,
            anchor,
          };
        })
        .filter((heading): heading is NonNullable<typeof heading> => heading !== null);

      const canonicalUrl =
        document.querySelector("link[rel='canonical']")?.getAttribute("href") || url;

      const payload: ProxyStructuredResponse = {
        text,
        sourceTitle: title,
        headings,
        canonicalUrl,
      };

      return NextResponse.json(payload);
    }

    return new NextResponse(text, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Proxy fetching error:", error);
    const isAbort = error instanceof Error && error.name === "AbortError";
    return jsonError(
      isAbort
        ? "The source took too long to respond. Try again, use Wikipedia/Library if available, or paste the text manually."
        : "Could not import this source from the server. The site may block automated extraction.",
      isAbort ? 504 : 500,
      error instanceof Error ? error.message : undefined
    );
  }
}
