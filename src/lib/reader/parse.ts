import type { OutlineItem, ParsedDocument, StructuredHeading } from "@/lib/reader/types";
import { cleanImportedText, tokenizeReadingWords } from "@/lib/reader/text-cleanup";

type ParseOptions = {
  htmlHeadings?: StructuredHeading[];
  wordsPerLine?: number;
  markdownMode?: boolean;
};

const NUMBERED_HEADER =
  /^(chapter|chapters|part|book|section|volume|cap[ií]tulo|cap[ií]tulos|parte|libro|secci[oó]n|volumen)\s+(?:[ivxlcdm]+|\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|first|second|third|i|ii|iii|iv|v|vi|vii|viii|ix|x)\b/i;
const STANDALONE_HEADER =
  /^(prologue|epilogue|preface|introduction|conclusion|appendix|pr[oó]logo|ep[ií]logo|prefacio|introducci[oó]n|conclusi[oó]n|ap[eé]ndice)$/i;
const ROMAN_HEADER = /^(?:[IVXLCDM]{1,8}|[0-9]{1,3})[.)\]]?\s+[A-ZÁÉÍÓÚÜÑ][\wÁÉÍÓÚÜÑáéíóúüñ’' -]{2,}$/;
const MARKDOWN_FENCE = /^```|^~~~/;
const MARKDOWN_RULE = /^([-*_]\s*){3,}$/;

const splitWords = tokenizeReadingWords;
const outlineKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9áéíóúüñ]+/gi, " ").replace(/\s+/g, " ").trim();

const stripMarkdownInline = (value: string) =>
  value
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/\\([\\`*_{}\[\]()#+\-.!>])/g, "$1")
    .trim();

const normalizeReadableLine = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed || MARKDOWN_FENCE.test(trimmed) || MARKDOWN_RULE.test(trimmed)) return "";

  const withoutBlockSyntax = trimmed
    .replace(/^>\s?/, "")
    .replace(/^- \[[ xX]\]\s+/, "")
    .replace(/^[-*+]\s+/, "")
    .replace(/^\d+[.)]\s+/, "");

  return stripMarkdownInline(withoutBlockSyntax);
};

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-") || "section";

const isLikelyChapterHeading = (value: string) => {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized || normalized.length > 110) return false;
  if (/^(c\s*ontents?|table of contents|índice|indice)$/i.test(normalized)) return false;
  const words = splitWords(normalized);
  if (words.length > 12) return false;
  if (STANDALONE_HEADER.test(normalized)) return true;
  if (NUMBERED_HEADER.test(normalized)) return true;
  if (ROMAN_HEADER.test(normalized)) return true;
  return false;
};

const findSubsequenceIndex = (haystack: string[], needle: string[]): number => {
  if (!needle.length || needle.length > haystack.length) return -1;

  for (let start = 0; start <= haystack.length - needle.length; start += 1) {
    let matched = true;
    for (let offset = 0; offset < needle.length; offset += 1) {
      if (haystack[start + offset] !== needle[offset]) {
        matched = false;
        break;
      }
    }
    if (matched) return start;
  }

  return -1;
};

const findLineIndexForWord = (
  lines: Array<{ id: string; text: string; wordStartIndex: number }>,
  wordIndex: number
) => {
  if (lines.length === 0) return 0;

  for (let index = 0; index < lines.length; index += 1) {
    const current = lines[index];
    const next = lines[index + 1];
    const nextStart = next ? next.wordStartIndex : Number.POSITIVE_INFINITY;

    if (wordIndex >= current.wordStartIndex && wordIndex < nextStart) {
      return index;
    }
  }

  return lines.length - 1;
};

export const getLineIndexForWord = findLineIndexForWord;

export const getActiveOutlineIndex = (outline: OutlineItem[], wordIndex: number) => {
  if (outline.length === 0) return -1;

  let activeIndex = 0;
  outline.forEach((item, index) => {
    if (item.wordStartIndex <= wordIndex) activeIndex = index;
  });

  return activeIndex;
};

export function parseDocument(rawText: string, options: ParseOptions = {}): ParsedDocument {
  const normalizedText = cleanImportedText(rawText).replace(/\r\n?/g, "\n");
  const rawLines = normalizedText.split("\n");
  const wordsPerLine = Math.max(options.wordsPerLine ?? 12, 6);

  const words: string[] = [];
  const lines: Array<{ id: string; text: string; wordStartIndex: number }> = [];
  const candidateOutline: Array<Omit<OutlineItem, "id">> = [];

  rawLines.forEach((rawLine) => {
    const trimmed = rawLine.trim();
    const markdownMatch = trimmed.match(/^(#{1,6})\s+(.+?)\s*$/);
    const normalizedLine = markdownMatch ? stripMarkdownInline(markdownMatch[2].trim()) : normalizeReadableLine(trimmed);
    const lineWordStart = words.length;
    const lineWords = splitWords(normalizedLine);

    if (markdownMatch && (options.markdownMode || isLikelyChapterHeading(normalizedLine))) {
      candidateOutline.push({
        label: normalizedLine,
        level: markdownMatch[1].length,
        source: "markdown",
        wordStartIndex: lineWordStart,
        lineStartIndex: Math.max(lines.length, 0),
      });
    } else if (normalizedLine && isLikelyChapterHeading(normalizedLine)) {
      candidateOutline.push({
        label: normalizedLine,
        level: isLikelyChapterHeading(normalizedLine) ? 2 : 3,
        source: "heuristic",
        wordStartIndex: lineWordStart,
        lineStartIndex: Math.max(lines.length, 0),
      });
    }

    if (lineWords.length === 0) {
      return;
    }

    words.push(...lineWords);

    for (let offset = 0; offset < lineWords.length; offset += wordsPerLine) {
      const chunk = lineWords.slice(offset, offset + wordsPerLine);
      lines.push({
        id: `line-${lines.length + 1}`,
        text: chunk.join(" "),
        wordStartIndex: lineWordStart + offset,
      });
    }
  });

  const loweredWords = words.map((word) => word.toLowerCase());

  (options.htmlHeadings ?? []).forEach((heading) => {
    const headingLabel = normalizeReadableLine(heading.text);
    if (!isLikelyChapterHeading(headingLabel)) return;
    const headingWords = splitWords(headingLabel.toLowerCase());
    if (headingWords.length === 0) return;

    const wordStartIndex = findSubsequenceIndex(loweredWords, headingWords);
    if (wordStartIndex === -1) return;

    candidateOutline.push({
      label: heading.text,
      level: Math.min(Math.max(heading.level, 1), 6),
      source: "html",
      wordStartIndex,
      lineStartIndex: findLineIndexForWord(lines, wordStartIndex),
    });
  });

  const deduped = new Map<string, Omit<OutlineItem, "id">>();
  candidateOutline.forEach((item) => {
    const key = `${outlineKey(item.label)}::${item.wordStartIndex}`;
    if (!deduped.has(key)) deduped.set(key, item);
  });

  const sortedCandidates = Array.from(deduped.values())
    .filter((item) => item.label.trim().length > 0)
    .sort((a, b) => a.wordStartIndex - b.wordStartIndex);

  const lastIndexByLabel = new Map<string, number>();
  sortedCandidates.forEach((item, index) => {
    lastIndexByLabel.set(outlineKey(item.label), index);
  });

  const outline = sortedCandidates
    .filter((item, index) => {
      const key = outlineKey(item.label);
      const lastIndex = lastIndexByLabel.get(key) ?? index;
      if (lastIndex === index) return true;
      return item.wordStartIndex > words.length * 0.35;
    })
    .map((item, index) => ({
      ...item,
      id: `${slugify(item.label)}-${index + 1}`,
      lineStartIndex: findLineIndexForWord(lines, item.wordStartIndex),
    }));

  return {
    rawText: normalizedText,
    words,
    lines,
    outline,
  };
}
