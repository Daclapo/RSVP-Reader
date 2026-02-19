"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Focus,
  ListTree,
  Pause,
  Play,
  Search,
  Settings2,
} from "lucide-react";
import Controls from "@/components/Controls";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import InputManager from "@/components/InputManager";
import RSVPViewer from "@/components/RSVPViewer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectItem } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  getActiveOutlineIndex,
  getLineIndexForWord,
  parseDocument,
} from "@/lib/reader/parse";
import type { ReaderSettings, ReaderTheme, SourceMeta } from "@/lib/reader/types";

const STORAGE_THEME_KEY = "rsvp.theme";
const STORAGE_SETTINGS_KEY = "rsvp.settings";
const STORAGE_LAST_SOURCE_KEY = "rsvp.lastSource";

const DEFAULT_TEXT = `# RSVP Formatter

Rapid serial visual presentation (RSVP) displays words in sequence to reduce eye travel and increase reading speed.

## Why this matters

You can keep your visual focus stable and train your comprehension at progressively higher speeds.

## Quick start

1. Paste a long text or import a source.
2. Tune your speed and style.
3. Enter Reader mode and press play.

## Keyboard shortcuts

Space / K to play-pause, arrows to step, and [ ] to adjust speed.`;

const DEFAULT_SETTINGS: ReaderSettings = {
  mode: "orp-word",
  wpm: 320,
  fontFamily: "sans",
  fontSize: 6,
  lineHeight: 1.55,
  letterSpacing: 0.01,
  wordSpacing: 0.12,
  viewerBg: "#FFFFFF",
  viewerFg: "#1A1A1A",
  autoZenOnPlay: true,
  focusWindow: 2,
  chunkSize: 3,
};

const DEFAULT_SOURCE_META: SourceMeta = {
  kind: "paste",
  sourceTitle: "Starter text",
};

const THEMES: Array<{ value: ReaderTheme; label: string }> = [
  { value: "slate", label: "Slate" },
  { value: "linen", label: "Linen" },
  { value: "sepia", label: "Sepia" },
  { value: "midnight", label: "Midnight" },
  { value: "forest", label: "Forest" },
  { value: "dawn", label: "Dawn" },
  { value: "arctic", label: "Arctic" },
];

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const highlightMatches = (text: string, query: string) => {
  if (!query.trim()) return text;

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  return text.split(regex).map((chunk, index) => {
    if (chunk.toLowerCase() === query.toLowerCase()) {
      return (
        <mark key={`match-${index}`} className="rounded bg-primary/30 px-0.5 text-foreground">
          {chunk}
        </mark>
      );
    }

    return <span key={`chunk-${index}`}>{chunk}</span>;
  });
};

export default function Home() {
  const [viewMode, setViewMode] = useState<"workspace" | "reader">("workspace");
  const [theme, setTheme] = useState<ReaderTheme>("slate");
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);
  const [sourceMeta, setSourceMeta] = useState<SourceMeta>(DEFAULT_SOURCE_META);
  const [text, setText] = useState(DEFAULT_TEXT);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [readerSearchQuery, setReaderSearchQuery] = useState("");
  const [readerSearchOpen, setReaderSearchOpen] = useState(false);
  const [readerSettingsOpen, setReaderSettingsOpen] = useState(false);
  const [searchResultCursor, setSearchResultCursor] = useState(0);
  const [goToLine, setGoToLine] = useState("");
  const [zenMode, setZenMode] = useState(false);
  const [zenControlsVisible, setZenControlsVisible] = useState(true);
  const [workspaceExpanded, setWorkspaceExpanded] = useState(false);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  const previewLineRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const readerLineRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const parsed = useMemo(
    () => parseDocument(text, { htmlHeadings: sourceMeta.headings, wordsPerLine: 12 }),
    [sourceMeta.headings, text]
  );

  const words = parsed.words;
  const lines = parsed.lines;
  const outline = parsed.outline;

  const activeLineIndex = useMemo(() => getLineIndexForWord(lines, currentWordIndex), [lines, currentWordIndex]);
  const activeOutlineIndex = useMemo(
    () => getActiveOutlineIndex(outline, currentWordIndex),
    [outline, currentWordIndex]
  );

  const searchMatchedLineIndexes = useMemo(() => {
    const query = readerSearchQuery.trim().toLowerCase();
    if (!query) return [] as number[];

    return lines
      .map((line, lineIndex) => ({ line, lineIndex }))
      .filter(({ line }) => line.text.toLowerCase().includes(query))
      .map(({ lineIndex }) => lineIndex);
  }, [lines, readerSearchQuery]);

  const totalWords = words.length;
  const wordsRead = totalWords === 0 ? 0 : Math.min(currentWordIndex + 1, totalWords);
  const wordsLeft = Math.max(totalWords - wordsRead, 0);
  const estimatedTimeLeftInMinutes = totalWords > 0 ? Math.ceil(wordsLeft / settings.wpm) : 0;
  const progressPercentage = totalWords > 0 ? (wordsRead / totalWords) * 100 : 0;

  const safeSearchCursor = clamp(searchResultCursor, 0, Math.max(searchMatchedLineIndexes.length - 1, 0));

  useEffect(() => {
    let cancelled = false;

    const loadPreferences = () => {
      if (cancelled) return;

      try {
        const savedTheme = localStorage.getItem(STORAGE_THEME_KEY) as ReaderTheme | null;
        if (savedTheme && THEMES.some((option) => option.value === savedTheme)) {
          setTheme(savedTheme);
        }

        const savedSettings = localStorage.getItem(STORAGE_SETTINGS_KEY);
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings) as Partial<ReaderSettings>;
          setSettings((previous) => ({ ...previous, ...parsedSettings }));
        }

        const savedSourceKind = localStorage.getItem(STORAGE_LAST_SOURCE_KEY);
        if (savedSourceKind === "paste" || savedSourceKind === "upload" || savedSourceKind === "url" || savedSourceKind === "library") {
          setSourceMeta((previous) => ({ ...previous, kind: savedSourceKind }));
        }
      } catch (error) {
        console.error("Failed to load preferences:", error);
      } finally {
        setPreferencesLoaded(true);
      }
    };

    const frame = window.requestAnimationFrame(loadPreferences);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (!preferencesLoaded) return;
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(STORAGE_THEME_KEY, theme);
  }, [preferencesLoaded, theme]);

  useEffect(() => {
    if (!preferencesLoaded) return;
    localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
  }, [preferencesLoaded, settings]);

  useEffect(() => {
    if (!preferencesLoaded) return;
    localStorage.setItem(STORAGE_LAST_SOURCE_KEY, sourceMeta.kind);
  }, [preferencesLoaded, sourceMeta.kind]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        void registration.unregister();
      });
    });
  }, []);

  useEffect(() => {
    if (!isPlaying || words.length === 0) return;

    const step = settings.mode === "chunk" ? settings.chunkSize : 1;
    const currentWord = words[currentWordIndex] ?? "";
    const punctuationMultiplier = /[.,?!;:]/.test(currentWord) ? 1.35 : 1;
    const interval = (60000 / settings.wpm) * punctuationMultiplier;

    const timeout = window.setTimeout(() => {
      setCurrentWordIndex((index) => {
        const nextIndex = Math.min(index + step, words.length - 1);
        if (nextIndex >= words.length - 1) {
          setIsPlaying(false);
          setZenMode(false);
        }
        return nextIndex;
      });
    }, interval);

    return () => window.clearTimeout(timeout);
  }, [currentWordIndex, isPlaying, settings.chunkSize, settings.mode, settings.wpm, words]);

  useEffect(() => {
    if (!zenMode) return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const showTemporarily = () => {
      setZenControlsVisible(true);
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => setZenControlsVisible(false), 1200);
    };

    showTemporarily();
    window.addEventListener("mousemove", showTemporarily);
    return () => {
      window.removeEventListener("mousemove", showTemporarily);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [zenMode]);

  const syncLineScroll = useCallback((lineIndex: number, behavior: ScrollBehavior = "smooth") => {
    previewLineRefs.current[lineIndex]?.scrollIntoView({ behavior, block: "center" });
    readerLineRefs.current[lineIndex]?.scrollIntoView({ behavior, block: "center" });
  }, []);

  const jumpToWord = useCallback(
    (wordIndex: number, lineIndex?: number) => {
      if (words.length === 0) return;

      const safeWordIndex = clamp(wordIndex, 0, words.length - 1);
      setCurrentWordIndex(safeWordIndex);
      setIsPlaying(false);

      const resolvedLine = lineIndex ?? getLineIndexForWord(lines, safeWordIndex);
      syncLineScroll(resolvedLine, "smooth");
    },
    [lines, syncLineScroll, words.length]
  );

  const handlePlayPause = useCallback(() => {
    if (words.length === 0) return;

    if (currentWordIndex >= words.length - 1) {
      setCurrentWordIndex(0);
    }

    if (!isPlaying && viewMode === "reader" && settings.autoZenOnPlay) {
      setZenMode(true);
    }

    if (isPlaying) {
      setZenMode(false);
    }

    setIsPlaying((value) => !value);
  }, [currentWordIndex, isPlaying, settings.autoZenOnPlay, viewMode, words.length]);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setCurrentWordIndex(0);
    setZenMode(false);
  }, []);

  const handleTextChange = useCallback((nextText: string) => {
    setText(nextText);
    setCurrentWordIndex(0);
    setIsPlaying(false);
  }, []);

  const handleSourceMetaChange = useCallback((meta: SourceMeta) => {
    setSourceMeta((previous) => ({ ...previous, ...meta }));
  }, []);

  const handleSettingsChange = useCallback((patch: Partial<ReaderSettings>) => {
    setSettings((previous) => ({ ...previous, ...patch }));
  }, []);

  const handleResetStyle = useCallback(() => {
    setSettings((previous) => ({
      ...previous,
      fontFamily: DEFAULT_SETTINGS.fontFamily,
      fontSize: DEFAULT_SETTINGS.fontSize,
      lineHeight: DEFAULT_SETTINGS.lineHeight,
      letterSpacing: DEFAULT_SETTINGS.letterSpacing,
      wordSpacing: DEFAULT_SETTINGS.wordSpacing,
      viewerBg: DEFAULT_SETTINGS.viewerBg,
      viewerFg: DEFAULT_SETTINGS.viewerFg,
      focusWindow: DEFAULT_SETTINGS.focusWindow,
    }));
  }, []);

  const handleSearchStep = useCallback(
    (direction: 1 | -1) => {
      if (searchMatchedLineIndexes.length === 0) return;

      const nextCursor =
        direction === 1
          ? (safeSearchCursor + 1) % searchMatchedLineIndexes.length
          : (safeSearchCursor - 1 + searchMatchedLineIndexes.length) % searchMatchedLineIndexes.length;

      setSearchResultCursor(nextCursor);
      const lineIndex = searchMatchedLineIndexes[nextCursor];
      jumpToWord(lines[lineIndex]?.wordStartIndex ?? 0, lineIndex);
    },
    [jumpToWord, lines, safeSearchCursor, searchMatchedLineIndexes]
  );

  const handleGoToLine = useCallback(() => {
    if (!goToLine.trim()) return;

    const parsedLineNumber = Number(goToLine);
    if (Number.isNaN(parsedLineNumber)) return;

    const lineIndex = clamp(parsedLineNumber - 1, 0, Math.max(lines.length - 1, 0));
    const line = lines[lineIndex];
    if (!line) return;

    jumpToWord(line.wordStartIndex, lineIndex);
  }, [goToLine, jumpToWord, lines]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;

      if (event.code === "Escape") {
        if (zenMode) {
          event.preventDefault();
          setZenMode(false);
          return;
        }

        if (readerSettingsOpen) {
          event.preventDefault();
          setReaderSettingsOpen(false);
          return;
        }

        if (readerSearchOpen) {
          event.preventDefault();
          setReaderSearchOpen(false);
          return;
        }
      }

      if (isTyping) return;

      if (event.code === "Space" || event.code === "KeyK") {
        event.preventDefault();
        handlePlayPause();
        return;
      }

      if (event.code === "ArrowRight") {
        event.preventDefault();
        setIsPlaying(false);
        jumpToWord(currentWordIndex + 1);
        return;
      }

      if (event.code === "ArrowLeft") {
        event.preventDefault();
        setIsPlaying(false);
        jumpToWord(currentWordIndex - 1);
        return;
      }

      if (event.code === "BracketRight") {
        event.preventDefault();
        setSettings((previous) => ({ ...previous, wpm: clamp(previous.wpm + 20, 100, 1200) }));
        return;
      }

      if (event.code === "BracketLeft") {
        event.preventDefault();
        setSettings((previous) => ({ ...previous, wpm: clamp(previous.wpm - 20, 100, 1200) }));
        return;
      }

      if (event.code === "KeyF" && viewMode === "reader") {
        event.preventDefault();
        setReaderSearchOpen((value) => !value);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    currentWordIndex,
    handlePlayPause,
    jumpToWord,
    readerSearchOpen,
    readerSettingsOpen,
    viewMode,
    zenMode,
  ]);

  if (viewMode === "reader") {
    return (
      <div className="min-h-screen text-foreground">
        {!zenMode ? (
          <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur-sm">
            <div className="mx-auto flex w-full max-w-[120rem] flex-wrap items-center gap-2 px-4 py-3">
              <Button
                variant="outline"
                onClick={() => {
                  setViewMode("workspace");
                  setIsPlaying(false);
                  setZenMode(false);
                }}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>

              <Button variant={readerSearchOpen ? "secondary" : "ghost"} onClick={() => setReaderSearchOpen((value) => !value)}>
                <Search className="h-4 w-4" />
                Find
              </Button>

              <div className="w-44">
                <Select
                  value={settings.mode}
                  onValueChange={(value) => handleSettingsChange({ mode: value as ReaderSettings["mode"] })}
                >
                  <SelectItem value="orp-word">ORP word</SelectItem>
                  <SelectItem value="line-flow">Line flow</SelectItem>
                  <SelectItem value="chunk">Chunk</SelectItem>
                </Select>
              </div>

              <div className="flex flex-1 items-center justify-end gap-2">
                {readerSearchOpen ? (
                  <div className="flex min-w-[18rem] flex-1 items-center gap-2">
                    <Input
                      value={readerSearchQuery}
                      onChange={(event) => {
                        setReaderSearchQuery(event.target.value);
                        setSearchResultCursor(0);
                      }}
                      placeholder="Search lines"
                    />
                    <Button variant="outline" size="icon" onClick={() => handleSearchStep(-1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => handleSearchStep(1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {searchMatchedLineIndexes.length === 0
                        ? "0 results"
                        : `${safeSearchCursor + 1}/${searchMatchedLineIndexes.length}`}
                    </span>
                  </div>
                ) : null}

                <Button onClick={handlePlayPause}>
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {isPlaying ? "Pause" : "Play"}
                </Button>

                <Button variant="outline" onClick={() => setReaderSettingsOpen(true)}>
                  <Settings2 className="h-4 w-4" />
                  Settings
                </Button>

                <Button variant={zenMode ? "secondary" : "outline"} onClick={() => setZenMode((value) => !value)}>
                  <Focus className="h-4 w-4" />
                  Zen
                </Button>
              </div>
            </div>
          </header>
        ) : null}

        {!zenMode ? (
          <main className="mx-auto w-full max-w-[120rem] px-4 py-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Reader view</CardTitle>
                  <CardDescription>
                    Click any line to sync playback. Current source: {sourceMeta.sourceTitle ?? sourceMeta.kind}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[calc(100vh-12rem)] rounded-lg border border-border/80 bg-background/60 p-4">
                    <article
                      className="mx-auto max-w-4xl space-y-2"
                      style={{
                        fontFamily:
                          settings.fontFamily === "serif"
                            ? "var(--font-serif)"
                            : settings.fontFamily === "mono"
                              ? "var(--font-mono)"
                              : "var(--font-sans)",
                        lineHeight: settings.lineHeight,
                        letterSpacing: `${settings.letterSpacing}em`,
                        wordSpacing: `${settings.wordSpacing}em`,
                        fontSize: `${0.7 + settings.fontSize * 0.1}rem`,
                      }}
                    >
                      {lines.map((line, lineIndex) => {
                        const isActive = lineIndex === activeLineIndex;
                        const isSearchMatch =
                          readerSearchQuery.trim().length > 0 &&
                          line.text.toLowerCase().includes(readerSearchQuery.trim().toLowerCase());

                        return (
                          <button
                            key={`reader-${line.id}`}
                            ref={(element) => {
                              readerLineRefs.current[lineIndex] = element;
                            }}
                            type="button"
                            className={`block w-full rounded-md px-2 py-1 text-left transition-colors ${
                              isActive ? "bg-primary/15" : isSearchMatch ? "bg-accent/40" : "hover:bg-accent/25"
                            }`}
                            onClick={() => jumpToWord(line.wordStartIndex, lineIndex)}
                          >
                            {line.text.length > 0 ? highlightMatches(line.text, readerSearchQuery) : <span>&nbsp;</span>}
                          </button>
                        );
                      })}
                    </article>
                  </ScrollArea>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Outline</CardTitle>
                    <CardDescription>{outline.length} sections detected</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-72 rounded-lg border border-border/80 bg-background/60 p-2">
                      <div className="space-y-1">
                        {outline.map((item, index) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => jumpToWord(item.wordStartIndex, item.lineStartIndex)}
                            className={`flex w-full items-center rounded-md px-2 py-1 text-left text-sm transition-colors ${
                              index === activeOutlineIndex ? "bg-primary/15 text-primary" : "hover:bg-accent/30"
                            }`}
                            style={{ paddingLeft: `${0.5 + (item.level - 1) * 0.65}rem` }}
                          >
                            {item.label}
                          </button>
                        ))}

                        {outline.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No headings detected for this source yet.
                          </p>
                        ) : null}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Playback</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <p>
                      <span className="text-muted-foreground">Progress:</span> {Math.round(progressPercentage)}%
                    </p>
                    <p>
                      <span className="text-muted-foreground">Time left:</span> ~{estimatedTimeLeftInMinutes} min
                    </p>
                    <p>
                      <span className="text-muted-foreground">Word:</span> {wordsRead}/{totalWords}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        ) : null}

        {zenMode ? (
          <div className="fixed inset-0 z-[80] bg-background">
            <div className="mx-auto flex h-full w-full max-w-[90rem] items-center justify-center p-4">
              <RSVPViewer
                words={words}
                lines={lines}
                currentWordIndex={currentWordIndex}
                onWordClick={(wordIndex) => jumpToWord(wordIndex)}
                settings={settings}
                isPlaying={isPlaying}
                className="h-[70vh] w-full"
              />
            </div>

            {zenControlsVisible ? (
              <div className="pointer-events-none fixed inset-x-0 top-4 z-[90] flex justify-center">
                <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-border bg-card/95 px-2 py-2 shadow-lg">
                  <Button variant="outline" size="sm" onClick={() => setZenMode(false)}>
                    Exit Zen
                  </Button>
                  <Button size="sm" onClick={handlePlayPause}>
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    {isPlaying ? "Pause" : "Play"}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <Sheet open={readerSettingsOpen} onOpenChange={setReaderSettingsOpen}>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>Reader settings</SheetTitle>
              <SheetDescription>Customize theme, playback behavior, and typography.</SheetDescription>
            </SheetHeader>

            <div className="space-y-4">
              <div className="space-y-1">
                <Label>Theme</Label>
                <Select value={theme} onValueChange={(value) => setTheme(value as ReaderTheme)}>
                  {THEMES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Font family</Label>
                <Select
                  value={settings.fontFamily}
                  onValueChange={(value) => handleSettingsChange({ fontFamily: value as ReaderSettings["fontFamily"] })}
                >
                  <SelectItem value="sans">Sans</SelectItem>
                  <SelectItem value="serif">Serif</SelectItem>
                  <SelectItem value="mono">Mono</SelectItem>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Reading mode</Label>
                <Select
                  value={settings.mode}
                  onValueChange={(value) => handleSettingsChange({ mode: value as ReaderSettings["mode"] })}
                >
                  <SelectItem value="orp-word">ORP word</SelectItem>
                  <SelectItem value="line-flow">Line flow</SelectItem>
                  <SelectItem value="chunk">Chunk</SelectItem>
                </Select>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border/70 p-2">
                <Label htmlFor="auto-zen-sheet">Auto zen on play</Label>
                <Switch
                  id="auto-zen-sheet"
                  checked={settings.autoZenOnPlay}
                  onCheckedChange={(checked) => handleSettingsChange({ autoZenOnPlay: checked })}
                />
              </div>

              <Button variant="outline" className="w-full" onClick={handleResetStyle}>
                Reset typography and colors
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-foreground">
      <Header
        theme={theme}
        onThemeChange={setTheme}
        onOpenReader={() => {
          setViewMode("reader");
          setReaderSearchOpen(false);
          setReaderSettingsOpen(false);
        }}
      />

      <main className="mx-auto w-full max-w-[120rem] px-4 pb-6">
        <div
          className={`grid gap-4 ${
            workspaceExpanded
              ? "lg:grid-cols-[40rem_minmax(0,1fr)_22rem]"
              : "lg:grid-cols-[30rem_minmax(0,1fr)_22rem]"
          }`}
        >
          <section className="space-y-4 lg:sticky lg:top-3 lg:self-start">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">Source workspace</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setWorkspaceExpanded((value) => !value)}>
                    {workspaceExpanded ? "Compact" : "Expand"}
                  </Button>
                </div>
                <CardDescription>
                  Import one or more sources, merge them, and prepare text before opening Reader mode.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <InputManager
                  text={text}
                  onTextChange={handleTextChange}
                  onSourceMetaChange={handleSourceMetaChange}
                />
              </CardContent>
            </Card>
          </section>

          <section className="space-y-4">
            <div className="h-[27rem] w-full">
              <RSVPViewer
                words={words}
                lines={lines}
                currentWordIndex={currentWordIndex}
                onWordClick={(wordIndex) => jumpToWord(wordIndex)}
                settings={settings}
                isPlaying={isPlaying}
                className="h-full"
              />
            </div>

            <Controls
              settings={settings}
              isPlaying={isPlaying}
              isAtEnd={currentWordIndex >= Math.max(words.length - 1, 0)}
              progress={progressPercentage}
              timeLeft={estimatedTimeLeftInMinutes}
              onPlayPause={handlePlayPause}
              onReset={handleReset}
              onSettingsChange={handleSettingsChange}
              onResetStyle={handleResetStyle}
            />
          </section>

          <section className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Session summary</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md border border-border/70 bg-background/70 p-2">
                  <p className="text-xs text-muted-foreground">Source</p>
                  <p className="truncate font-medium">{sourceMeta.sourceTitle ?? sourceMeta.kind}</p>
                </div>
                <div className="rounded-md border border-border/70 bg-background/70 p-2">
                  <p className="text-xs text-muted-foreground">Mode</p>
                  <p className="font-medium">{settings.mode}</p>
                </div>
                <div className="rounded-md border border-border/70 bg-background/70 p-2">
                  <p className="text-xs text-muted-foreground">Words</p>
                  <p className="font-medium">{totalWords}</p>
                </div>
                <div className="rounded-md border border-border/70 bg-background/70 p-2">
                  <p className="text-xs text-muted-foreground">Read</p>
                  <p className="font-medium">{wordsRead}</p>
                </div>
                <div className="rounded-md border border-border/70 bg-background/70 p-2">
                  <p className="text-xs text-muted-foreground">URLs</p>
                  <p className="font-medium">{sourceMeta.sourceUrls?.length ?? 0}</p>
                </div>
                <div className="rounded-md border border-border/70 bg-background/70 p-2">
                  <p className="text-xs text-muted-foreground">Files</p>
                  <p className="font-medium">{sourceMeta.documents?.length ?? 0}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Outline</CardTitle>
                  <ListTree className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardDescription>{outline.length} sections mapped</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-44 rounded-lg border border-border/80 bg-background/70 p-2">
                  <div className="space-y-1">
                    {outline.map((item, index) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => jumpToWord(item.wordStartIndex, item.lineStartIndex)}
                        className={`flex w-full items-center rounded-md px-2 py-1 text-left text-sm transition-colors ${
                          index === activeOutlineIndex ? "bg-primary/15 text-primary" : "hover:bg-accent/30"
                        }`}
                        style={{ paddingLeft: `${0.5 + (item.level - 1) * 0.65}rem` }}
                      >
                        {item.label}
                      </button>
                    ))}

                    {outline.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No headings detected for this text.</p>
                    ) : null}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Line navigator</CardTitle>
                <CardDescription>
                  Click a line to jump playback. Use line number input for direct navigation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={goToLine}
                    onChange={(event) => setGoToLine(event.target.value)}
                    placeholder="Go to line..."
                  />
                  <Button variant="outline" onClick={handleGoToLine}>
                    <ChevronDown className="h-4 w-4" />
                    Go
                  </Button>
                </div>

                <ScrollArea className="h-72 rounded-lg border border-border/80 bg-background/70 p-1">
                  <div className="space-y-0.5">
                    {lines.map((line, lineIndex) => (
                      <button
                        key={`preview-${line.id}`}
                        ref={(element) => {
                          previewLineRefs.current[lineIndex] = element;
                        }}
                        type="button"
                        onClick={() => jumpToWord(line.wordStartIndex, lineIndex)}
                        className={`grid w-full grid-cols-[2.2rem_minmax(0,1fr)] items-start rounded-md px-2 py-1 text-left text-xs transition-colors ${
                          lineIndex === activeLineIndex ? "bg-primary/15" : "hover:bg-accent/25"
                        }`}
                      >
                        <span className="text-[11px] text-muted-foreground">{lineIndex + 1}</span>
                        <span className="truncate">{line.text || " "}</span>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
