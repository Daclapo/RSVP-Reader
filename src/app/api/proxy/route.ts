import { NextRequest, NextResponse } from "next/server";
import { JSDOM } from "jsdom";
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

  return compacted.join("\n").trim();
};

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  const format = req.nextUrl.searchParams.get("format");

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 RSVP-Formatter/2.0",
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

    document.querySelectorAll("script, style, noscript").forEach((element) => element.remove());

    const mainContentElement =
      document.querySelector("article") ||
      document.querySelector("main") ||
      document.querySelector("[role='main']") ||
      document.querySelector("#content") ||
      document.querySelector(".main-content") ||
      document.body;

    const text = normalizeText(mainContentElement?.textContent ?? "");

    if (format === "structured") {
      const title =
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
