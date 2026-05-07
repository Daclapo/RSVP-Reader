import type { ReaderSettings, ReaderTheme, SourceMeta } from "@/lib/reader/types";

export const DEFAULT_TEXT = `# RSVP Reader

Rapid serial visual presentation (RSVP) displays words in sequence to reduce eye travel and increase reading speed.

## Why this matters

You can keep your visual focus stable and train your comprehension at progressively higher speeds.

## Quick start

1. Paste a long text or import a source.
2. Tune your speed and style.
3. Enter Reader mode and press play.

## Keyboard shortcuts

Space / K to play-pause, arrows to step, and [ ] to adjust speed.`;

export const DEFAULT_THEME: ReaderTheme = "slate";

export const DEFAULT_SETTINGS: ReaderSettings = {
  mode: "orp-word",
  preset: "focus",
  wpm: 300,
  fontFamily: "serif",
  fontSize: 6,
  lineHeight: 1.55,
  letterSpacing: 0.01,
  wordSpacing: 0.12,
  viewerBg: "#FFFFFF",
  viewerFg: "#1A1A1A",
  autoZenOnPlay: true,
  focusWindow: 2,
  chunkSize: 3,
  punctuationPause: "subtle",
  lineFlowWordHighlight: false,
  ebookWordsPerPage: 180,
  ebookAutoHighlight: true,
  ebookAutoPageAdvance: true,
  ebookLineMarker: true,
  ebookSpread: "double",
  ebookSinglePageOrientation: "portrait",
};

export const DEFAULT_SOURCE_META: SourceMeta = {
  kind: "paste",
  sourceTitle: "Starter text",
  textFormat: "markdown",
};
