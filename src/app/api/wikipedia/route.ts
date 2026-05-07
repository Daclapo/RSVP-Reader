import { NextRequest, NextResponse } from "next/server";
import { JSDOM } from "jsdom";
import { cleanImportedText } from "@/lib/reader/text-cleanup";
import type { ProxyStructuredResponse, StructuredHeading } from "@/lib/reader/types";

type WikiSearchResponse = [string, string[], string[], string[]];

const SUPPORTED_LANGS = new Set(["en", "es"]);

const wikiBase = (lang: string) => `https://${SUPPORTED_LANGS.has(lang) ? lang : "en"}.wikipedia.org/w/api.php`;

const cleanWikipediaHtml = (html: string) => {
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

  if (action === "search") {
    const query = req.nextUrl.searchParams.get("q")?.trim();
    if (!query) return NextResponse.json({ error: "Search query is required" }, { status: 400 });

    const url = new URL(wikiBase(lang));
    url.search = new URLSearchParams({
      action: "opensearch",
      search: query,
      namespace: "0",
      limit: "8",
      redirects: "resolve",
      format: "json",
    }).toString();

    const response = await fetch(url, {
      headers: { "User-Agent": "RSVP-Reader/1.0 (local-first reading app)" },
    });
    if (!response.ok) return NextResponse.json({ error: "Wikipedia search failed" }, { status: response.status });

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
    if (!title) return NextResponse.json({ error: "Page title is required" }, { status: 400 });

    const url = new URL(wikiBase(lang));
    url.search = new URLSearchParams({
      action: "parse",
      page: title,
      prop: "text|displaytitle|sections",
      redirects: "1",
      format: "json",
      formatversion: "2",
    }).toString();

    const response = await fetch(url, {
      headers: { "User-Agent": "RSVP-Reader/1.0 (local-first reading app)" },
    });
    if (!response.ok) return NextResponse.json({ error: "Wikipedia page load failed" }, { status: response.status });

    const payload = await response.json();
    if (payload.error) return NextResponse.json({ error: payload.error.info ?? "Wikipedia returned an error" }, { status: 422 });

    const html = payload.parse?.text ?? "";
    const cleaned = cleanWikipediaHtml(html);
    if (!cleaned.text.trim()) {
      return NextResponse.json({ error: "No readable Wikipedia article text was found." }, { status: 422 });
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

  return NextResponse.json({ error: "Unsupported Wikipedia action" }, { status: 400 });
}
