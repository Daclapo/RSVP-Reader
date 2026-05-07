import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { readerFontStacks } from "@/lib/reader/fonts";
import { tokenizeReadingWords } from "@/lib/reader/text-cleanup";
import type { OutlineItem, ReaderSettings } from "@/lib/reader/types";

type EbookLine = {
  id: string;
  text: string;
  markdownLevel: number | null;
  wordStartIndex: number;
  wordCount: number;
};

type EbookPage = {
  startLine: number;
  endLine: number;
  startWordIndex: number;
};

type EbookViewerProps = {
  rawText: string;
  words: string[];
  outline: OutlineItem[];
  currentWordIndex: number;
  settings: ReaderSettings;
  isPlaying: boolean;
  compact?: boolean;
  markdownMode?: boolean;
  t: (key: TranslationKey) => string;
  onWordClick: (wordIndex: number) => void;
  onPageChange: (wordIndex: number) => void;
};

const splitWords = tokenizeReadingWords;

const wordsPerMarkerRow = (settings: ReaderSettings) => {
  const base = isSingleLandscape(settings) ? 20 : settings.ebookSpread === "double" ? 9 : 13;
  const fontPenalty = Math.max(0, settings.fontSize - 6) * 0.7;
  const spacingPenalty = Math.max(0, settings.wordSpacing - 0.12) * 6 + Math.max(0, settings.letterSpacing - 0.01) * 18;
  return Math.max(6, Math.floor(base - fontPenalty - spacingPenalty));
};

const stripMarkdownLine = (line: string) => {
  const markdownHeading = line.trim().match(/^(#{1,6})\s+(.+)$/);
  return {
    text: markdownHeading ? markdownHeading[2].trim() : line.trim(),
    markdownLevel: markdownHeading ? markdownHeading[1].length : null,
  };
};

const isSingleLandscape = (settings: ReaderSettings) =>
  settings.ebookSpread === "single" && settings.ebookSinglePageOrientation === "landscape";

const sourceLinesForLayout = (rawText: string, settings: ReaderSettings) => {
  return rawText
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .flatMap((block) => {
      const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
      if (lines.length === 0) return [""];
      if (lines.length === 1 && /^#{1,6}\s+/.test(lines[0])) return [lines[0], ""];
      if (!isSingleLandscape(settings) && lines.every((line) => /^#{1,6}\s+/.test(line))) return [...lines, ""];
      return [lines.join(" "), ""];
    });
};

const buildEbookLines = (rawText: string, settings: ReaderSettings): EbookLine[] => {
  let wordIndex = 0;
  return sourceLinesForLayout(rawText, settings).map((line, index) => {
    const parsed = stripMarkdownLine(line);
    const words = splitWords(parsed.text);
    const ebookLine = {
      id: `ebook-line-${index}`,
      text: parsed.text,
      markdownLevel: parsed.markdownLevel,
      wordStartIndex: wordIndex,
      wordCount: words.length,
    };
    wordIndex += words.length;
    return ebookLine;
  });
};

const buildPages = (lines: EbookLine[], wordsPerPage: number): EbookPage[] => {
  if (lines.length === 0) return [{ startLine: 0, endLine: 0, startWordIndex: 0 }];

  const pages: EbookPage[] = [];
  let startLine = 0;
  let startWordIndex = lines[0]?.wordStartIndex ?? 0;
  let pageWords = 0;

  lines.forEach((line, index) => {
    pageWords += line.wordCount;
    const isLast = index === lines.length - 1;
    const shouldBreak = pageWords >= wordsPerPage && !isLast;

    if (shouldBreak) {
      pages.push({ startLine, endLine: index + 1, startWordIndex });
      startLine = index + 1;
      startWordIndex = lines[startLine]?.wordStartIndex ?? line.wordStartIndex + line.wordCount;
      pageWords = 0;
    }

    if (isLast) {
      pages.push({ startLine, endLine: lines.length, startWordIndex });
    }
  });

  return pages;
};

const chapterForWord = (outline: OutlineItem[], wordIndex: number): OutlineItem | null => {
  let current: OutlineItem | null = null;
  for (const item of outline) {
    if (item.wordStartIndex <= wordIndex) current = item;
  }
  return current;
};

const pageIndexForWord = (pages: EbookPage[], wordIndex: number) =>
  Math.max(pages.findLastIndex((page) => page.startWordIndex <= wordIndex), 0);

const EbookViewer = ({ rawText, words, outline, currentWordIndex, settings, isPlaying, compact = false, markdownMode = false, t, onWordClick, onPageChange }: EbookViewerProps) => {
  const [pageInput, setPageInput] = useState("");
  const landscape = isSingleLandscape(settings);
  const artificialPages = outline.length === 0;
  const baseWordsPerPage = artificialPages ? Math.min(settings.ebookWordsPerPage, 140) : settings.ebookWordsPerPage;
  const wordsPerPage = Math.max(Math.round(baseWordsPerPage * (landscape ? 2.1 : 1)), 80);
  const markerRowSize = wordsPerMarkerRow(settings);
  const ebookLines = useMemo(() => buildEbookLines(rawText, settings), [rawText, settings]);
  const pages = useMemo(() => buildPages(ebookLines, wordsPerPage), [ebookLines, wordsPerPage]);
  const currentPageIndex = pageIndexForWord(pages, currentWordIndex);
  const spreadStartIndex = settings.ebookSpread === "double" ? Math.floor(currentPageIndex / 2) * 2 : currentPageIndex;
  const visiblePages = settings.ebookSpread === "double" ? pages.slice(spreadStartIndex, spreadStartIndex + 2) : pages.slice(spreadStartIndex, spreadStartIndex + 1);
  const pageStep = settings.ebookSpread === "double" ? 2 : 1;
  const currentChapter = chapterForWord(outline, pages[spreadStartIndex]?.startWordIndex ?? currentWordIndex);
  const viewerStyle = {
    backgroundColor: settings.viewerBg,
    color: settings.viewerFg,
    lineHeight: settings.lineHeight,
    letterSpacing: `${settings.letterSpacing}em`,
    wordSpacing: `${settings.wordSpacing}em`,
    fontFamily: readerFontStacks[settings.fontFamily],
  } as const;

  const goToPage = (pageIndex: number) => {
    const safeIndex = Math.min(Math.max(pageIndex, 0), Math.max(pages.length - 1, 0));
    onPageChange(pages[safeIndex]?.startWordIndex ?? 0);
  };

  const handlePageSubmit = () => {
    const pageNumber = Number(pageInput);
    if (!Number.isFinite(pageNumber)) return;
    goToPage(pageNumber - 1);
  };

  const renderPage = (page: EbookPage | undefined, offset: number) => {
    if (!page) {
      return <article key={`empty-${offset}`} className="hidden xl:block" />;
    }

    const pageLines = ebookLines.slice(page.startLine, page.endLine);
    const displayPage = spreadStartIndex + offset + 1;
    const currentPageEndWord = pageLines.reduce((last, line) => Math.max(last, line.wordStartIndex + line.wordCount), page.startWordIndex);
    const pageHasActiveWord = currentWordIndex >= page.startWordIndex && currentWordIndex < currentPageEndWord;

    return (
      <article
        key={`page-${page.startWordIndex}-${offset}`}
        className={`ebook-page-in mx-auto flex w-full flex-col rounded-md border border-border/80 p-6 pb-16 text-base shadow-sm md:p-8 md:pb-20 md:text-lg ${
          landscape ? "max-w-none" : "max-w-[44rem]"
        } ${
          artificialPages
            ? "h-[min(74vh,44rem)] overflow-y-auto"
            : compact
              ? "min-h-[min(86vh,54rem)]"
              : landscape
                ? "min-h-[min(88vh,58rem)]"
                : "min-h-[min(88vh,58rem)]"
        }`}
        style={viewerStyle}
      >
        <div className="mb-4 flex shrink-0 items-center justify-between border-b border-border/60 pb-2 text-xs text-muted-foreground">
          <span>{currentChapter?.label ?? t("ebook")}</span>
          <span>{displayPage}</span>
        </div>

        <div className="flex-1 pb-8">
          {pageLines.map((line) => {
            if (!line.text) return <div key={line.id} className="h-5" />;

            const markdownHeading = markdownMode && line.markdownLevel ? line.markdownLevel : null;
            const lineWords = splitWords(line.text);
            const lineEndIndex = line.wordStartIndex + line.wordCount;
            const activeLine = pageHasActiveWord && currentWordIndex >= line.wordStartIndex && currentWordIndex < lineEndIndex;
            const activeOffset = activeLine ? currentWordIndex - line.wordStartIndex : -1;
            const activeMarkerRow = activeOffset >= 0 ? Math.floor(activeOffset / markerRowSize) : -1;
            return (
              <p
                key={line.id}
                className={`relative mb-2 pl-5 text-left ${markdownHeading ? "mt-4 font-semibold" : ""}`}
                style={markdownHeading ? { fontSize: `${1.04 + Math.max(0, 6 - markdownHeading) * 0.045}em` } : undefined}
              >
                {settings.ebookLineMarker && activeMarkerRow >= 0 && settings.ebookAutoHighlight && isPlaying ? (
                  <span
                    className="absolute left-0 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-primary shadow-sm transition-all duration-200"
                    style={{ top: `${(activeMarkerRow + 0.5) * settings.lineHeight}em` }}
                  />
                ) : null}
                {lineWords.map((word, wordOffset) => {
                  const absoluteIndex = line.wordStartIndex + wordOffset;
                  const active = absoluteIndex === currentWordIndex;
                  return (
                    <button
                      key={`${absoluteIndex}-${word}`}
                      type="button"
                      onClick={() => onWordClick(absoluteIndex)}
                      className={`mr-1 rounded px-0.5 text-left transition-colors ${
                        active && settings.ebookAutoHighlight && isPlaying ? "bg-primary/20 text-primary" : "hover:bg-accent/40"
                      }`}
                    >
                      {word}
                    </button>
                  );
                })}
              </p>
            );
          })}
        </div>
      </article>
    );
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm text-muted-foreground">
            {t("page")}{" "}
            {settings.ebookSpread === "double" && visiblePages.length > 1
              ? `${spreadStartIndex + 1}-${Math.min(spreadStartIndex + 2, pages.length)}`
              : spreadStartIndex + 1}
            /{Math.max(pages.length, 1)}
          </p>
          {currentChapter ? <p className="text-xs text-muted-foreground">{t("currentChapter")}: {currentChapter.label}</p> : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={spreadStartIndex === 0} onClick={() => goToPage(spreadStartIndex - pageStep)}>
            <ChevronLeft className="h-4 w-4" />
            {t("previousPage")}
          </Button>
          <div className="flex items-center gap-1">
            <Input
              value={pageInput}
              onChange={(event) => setPageInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handlePageSubmit();
              }}
              className="h-9 w-20"
              placeholder={String(spreadStartIndex + 1)}
              aria-label={t("goToPage")}
            />
            <Button variant="outline" size="sm" onClick={handlePageSubmit}>
              {t("go")}
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={spreadStartIndex + pageStep >= pages.length || words.length === 0}
            onClick={() => goToPage(spreadStartIndex + pageStep)}
          >
            {t("nextPage")}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className={`grid items-start gap-3 ${settings.ebookSpread === "double" ? "mx-auto max-w-[88rem] justify-center xl:grid-cols-[minmax(0,42rem)_minmax(0,42rem)]" : "place-items-center"}`}>
        {visiblePages.map(renderPage)}
        {settings.ebookSpread === "double" && visiblePages.length === 1 ? renderPage(undefined, 1) : null}
      </div>
    </section>
  );
};

export default EbookViewer;
