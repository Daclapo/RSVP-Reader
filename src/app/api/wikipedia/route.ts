import { NextRequest, NextResponse } from "next/server";
import { cleanImportedText } from "@/lib/reader/text-cleanup";
import type { ProxyStructuredResponse, StructuredHeading } from "@/lib/reader/types";

export const runtime = "nodejs";
export const maxDuration = 60;

type WikiSearchResponse = [string, string[], string[], string[]];
type WikiQueryPage = {
  title?: string;
  extract?: string;
  missing?: boolean;
};

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

const sectionHeadingFromPayload = (sections: unknown): StructuredHeading[] =>
  Array.isArray(sections)
    ? sections
        .map((section: { line?: string; toclevel?: number; anchor?: string }) => ({
          level: Math.min(Math.max(Number(section.toclevel ?? 2) + 1, 2), 6),
          text: section.line?.replace(/\s+/g, " ").trim() ?? "",
          anchor: section.anchor ?? "",
        }))
        .filter((section: StructuredHeading) => section.text.length > 0)
    : [];

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

      const sectionsUrl = new URL(wikiBase(lang));
      sectionsUrl.search = new URLSearchParams({
        action: "parse",
        page: title,
        prop: "displaytitle|sections",
        redirects: "1",
        format: "json",
        formatversion: "2",
        origin: "*",
      }).toString();

      const extractUrl = new URL(wikiBase(lang));
      extractUrl.search = new URLSearchParams({
        action: "query",
        prop: "extracts",
        titles: title,
        redirects: "1",
        explaintext: "1",
        exsectionformat: "plain",
        format: "json",
        formatversion: "2",
        origin: "*",
      }).toString();

      const [sectionsResponse, extractResponse] = await Promise.all([
        fetchWithTimeout(sectionsUrl),
        fetchWithTimeout(extractUrl),
      ]);
      if (!sectionsResponse.ok) return jsonError(`Wikipedia sections failed: ${sectionsResponse.statusText || sectionsResponse.status}`, sectionsResponse.status);
      if (!extractResponse.ok) return jsonError(`Wikipedia page load failed: ${extractResponse.statusText || extractResponse.status}`, extractResponse.status);

      const [sectionsPayload, extractPayload] = await Promise.all([
        sectionsResponse.json(),
        extractResponse.json(),
      ]);
      if (sectionsPayload.error) return jsonError(sectionsPayload.error.info ?? "Wikipedia returned an error", 422);
      if (extractPayload.error) return jsonError(extractPayload.error.info ?? "Wikipedia returned an error", 422);

      const page = (extractPayload.query?.pages?.[0] ?? {}) as WikiQueryPage;
      const extract = cleanImportedText(page.extract ?? "");
      if (!extract.trim()) {
        return jsonError("No readable Wikipedia article text was found.", 422);
      }

      const canonicalTitle = page.title ?? sectionsPayload.parse?.title ?? title;
      const sectionHeadings = sectionHeadingFromPayload(sectionsPayload.parse?.sections);
      const canonicalUrl = `https://${SUPPORTED_LANGS.has(lang) ? lang : "en"}.wikipedia.org/wiki/${encodeURIComponent(canonicalTitle.replace(/\s+/g, "_"))}`;
      const result: ProxyStructuredResponse = {
        text: `# ${canonicalTitle}\n\n${extract}`,
        sourceTitle: canonicalTitle,
        headings: sectionHeadings,
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
