export type ReaderTheme = "slate" | "linen" | "sepia" | "midnight" | "forest" | "dawn" | "arctic";

export type ReadingMode = "orp-word" | "line-flow" | "chunk";

export type SourceKind = "paste" | "upload" | "url" | "library";

export type ReaderSettings = {
  mode: ReadingMode;
  wpm: number;
  fontFamily: "sans" | "serif" | "mono";
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  wordSpacing: number;
  viewerBg: string;
  viewerFg: string;
  autoZenOnPlay: boolean;
  focusWindow: number;
  chunkSize: number;
};

export type OutlineItem = {
  id: string;
  label: string;
  level: number;
  wordStartIndex: number;
  lineStartIndex: number;
  source: "markdown" | "html" | "heuristic";
};

export type ParsedDocument = {
  rawText: string;
  words: string[];
  lines: Array<{ id: string; text: string; wordStartIndex: number }>;
  outline: OutlineItem[];
};

export type StructuredHeading = {
  level: number;
  text: string;
  anchor: string;
};

export type ProxyStructuredResponse = {
  text: string;
  sourceTitle: string | null;
  headings: StructuredHeading[];
  canonicalUrl: string;
};

export type SourceMeta = {
  kind: SourceKind;
  sourceTitle?: string | null;
  sourceUrl?: string | null;
  headings?: StructuredHeading[];
  sourceUrls?: string[];
  documents?: Array<{
    name: string;
    sizeBytes: number;
    type: string;
    warning?: string;
  }>;
};
