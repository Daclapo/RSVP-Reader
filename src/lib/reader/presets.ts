import type { ReaderSettings, ReadingPreset } from "@/lib/reader/types";

export type PresetDefinition = {
  value: ReadingPreset;
  label: string;
  description: string;
  settings: Pick<ReaderSettings, "mode" | "wpm" | "fontFamily" | "fontSize" | "lineHeight" | "focusWindow" | "chunkSize" | "punctuationPause" | "ebookWordsPerPage">;
};

export const READING_PRESETS: PresetDefinition[] = [
  {
    value: "relaxed",
    label: "Relaxed",
    description: "Lower speed and stronger punctuation pauses for comfortable long reading.",
    settings: {
      mode: "line-flow",
      wpm: 280,
      fontFamily: "sans",
      fontSize: 6,
      lineHeight: 1.65,
      focusWindow: 3,
      chunkSize: 3,
      punctuationPause: "strong",
      ebookWordsPerPage: 180,
    },
  },
  {
    value: "focus",
    label: "Focus",
    description: "Balanced ORP reading with subtle punctuation pauses.",
    settings: {
      mode: "orp-word",
      wpm: 300,
      fontFamily: "serif",
      fontSize: 6,
      lineHeight: 1.55,
      focusWindow: 2,
      chunkSize: 3,
      punctuationPause: "subtle",
      ebookWordsPerPage: 180,
    },
  },
  {
    value: "fast",
    label: "Fast",
    description: "Higher speed with lighter pauses for skimming.",
    settings: {
      mode: "chunk",
      wpm: 200,
      fontFamily: "serif",
      fontSize: 5,
      lineHeight: 1.45,
      focusWindow: 1,
      chunkSize: 4,
      punctuationPause: "off",
      ebookWordsPerPage: 180,
    },
  },
  {
    value: "study",
    label: "Study",
    description: "Steady line flow with broader context for dense material.",
    settings: {
      mode: "line-flow",
      wpm: 280,
      fontFamily: "sans",
      fontSize: 6,
      lineHeight: 1.7,
      focusWindow: 4,
      chunkSize: 3,
      punctuationPause: "strong",
      ebookWordsPerPage: 180,
    },
  },
];

export const getPresetSettings = (preset: ReadingPreset) =>
  READING_PRESETS.find((item) => item.value === preset)?.settings ?? null;
