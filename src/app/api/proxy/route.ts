import { NextRequest, NextResponse } from "next/server";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { cleanImportedText } from "@/lib/reader/text-cleanup";
import type { ProxyStructuredResponse } from "@/lib/reader/types";

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

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  const format = req.nextUrl.searchParams.get("format");

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return NextResponse.json({ error: "Only http and https URLs are supported" }, { status: 400 });
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 RSVP-Reader/2.0",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch: ${response.statusText}` },
        { status: response.status }
      );
    }

    const html = await response.text();
    const dom = new JSDOM(html);
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
      return NextResponse.json(
        {
          error:
            "No readable article text was found. The page may block extraction, render content with scripts, or contain mostly media. Try pasting the text manually.",
        },
        { status: 422 }
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
        "Content-Type": "text/plain",
      },
    });
  } catch (error) {
    console.error("Proxy fetching error:", error);
    return NextResponse.json({ error: "An internal error occurred" }, { status: 500 });
  }
}
