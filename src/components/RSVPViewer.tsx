import { useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { ReaderSettings } from "@/lib/reader/types";
import { getLineIndexForWord } from "@/lib/reader/parse";

type ViewerLine = {
  id: string;
  text: string;
  wordStartIndex: number;
};

type RSVPViewerProps = {
  words: string[];
  lines: ViewerLine[];
  currentWordIndex: number;
  onWordClick: (wordIndex: number) => void;
  settings: ReaderSettings;
  isPlaying: boolean;
  className?: string;
  onActiveLineChange?: (lineIndex: number) => void;
};

const getOrpIndex = (word: string): number => {
  const cleanLength = word.length;
  if (cleanLength <= 1) return 0;
  if (cleanLength <= 5) return 1;
  if (cleanLength <= 9) return 2;
  if (cleanLength <= 13) return 3;
  return 4;
};

const renderOrpWord = (word: string) => {
  const index = getOrpIndex(word);
  const start = word.slice(0, index);
  const pivot = word[index] ?? "";
  const end = word.slice(index + 1);

  return (
    <>
      <span>{start}</span>
      <span className="text-primary">{pivot}</span>
      <span>{end}</span>
    </>
  );
};

const RSVPViewer = ({
  words,
  lines,
  currentWordIndex,
  onWordClick,
  settings,
  isPlaying,
  className,
  onActiveLineChange,
}: RSVPViewerProps) => {
  const currentWord = words[currentWordIndex] ?? "";

  const currentChunk = useMemo(() => {
    if (words.length === 0) return [] as string[];
    const startIndex = currentWordIndex;
    return words.slice(startIndex, startIndex + settings.chunkSize);
  }, [currentWordIndex, settings.chunkSize, words]);

  const currentLineIndex = useMemo(() => getLineIndexForWord(lines, currentWordIndex), [lines, currentWordIndex]);

  useEffect(() => {
    onActiveLineChange?.(currentLineIndex);
  }, [currentLineIndex, onActiveLineChange]);

  const viewerStyle = {
    backgroundColor: settings.viewerBg,
    color: settings.viewerFg,
    lineHeight: settings.lineHeight,
    letterSpacing: `${settings.letterSpacing}em`,
    wordSpacing: `${settings.wordSpacing}em`,
    fontFamily:
      settings.fontFamily === "serif"
        ? "var(--font-serif)"
        : settings.fontFamily === "mono"
          ? "var(--font-mono)"
          : "var(--font-sans)",
  } as const;

  if (settings.mode === "orp-word") {
    return (
      <Card className={className}>
        <CardContent className="relative flex h-full min-h-[18rem] items-center justify-center rounded-lg" style={viewerStyle}>
          <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border/70" />
          <p className="text-center font-semibold tracking-tight" style={{ fontSize: `${1 + settings.fontSize * 0.33}rem` }}>
            {currentWord ? renderOrpWord(currentWord) : "..."}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (settings.mode === "chunk") {
    return (
      <Card className={className}>
        <CardContent className="flex h-full min-h-[18rem] items-center justify-center rounded-lg" style={viewerStyle}>
          <div className="text-center" style={{ fontSize: `${0.8 + settings.fontSize * 0.2}rem` }}>
            {currentChunk.length === 0 ? (
              <span>...</span>
            ) : (
              currentChunk.map((word, index) => (
                <span key={`${currentWordIndex}-${index}`} className={index === 0 ? "font-semibold text-primary" : "text-inherit"}>
                  {index > 0 ? " " : ""}
                  {word}
                </span>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const windowRadius = Math.max(settings.focusWindow + 4, 7);
  const startLine = Math.max(0, currentLineIndex - windowRadius);
  const endLine = Math.min(lines.length, currentLineIndex + windowRadius + 1);
  const visibleLines = lines.slice(startLine, endLine);

  return (
    <Card className={className}>
      <CardContent className="relative h-full min-h-[18rem] overflow-hidden rounded-lg px-4 py-6" style={viewerStyle}>
        <div className="pointer-events-none absolute inset-x-4 top-1/2 z-10 h-px -translate-y-1/2 bg-primary/45" />

        <div className="relative flex h-full flex-col items-stretch justify-center gap-2">
          {visibleLines.map((line, offset) => {
            const lineIndex = startLine + offset;
            const lineWords = line.text.match(/\S+/g) ?? [];
            const isActiveLine = lineIndex === currentLineIndex;
            const distance = Math.abs(lineIndex - currentLineIndex);
            const outOfFocus = distance > settings.focusWindow;

            return (
              <div
                key={line.id}
                className={`rounded-md px-2 py-1 text-center transition-all ${
                  isActiveLine ? "text-primary" : "text-foreground"
                } ${outOfFocus ? "opacity-35" : "opacity-100"}`}
                style={{ fontSize: `${0.72 + settings.fontSize * 0.09}rem` }}
              >
                {lineWords.length === 0 ? (
                  <div className="h-4" />
                ) : (
                  lineWords.map((word, wordOffset) => {
                    const absoluteWordIndex = line.wordStartIndex + wordOffset;
                    const isCurrentWord = absoluteWordIndex === currentWordIndex;

                    return (
                      <button
                        key={`${line.id}-${wordOffset}`}
                        type="button"
                        onClick={() => onWordClick(absoluteWordIndex)}
                        className={`mr-2 inline-flex rounded px-0.5 text-left transition-colors ${
                          isCurrentWord ? "font-semibold text-primary" : "hover:text-primary"
                        }`}
                      >
                        {isCurrentWord ? renderOrpWord(word) : word}
                      </button>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>

        {isPlaying ? (
          <div className="pointer-events-none absolute right-3 top-3 rounded-full border border-border/70 bg-card/90 px-2 py-0.5 text-[10px] text-muted-foreground">
            Playing
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default RSVPViewer;
