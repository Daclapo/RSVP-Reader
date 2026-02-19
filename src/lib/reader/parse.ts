import type { OutlineItem, ParsedDocument, StructuredHeading } from "@/lib/reader/types";

type ParseOptions = {
  htmlHeadings?: StructuredHeading[];
  wordsPerLine?: number;
};

const HEURISTIC_HEADER = /^(chapter|part|book|section)\b/i;

const splitWords = (value: string): string[] => value.match(/\S+/g) ?? [];

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-") || "section";

const isAllCapsHeading = (value: string) => {
  if (value.length < 4 || value.length > 80) return false;
  const words = splitWords(value);
  if (words.length < 1 || words.length > 10) return false;
  const lettersOnly = value.replace(/[^a-zA-Z]/g, "");
  if (!lettersOnly) return false;
  return lettersOnly === lettersOnly.toUpperCase();
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
  const normalizedText = rawText.replace(/\r\n?/g, "\n");
  const rawLines = normalizedText.split("\n");
  const wordsPerLine = Math.max(options.wordsPerLine ?? 12, 6);

  const words: string[] = [];
  const lines: Array<{ id: string; text: string; wordStartIndex: number }> = [];
  const candidateOutline: Array<Omit<OutlineItem, "id">> = [];

  rawLines.forEach((rawLine) => {
    const trimmed = rawLine.trim();
    const markdownMatch = trimmed.match(/^(#{1,6})\s+(.+?)\s*$/);
    const normalizedLine = markdownMatch ? markdownMatch[2].trim() : trimmed;
    const lineWordStart = words.length;
    const lineWords = splitWords(normalizedLine);

    if (markdownMatch) {
      candidateOutline.push({
        label: normalizedLine,
        level: markdownMatch[1].length,
        source: "markdown",
        wordStartIndex: lineWordStart,
        lineStartIndex: Math.max(lines.length, 0),
      });
    } else if (trimmed && (HEURISTIC_HEADER.test(trimmed) || isAllCapsHeading(trimmed))) {
      candidateOutline.push({
        label: trimmed,
        level: HEURISTIC_HEADER.test(trimmed) ? 2 : 3,
        source: "heuristic",
        wordStartIndex: lineWordStart,
        lineStartIndex: Math.max(lines.length, 0),
      });
    }

    if (lineWords.length === 0) {
      lines.push({
        id: `line-${lines.length + 1}`,
        text: "",
        wordStartIndex: lineWordStart,
      });
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
    const headingWords = splitWords(heading.text.toLowerCase());
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
    const key = `${item.label.toLowerCase()}::${item.wordStartIndex}`;
    if (!deduped.has(key)) deduped.set(key, item);
  });

  const outline = Array.from(deduped.values())
    .filter((item) => item.label.trim().length > 0)
    .sort((a, b) => a.wordStartIndex - b.wordStartIndex)
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
