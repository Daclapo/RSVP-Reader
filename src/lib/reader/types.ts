export type ReaderTheme = "slate" | "linen" | "sepia" | "midnight" | "forest" | "dawn" | "arctic";

export type ReadingMode = "orp-word" | "line-flow" | "chunk" | "ebook";

export type SourceKind = "paste" | "upload" | "url" | "wikipedia" | "library";

export type Locale = "en" | "es";

export type ReadingPreset = "relaxed" | "focus" | "fast" | "study" | "custom";

export type PunctuationPauseMode = "off" | "subtle" | "strong";

export type ReaderFontFamily =
  | "sans"
  | "serif"
  | "mono"
  | "times"
  | "arial"
  | "open-sans"
  | "georgia"
  | "baskerville"
  | "garamond"
  | "literata"
  | "merriweather"
  | "lora"
  | "crimson"
  | "raleway";

export type ReaderSettings = {
  mode: ReadingMode;
  preset: ReadingPreset;
  wpm: number;
  fontFamily: ReaderFontFamily;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  wordSpacing: number;
  viewerBg: string;
  viewerFg: string;
  autoZenOnPlay: boolean;
  focusWindow: number;
  chunkSize: number;
  punctuationPause: PunctuationPauseMode;
  lineFlowWordHighlight: boolean;
  ebookWordsPerPage: number;
  ebookAutoHighlight: boolean;
  ebookAutoPageAdvance: boolean;
  ebookLineMarker: boolean;
  ebookSpread: "single" | "double";
  ebookSinglePageOrientation: "portrait" | "landscape";
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
  wordCount?: number;
  warnings?: string[];
  documents?: Array<{
    name: string;
    sizeBytes: number;
    type: string;
    wordCount?: number;
    warning?: string;
  }>;
  textFormat?: "plain" | "markdown";
};

export type ReaderBookmark = {
  id: string;
  label: string;
  wordIndex: number;
  lineIndex: number;
  createdAt: string;
};

export type SavedReadingSession = {
  id: string;
  title: string;
  text: string;
  sourceMeta: SourceMeta;
  settings: ReaderSettings;
  theme: ReaderTheme;
  locale: Locale;
  currentWordIndex: number;
  bookmarks: ReaderBookmark[];
  createdAt: string;
  updatedAt: string;
};
