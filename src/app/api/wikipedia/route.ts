import { NextRequest, NextResponse } from "next/server";
import { cleanImportedText } from "@/lib/reader/text-cleanup";
import type { ProxyStructuredResponse, StructuredHeading } from "@/lib/reader/types";

export const runtime = "nodejs";
export const maxDuration = 60;

type WikiSearchResponse = [string, string[], string[], string[]];

const SUPPORTED_LANGS = new Set(["en", "es"]);
const REQUEST_TIMEOUT_MS = 20_000;
const userAgent =
  "RSVP-Reader/1.0 (+https://github.com/Daclapo/RSVP-Reader; local-first reading app)";

const wikiBase = (lang: string) => `https://${SUPPORTED_LANGS.has(lang) ? lang : "en"}.wikipedia.org/w/api.php`;

const jsonError = (error: string, status = 500, detail?: string) =>
  NextResponse.json({ error, detail }, { status });

const fetchWithTimeout = async (url: URL) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": userAgent,
        Accept: "application/json",
        "Accept-Language": "en,es;q=0.9",
      },
    });
  } finally {
    clearTimeout(timeout);
  }
};

const cleanWikipediaHtml = async (html: string) => {
  const { JSDOM } = await import("jsdom");
  const dom = new JSDOM(html);
  const document = dom.window.document;

  document
    .querySelectorAll(
      [
        "script",
        "style",
        "noscript",
        ".mw-editsection",
        ".toc",
        "#toc",
        ".reference",
        ".reflist",
        ".navbox",
        ".metadata",
        ".ambox",
        ".infobox",
        ".vertical-navbox",
        ".catlinks",
        ".printfooter",
        "table",
        "figure",
        "img",
        "sup",
      ].join(", ")
    )
    .forEach((element) => element.remove());

  const headings: StructuredHeading[] = Array.from(document.querySelectorAll("h2, h3, h4"))
    .map((heading) => {
      const text = heading.textContent?.replace(/\s+/g, " ").replace(/\[edit\]/gi, "").trim() ?? "";
      if (!text || /^(references|external links|see also|notes|bibliography|referencias|enlaces externos|véase también|notas|bibliografía)$/i.test(text)) {
        return null;
      }
      const level = Number(heading.tagName.replace("H", ""));
      return {
        level: Number.isFinite(level) ? level : 2,
        text,
        anchor: heading.querySelector(".mw-headline")?.getAttribute("id") ?? "",
      };
    })
    .filter((heading): heading is StructuredHeading => heading !== null);

  const root = document.querySelector(".mw-parser-output") ?? document.body;
  const paragraphs: string[] = [];
  Array.from(root.children).forEach((element) => {
    if (/^H[2-4]$/.test(element.tagName)) {
      const headingText = element.textContent?.replace(/\s+/g, " ").replace(/\[edit\]/gi, "").trim();
      if (headingText) paragraphs.push(`## ${headingText}`);
      return;
    }

    if (element.tagName === "P" || element.tagName === "UL" || element.tagName === "OL") {
      const text = element.textContent?.replace(/\s+/g, " ").trim();
      if (text) paragraphs.push(text);
    }
  });

  return {
    text: cleanImportedText(paragraphs.join("\n\n")),
    headings,
  };
};

export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get("action") ?? "search";
  const lang = req.nextUrl.searchParams.get("lang") ?? "en";

  try {
    if (action === "search") {
      const query = req.nextUrl.searchParams.get("q")?.trim();
      if (!query) return jsonError("Search query is required", 400);

      const url = new URL(wikiBase(lang));
      url.search = new URLSearchParams({
        action: "opensearch",
        search: query,
        namespace: "0",
        limit: "8",
        redirects: "resolve",
        format: "json",
        origin: "*",
      }).toString();

      const response = await fetchWithTimeout(url);
      if (!response.ok) return jsonError(`Wikipedia search failed: ${response.statusText || response.status}`, response.status);

      const payload = (await response.json()) as WikiSearchResponse;
      return NextResponse.json({
        query: payload[0],
        results: payload[1].map((title, index) => ({
          title,
          description: payload[2][index] ?? "",
          url: payload[3][index] ?? "",
        })),
      });
    }

    if (action === "page") {
      const title = req.nextUrl.searchParams.get("title")?.trim();
      if (!title) return jsonError("Page title is required", 400);

      const url = new URL(wikiBase(lang));
      url.search = new URLSearchParams({
        action: "parse",
        page: title,
        prop: "text|displaytitle|sections",
        redirects: "1",
        format: "json",
        formatversion: "2",
        origin: "*",
      }).toString();

      const response = await fetchWithTimeout(url);
      if (!response.ok) return jsonError(`Wikipedia page load failed: ${response.statusText || response.status}`, response.status);

      const payload = await response.json();
      if (payload.error) return jsonError(payload.error.info ?? "Wikipedia returned an error", 422);

      const html = payload.parse?.text ?? "";
      const cleaned = await cleanWikipediaHtml(html);
      if (!cleaned.text.trim()) {
        return jsonError("No readable Wikipedia article text was found.", 422);
      }

      const canonicalTitle = payload.parse?.title ?? title;
      const sectionHeadings: StructuredHeading[] = Array.isArray(payload.parse?.sections)
        ? payload.parse.sections
            .map((section: { line?: string; toclevel?: number; anchor?: string }) => ({
              level: Math.min(Math.max(Number(section.toclevel ?? 2) + 1, 2), 6),
              text: section.line?.replace(/\s+/g, " ").trim() ?? "",
              anchor: section.anchor ?? "",
            }))
            .filter((section: StructuredHeading) => section.text.length > 0)
        : [];
      const canonicalUrl = `https://${SUPPORTED_LANGS.has(lang) ? lang : "en"}.wikipedia.org/wiki/${encodeURIComponent(canonicalTitle.replace(/\s+/g, "_"))}`;
      const result: ProxyStructuredResponse = {
        text: `# ${canonicalTitle}\n\n${cleaned.text}`,
        sourceTitle: canonicalTitle,
        headings: sectionHeadings.length > 0 ? sectionHeadings : cleaned.headings,
        canonicalUrl,
      };

      return NextResponse.json(result);
    }

    return jsonError("Unsupported Wikipedia action", 400);
  } catch (error) {
    console.error("Wikipedia route failed:", error);
    const isAbort = error instanceof Error && error.name === "AbortError";
    return jsonError(
      isAbort ? "Wikipedia took too long to respond. Try again in a moment." : "Wikipedia import failed on the server.",
      isAbort ? 504 : 500,
      error instanceof Error ? error.message : undefined
    );
  }
}
