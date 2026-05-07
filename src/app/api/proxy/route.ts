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

const decodeHtmlEntities = (value: string) => {
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: "\"",
    apos: "'",
    nbsp: " ",
    ndash: "-",
    mdash: "-",
    rsquo: "'",
    lsquo: "'",
    rdquo: "\"",
    ldquo: "\"",
  };

  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    const lowered = entity.toLowerCase();
    if (lowered.startsWith("#x")) {
      const code = Number.parseInt(lowered.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    if (lowered.startsWith("#")) {
      const code = Number.parseInt(lowered.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return named[lowered] ?? match;
  });
};

const stripHtmlToStructuredText = (html: string, sourceUrl: string) => {
  const title = decodeHtmlEntities(
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() ??
      titleFromUrl(sourceUrl) ??
      sourceUrl
  );
  const canonicalUrl =
    html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i)?.[1] ??
    html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["'][^>]*>/i)?.[1] ??
    sourceUrl;

  const headings = Array.from(html.matchAll(/<h([1-4])[^>]*>([\s\S]*?)<\/h\1>/gi))
    .map((match) => ({
      level: Number(match[1]),
      text: decodeHtmlEntities(match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()),
      anchor: "",
    }))
    .filter((heading) => heading.text.length > 0);

  const readable = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<canvas[\s\S]*?<\/canvas>/gi, " ")
    .replace(/<(nav|footer|form|aside|header)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(h[1-4])[^>]*>([\s\S]*?)<\/\1>/gi, "\n\n## $2\n\n")
    .replace(/<(p|div|section|article|main|li|blockquote|tr)[^>]*>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|section|article|main|li|blockquote|tr|h[1-4])>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  return {
    title,
    canonicalUrl,
    headings,
    text: normalizeText(decodeHtmlEntities(readable)),
  };
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

    const extracted = stripHtmlToStructuredText(body, url);
    if (!extracted.text || extracted.text.match(/\S+/g)?.length === 0) {
      return jsonError(
        "No readable article text was found. The page may block extraction, render content with scripts, or contain mostly media. Try pasting the text manually.",
        422
      );
    }

    if (format === "structured") {
      const payload: ProxyStructuredResponse = {
        text: extracted.text,
        sourceTitle: extracted.title,
        headings: extracted.headings,
        canonicalUrl: extracted.canonicalUrl,
      };

      return NextResponse.json(payload);
    }

    return new NextResponse(extracted.text, {
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
