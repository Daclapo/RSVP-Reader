"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Focus,
  ListTree,
  Pause,
  Play,
  Search,
  SkipBack,
  SkipForward,
} from "lucide-react";
import Controls from "@/components/Controls";
import BookmarksPanel from "@/components/BookmarksPanel";
import EbookViewer from "@/components/EbookViewer";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import InputManager from "@/components/InputManager";
import RSVPViewer from "@/components/RSVPViewer";
import SessionsPanel from "@/components/SessionsPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useReaderPlayback } from "@/hooks/useReaderPlayback";
import { normalizeSettings, useReaderPreferences } from "@/hooks/useReaderPreferences";
import { useReadingSessions } from "@/hooks/useReadingSessions";
import { localeLabels } from "@/lib/i18n/dictionaries";
import { useI18n } from "@/lib/i18n/useI18n";
import type { AppView } from "@/lib/navigation/types";
import { DEFAULT_SETTINGS, DEFAULT_SOURCE_META, DEFAULT_TEXT, DEFAULT_THEME } from "@/lib/reader/defaults";
import { readerFontStacks } from "@/lib/reader/fonts";
import { getPresetSettings } from "@/lib/reader/presets";
import { getActiveOutlineIndex, getLineIndexForWord, parseDocument } from "@/lib/reader/parse";
import { countWords } from "@/lib/reader/text-cleanup";
import type { Locale, ReaderBookmark, ReaderFontFamily, ReaderSettings, ReaderTheme, ReadingPreset, SavedReadingSession, SourceMeta } from "@/lib/reader/types";
import { clearReaderStorage, readJson, writeJson } from "@/lib/storage/reader-storage";

const THEMES: Array<{ value: ReaderTheme; label: string }> = [
  { value: "slate", label: "Slate" },
  { value: "linen", label: "Linen" },
  { value: "sepia", label: "Sepia" },
  { value: "midnight", label: "Midnight" },
  { value: "forest", label: "Forest" },
  { value: "dawn", label: "Dawn" },
  { value: "arctic", label: "Arctic" },
];

const FONT_OPTIONS: Array<{ value: ReaderFontFamily; label: string }> = [
  { value: "serif", label: "Serif" },
  { value: "sans", label: "Sans" },
  { value: "arial", label: "Arial" },
  { value: "open-sans", label: "Open Sans" },
  { value: "times", label: "Times New Roman" },
  { value: "georgia", label: "Georgia" },
  { value: "baskerville", label: "Baskerville" },
  { value: "garamond", label: "Garamond" },
  { value: "literata", label: "Literata" },
  { value: "merriweather", label: "Merriweather" },
  { value: "lora", label: "Lora" },
  { value: "crimson", label: "Crimson Text" },
  { value: "raleway", label: "Runway / Raleway" },
  { value: "mono", label: "Mono" },
];

const REPOSITORY_URL = "https://github.com/daclapo/RSVP-Reader";
const REPOSITORY_ZIP_URL = "https://github.com/daclapo/RSVP-Reader/archive/refs/heads/main.zip";
const LINE_PAGE_SIZE = 24;
const OUTLINE_PAGE_SIZE = 12;
const ACTIVE_BOOKMARKS_KEY = "rsvp.activeBookmarks";
const NAVIGATION_WORDS_PER_PAGE = 300;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const sentenceEndRegex = /[.!?]["')\]]?$/;
const defaultsForMode = (mode: ReaderSettings["mode"]): Partial<ReaderSettings> => {
  if (mode === "line-flow") return { wpm: 280, fontFamily: "sans" };
  if (mode === "chunk") return { wpm: 200, fontFamily: "serif" };
  if (mode === "ebook") return { wpm: 280, fontFamily: "serif", ebookAutoHighlight: true, ebookAutoPageAdvance: true, ebookLineMarker: true, ebookSpread: "double" };
  return { wpm: 300, fontFamily: "serif" };
};

export default function Home() {
  const {
    theme,
    setTheme,
    locale,
    setLocale,
    settings,
    setSettings,
    sourceMeta,
    setSourceMeta,
    text,
    setText,
    currentWordIndex,
    setCurrentWordIndex,
    activeSessionId,
    setActiveSessionId,
  } = useReaderPreferences();
  const t = useI18n(locale);
  const { sessions, saveSession, deleteSession, duplicateSession, renameSession, clearSessions } = useReadingSessions();

  const [activeView, setActiveView] = useState<AppView>("source");
  const [readerSearchQuery, setReaderSearchQuery] = useState("");
  const [searchResultCursor, setSearchResultCursor] = useState(0);
  const [goToLine, setGoToLine] = useState("");
  const [zenMode, setZenMode] = useState(false);
  const [zenControlsVisible, setZenControlsVisible] = useState(true);
  const [lineWindowStart, setLineWindowStart] = useState(0);
  const [outlineLimit, setOutlineLimit] = useState(OUTLINE_PAGE_SIZE);
  const [bookmarks, setBookmarks] = useState<ReaderBookmark[]>([]);
  const [bookmarksLoaded, setBookmarksLoaded] = useState(false);

  const previewLineRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const parsed = useMemo(
    () => parseDocument(text, { htmlHeadings: sourceMeta.headings, wordsPerLine: 18, markdownMode: sourceMeta.textFormat === "markdown" }),
    [sourceMeta.headings, sourceMeta.textFormat, text]
  );
  const words = parsed.words;
  const lines = parsed.lines;
  const outline = parsed.outline;

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? null,
    [activeSessionId, sessions]
  );
  const sessionTitle = activeSession?.title ?? sourceMeta.sourceTitle ?? t("unsavedSession");
  const activeLineIndex = useMemo(() => getLineIndexForWord(lines, currentWordIndex), [lines, currentWordIndex]);
  const activeOutlineIndex = useMemo(() => getActiveOutlineIndex(outline, currentWordIndex), [outline, currentWordIndex]);
  const visibleLines = useMemo(() => lines.slice(lineWindowStart, lineWindowStart + LINE_PAGE_SIZE), [lineWindowStart, lines]);

  const totalWords = words.length;
  const wordsRead = totalWords === 0 ? 0 : Math.min(currentWordIndex + 1, totalWords);
  const wordsLeft = Math.max(totalWords - wordsRead, 0);
  const estimatedTimeLeftInMinutes = totalWords > 0 ? Math.ceil(wordsLeft / settings.wpm) : 0;
  const progressPercentage = totalWords > 0 ? (wordsRead / totalWords) * 100 : 0;
  const navigationWordsPerPage = settings.mode === "ebook" ? Math.max(settings.ebookWordsPerPage, 80) : NAVIGATION_WORDS_PER_PAGE;
  const currentReadingPage = totalWords === 0 ? 1 : Math.floor(currentWordIndex / navigationWordsPerPage) + 1;
  const totalReadingPages = Math.max(Math.ceil(totalWords / navigationWordsPerPage), 1);

  const searchMatchedLineIndexes = useMemo(() => {
    const query = readerSearchQuery.trim().toLowerCase();
    if (!query) return [] as number[];

    return lines
      .map((line, lineIndex) => ({ line, lineIndex }))
      .filter(({ line }) => line.text.toLowerCase().includes(query))
      .map(({ lineIndex }) => lineIndex);
  }, [lines, readerSearchQuery]);
  const safeSearchCursor = clamp(searchResultCursor, 0, Math.max(searchMatchedLineIndexes.length - 1, 0));

  const playback = useReaderPlayback({
    words,
    currentWordIndex,
    setCurrentWordIndex,
    settings,
    onEnd: () => setZenMode(false),
  });

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        void registration.unregister();
      });
    });
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setBookmarks(readJson<ReaderBookmark[]>(ACTIVE_BOOKMARKS_KEY, []));
      setBookmarksLoaded(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!bookmarksLoaded) return;
    writeJson(ACTIVE_BOOKMARKS_KEY, bookmarks);
  }, [bookmarks, bookmarksLoaded]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (lines.length === 0) {
        setLineWindowStart(0);
        return;
      }

      setLineWindowStart((previous) => {
        const maxStart = Math.max(lines.length - LINE_PAGE_SIZE, 0);
        if (activeLineIndex < previous + 4) return clamp(activeLineIndex - 8, 0, maxStart);
        if (activeLineIndex >= previous + LINE_PAGE_SIZE - 4) return clamp(activeLineIndex - LINE_PAGE_SIZE + 9, 0, maxStart);
        return clamp(previous, 0, maxStart);
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeLineIndex, lines.length]);

  useEffect(() => {
    if (!zenMode) return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const showTemporarily = () => {
      setZenControlsVisible(true);
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => setZenControlsVisible(false), 1400);
    };

    showTemporarily();
    window.addEventListener("mousemove", showTemporarily);
    return () => {
      window.removeEventListener("mousemove", showTemporarily);
      if (timeoutId) clearTimeout(timeoutId);
      document.body.style.overflow = previousOverflow;
    };
  }, [zenMode]);

  const syncLineScroll = useCallback((lineIndex: number, behavior: ScrollBehavior = "smooth") => {
    previewLineRefs.current[lineIndex]?.scrollIntoView({ behavior, block: "center" });
  }, []);

  const jumpToWord = useCallback(
    (wordIndex: number, lineIndex?: number, options: { syncNavigator?: boolean } = {}) => {
      if (words.length === 0) return;

      const safeWordIndex = clamp(wordIndex, 0, words.length - 1);
      const resolvedLine = lineIndex ?? getLineIndexForWord(lines, safeWordIndex);
      setCurrentWordIndex(safeWordIndex);
      setLineWindowStart(clamp(resolvedLine - 8, 0, Math.max(lines.length - LINE_PAGE_SIZE, 0)));
      playback.stop();
      if (options.syncNavigator ?? true) {
        syncLineScroll(resolvedLine, "smooth");
      }
    },
    [lines, playback, setCurrentWordIndex, syncLineScroll, words.length]
  );

  const handlePlayPause = useCallback(() => {
    if (words.length === 0) return;
    if (!playback.isPlaying && settings.mode === "ebook" && !settings.ebookAutoHighlight) {
      toast.error("Enable auto highlight to play Ebook mode.");
      return;
    }

    if (currentWordIndex >= words.length - 1) {
      setCurrentWordIndex(0);
    }

    if (!playback.isPlaying && activeView === "reader" && settings.autoZenOnPlay) {
      setZenMode(true);
    }

    if (playback.isPlaying) {
      setZenMode(false);
    }

    playback.setIsPlaying((value) => !value);
  }, [activeView, currentWordIndex, playback, setCurrentWordIndex, settings.autoZenOnPlay, settings.ebookAutoHighlight, settings.mode, words.length]);

  const handleReset = useCallback(() => {
    playback.stop();
    setCurrentWordIndex(0);
    setZenMode(false);
  }, [playback, setCurrentWordIndex]);

  const handleTextChange = useCallback(
    (nextText: string) => {
      setText(nextText);
      setCurrentWordIndex(0);
      setLineWindowStart(0);
      setBookmarks([]);
      playback.stop();
    },
    [playback, setCurrentWordIndex, setText]
  );

  const handleSourceMetaChange = useCallback(
    (meta: SourceMeta) => {
      setSourceMeta((previous) => ({ ...previous, ...meta }));
    },
    [setSourceMeta]
  );

  const handleSettingsChange = useCallback(
    (patch: Partial<ReaderSettings>) => {
      setSettings((previous) => ({
        ...previous,
        ...(patch.mode && patch.mode !== previous.mode ? defaultsForMode(patch.mode) : null),
        ...patch,
        preset: patch.preset ?? "custom",
      }));
      if (patch.mode) {
        window.requestAnimationFrame(() => {
          document.getElementById("reader-view-top")?.scrollIntoView({ block: "start" });
        });
      }
    },
    [setSettings]
  );

  const handlePresetChange = useCallback(
    (preset: ReadingPreset) => {
      const presetSettings = getPresetSettings(preset);
      if (!presetSettings) {
        setSettings((previous) => ({ ...previous, preset: "custom" }));
        return;
      }

      setSettings((previous) => ({ ...previous, ...presetSettings, preset }));
    },
    [setSettings]
  );

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
      punctuationPause: DEFAULT_SETTINGS.punctuationPause,
      lineFlowWordHighlight: DEFAULT_SETTINGS.lineFlowWordHighlight,
      ebookAutoHighlight: DEFAULT_SETTINGS.ebookAutoHighlight,
      ebookAutoPageAdvance: DEFAULT_SETTINGS.ebookAutoPageAdvance,
      ebookLineMarker: DEFAULT_SETTINGS.ebookLineMarker,
      ebookSpread: DEFAULT_SETTINGS.ebookSpread,
      ebookSinglePageOrientation: DEFAULT_SETTINGS.ebookSinglePageOrientation,
      preset: "custom",
    }));
  }, [setSettings]);

  const handleClearLocalData = useCallback(() => {
    if (!window.confirm(t("clearLocalDataHint"))) return;
    playback.stop();
    clearReaderStorage();
    setText(DEFAULT_TEXT);
    setSourceMeta(DEFAULT_SOURCE_META);
    setSettings(DEFAULT_SETTINGS);
    setTheme(DEFAULT_THEME);
    setLocale("en");
    setCurrentWordIndex(0);
    setActiveSessionId(null);
    setBookmarks([]);
    clearSessions();
    setActiveView("source");
    toast.success(t("clearLocalDataConfirm"));
  }, [clearSessions, playback, setActiveSessionId, setCurrentWordIndex, setLocale, setSettings, setSourceMeta, setText, setTheme, t]);

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

  const handleReadingPageChange = useCallback(
    (page: number) => {
      if (!Number.isFinite(page) || words.length === 0) return;
      const safePage = clamp(Math.round(page), 1, totalReadingPages);
      jumpToWord((safePage - 1) * navigationWordsPerPage, undefined, { syncNavigator: false });
    },
    [jumpToWord, navigationWordsPerPage, totalReadingPages, words.length]
  );

  const handleProgressNavigate = useCallback(
    (progress: number) => {
      if (words.length === 0) return;
      const safeProgress = clamp(progress, 0, 100);
      const target = Math.round((safeProgress / 100) * Math.max(words.length - 1, 0));
      jumpToWord(target, undefined, { syncNavigator: false });
    },
    [jumpToWord, words.length]
  );

  const jumpSentence = useCallback(
    (direction: 1 | -1) => {
      if (words.length === 0) return;
      if (direction === 1) {
        const nextBoundary = words.findIndex((word, index) => index > currentWordIndex && sentenceEndRegex.test(word));
        jumpToWord(nextBoundary === -1 ? words.length - 1 : Math.min(nextBoundary + 1, words.length - 1));
        return;
      }

      for (let index = currentWordIndex - 2; index >= 0; index -= 1) {
        if (sentenceEndRegex.test(words[index])) {
          jumpToWord(Math.min(index + 1, words.length - 1));
          return;
        }
      }
      jumpToWord(0);
    },
    [currentWordIndex, jumpToWord, words]
  );

  const jumpParagraph = useCallback(
    (direction: 1 | -1) => {
      if (lines.length === 0) return;

      if (direction === 1) {
        const blankAfter = lines.findIndex((line, index) => index > activeLineIndex && line.text.trim() === "");
        const nextLine = blankAfter === -1 ? lines.length - 1 : lines.findIndex((line, index) => index > blankAfter && line.text.trim() !== "");
        const resolved = nextLine === -1 ? lines.length - 1 : nextLine;
        jumpToWord(lines[resolved]?.wordStartIndex ?? 0, resolved);
        return;
      }

      let previousBlank = -1;
      for (let index = activeLineIndex - 1; index >= 0; index -= 1) {
        if (lines[index].text.trim() === "") {
          previousBlank = index;
          break;
        }
      }
      if (previousBlank <= 0) {
        jumpToWord(0, 0);
        return;
      }
      let paragraphStart = 0;
      for (let index = previousBlank - 1; index >= 0; index -= 1) {
        if (lines[index].text.trim() === "") {
          paragraphStart = index + 1;
          break;
        }
      }
      jumpToWord(lines[paragraphStart]?.wordStartIndex ?? 0, paragraphStart);
    },
    [activeLineIndex, jumpToWord, lines]
  );

  const handleSaveSession = useCallback(
    (title: string, mode: "new" | "update" = "new") => {
      const id = saveSession({
        id: mode === "update" ? activeSessionId : null,
        title,
        text,
        sourceMeta: { ...sourceMeta, wordCount: totalWords },
        settings,
        theme,
        locale,
        currentWordIndex,
        bookmarks,
      });
      setActiveSessionId(id);
      toast.success(mode === "update" ? "Session updated." : "Session saved.");
    },
    [activeSessionId, bookmarks, currentWordIndex, locale, saveSession, setActiveSessionId, settings, sourceMeta, text, theme, totalWords]
  );

  const openSession = useCallback(
    (session: SavedReadingSession) => {
      playback.stop();
      setText(session.text);
      setSourceMeta(session.sourceMeta);
      setSettings(normalizeSettings(session.settings));
      setTheme(session.theme);
      setLocale(session.locale);
      setCurrentWordIndex(clamp(session.currentWordIndex, 0, Math.max(countWords(session.text) - 1, 0)));
      setBookmarks(session.bookmarks ?? []);
      setActiveSessionId(session.id);
      setActiveView("source");
    },
    [playback, setActiveSessionId, setCurrentWordIndex, setLocale, setSettings, setSourceMeta, setText, setTheme]
  );

  const handleNewSession = useCallback(() => {
    playback.stop();
    setText(DEFAULT_TEXT);
    setSourceMeta(DEFAULT_SOURCE_META);
    setSettings(DEFAULT_SETTINGS);
    setCurrentWordIndex(0);
    setActiveSessionId(null);
    setLineWindowStart(0);
    setBookmarks([]);
    setActiveView("source");
  }, [playback, setActiveSessionId, setCurrentWordIndex, setSettings, setSourceMeta, setText]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;

      if (event.code === "Escape" && zenMode) {
        event.preventDefault();
        setZenMode(false);
        return;
      }

      if (isTyping) return;

      if (event.code === "Space" || event.code === "KeyK") {
        event.preventDefault();
        handlePlayPause();
        return;
      }

      if (event.code === "ArrowRight") {
        event.preventDefault();
        if (settings.mode === "ebook") {
          handleReadingPageChange(currentReadingPage + (settings.ebookSpread === "double" ? 2 : 1));
          return;
        }
        jumpToWord(currentWordIndex + 1);
        return;
      }

      if (event.code === "ArrowLeft") {
        event.preventDefault();
        if (settings.mode === "ebook") {
          handleReadingPageChange(currentReadingPage - (settings.ebookSpread === "double" ? 2 : 1));
          return;
        }
        jumpToWord(currentWordIndex - 1);
        return;
      }

      if (event.code === "BracketRight") {
        event.preventDefault();
        setSettings((previous) => ({ ...previous, wpm: clamp(previous.wpm + 20, 100, 1200), preset: "custom" }));
        return;
      }

      if (event.code === "BracketLeft") {
        event.preventDefault();
        setSettings((previous) => ({ ...previous, wpm: clamp(previous.wpm - 20, 100, 1200), preset: "custom" }));
        return;
      }

      if (event.code === "KeyF" && activeView === "reader") {
        event.preventDefault();
        document.getElementById("reader-search")?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeView, currentReadingPage, currentWordIndex, handlePlayPause, handleReadingPageChange, jumpToWord, setSettings, settings.ebookSpread, settings.mode, zenMode]);

  const addBookmark = useCallback(() => {
    const lineIndex = getLineIndexForWord(lines, currentWordIndex);
    const label = `${t("bookmark")} ${bookmarks.length + 1}`;
    setBookmarks((previous) => [
      {
        id: `bookmark-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        label,
        wordIndex: currentWordIndex,
        lineIndex,
        createdAt: new Date().toISOString(),
      },
      ...previous,
    ]);
  }, [bookmarks.length, currentWordIndex, lines, t]);

  const renameBookmark = useCallback((id: string, label: string) => {
    setBookmarks((previous) => previous.map((bookmark) => (bookmark.id === id ? { ...bookmark, label } : bookmark)));
  }, []);

  const deleteBookmark = useCallback((id: string) => {
    setBookmarks((previous) => previous.filter((bookmark) => bookmark.id !== id));
  }, []);

  const goToBookmark = useCallback(
    (bookmark: ReaderBookmark) => {
      jumpToWord(bookmark.wordIndex, bookmark.lineIndex);
      setActiveView("reader");
    },
    [jumpToWord]
  );

  const jumpLineWindow = useCallback(
    (direction: 1 | -1) => {
      if (lines.length === 0) return;
      const nextStart = clamp(lineWindowStart + direction * LINE_PAGE_SIZE, 0, Math.max(lines.length - LINE_PAGE_SIZE, 0));
      setLineWindowStart(nextStart);
      jumpToWord(lines[nextStart]?.wordStartIndex ?? 0, nextStart);
    },
    [jumpToWord, lineWindowStart, lines]
  );

  const readerSurface = (
    <div className={settings.mode === "line-flow" ? "min-h-[24rem] lg:min-h-[32rem]" : ""}>
      {settings.mode === "ebook" ? (
        <EbookViewer
          rawText={parsed.rawText}
          words={words}
          outline={outline}
          currentWordIndex={currentWordIndex}
          settings={settings}
          isPlaying={playback.isPlaying}
          markdownMode={sourceMeta.textFormat === "markdown"}
          t={t}
          onWordClick={(wordIndex) => jumpToWord(wordIndex, undefined, { syncNavigator: false })}
          onPageChange={(wordIndex) => jumpToWord(wordIndex, undefined, { syncNavigator: false })}
        />
      ) : (
        <RSVPViewer
          words={words}
          lines={lines}
          currentWordIndex={currentWordIndex}
          onWordClick={(wordIndex) => jumpToWord(wordIndex, undefined, { syncNavigator: false })}
          settings={settings}
          isPlaying={playback.isPlaying}
          className={settings.mode === "line-flow" ? "h-full min-h-[24rem] lg:min-h-[32rem]" : "min-h-[26rem] lg:min-h-[32rem]"}
        />
      )}
    </div>
  );

  const transportButtons = (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => jumpSentence(-1)}>
        <SkipBack className="h-4 w-4" />
        {t("previousSentence")}
      </Button>
      <Button variant="outline" size="sm" onClick={() => jumpSentence(1)}>
        <SkipForward className="h-4 w-4" />
        {t("nextSentence")}
      </Button>
      <Button variant="outline" size="sm" onClick={() => jumpParagraph(-1)}>
        <ChevronLeft className="h-4 w-4" />
        {t("previousParagraph")}
      </Button>
      <Button variant="outline" size="sm" onClick={() => jumpParagraph(1)}>
        <ChevronRight className="h-4 w-4" />
        {t("nextParagraph")}
      </Button>
    </div>
  );

  const stats = [
    [t("currentSession"), sessionTitle],
    [t("source"), sourceMeta.sourceTitle ?? sourceMeta.kind],
    [t("words"), totalWords],
    [t("read"), wordsRead],
    [t("progress"), `${Math.round(progressPercentage)}%`],
    [t("timeLeft"), `~${estimatedTimeLeftInMinutes} ${t("minLeft")}`],
  ];

  const settingsPanel = (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings")}</CardTitle>
        <CardDescription>{sessionTitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{t("theme")}</Label>
            <Select value={theme} onValueChange={(value) => setTheme(value as ReaderTheme)}>
              {THEMES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("language")}</Label>
            <Select value={locale} onValueChange={(value) => setLocale(value as Locale)}>
              {(Object.keys(localeLabels) as Locale[]).map((option) => (
                <SelectItem key={option} value={option}>
                  {localeLabels[option]}
                </SelectItem>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{t("fontFamily")}</Label>
            <Select
              value={settings.fontFamily}
              onValueChange={(value) => handleSettingsChange({ fontFamily: value as ReaderSettings["fontFamily"] })}
            >
              {FONT_OPTIONS.map((font) => (
                <SelectItem key={font.value} value={font.value} style={{ fontFamily: readerFontStacks[font.value] }}>
                  {font.label}
                </SelectItem>
              ))}
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2">
            <Label htmlFor="auto-zen-sheet">{t("autoZen")}</Label>
            <Switch
              id="auto-zen-sheet"
              checked={settings.autoZenOnPlay}
              onCheckedChange={(checked) => handleSettingsChange({ autoZenOnPlay: checked })}
            />
          </div>
        </div>

        <Button className="h-9 self-start" variant="outline" onClick={handleResetStyle}>
          {t("resetStyle")}
        </Button>

        <section className="rounded-lg border border-destructive/30 bg-background/70 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold">{t("clearLocalData")}</h3>
              <p className="text-sm text-muted-foreground">{t("clearLocalDataHint")}</p>
            </div>
            <Button variant="outline" onClick={handleClearLocalData}>
              {t("clearLocalData")}
            </Button>
          </div>
        </section>
      </CardContent>
    </Card>
  );

  const renderSourceView = () => (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{t("sourceWorkspace")}</CardTitle>
            <CardDescription>{t("sourceWorkspaceHint")}</CardDescription>
          </div>
          <Button
            className="sm:self-center"
            disabled={words.length === 0 || text.trim().length === 0}
            onClick={() => setActiveView("reader")}
          >
            <Play className="h-4 w-4" />
            {t("goToReader")}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <InputManager text={text} sourceMeta={sourceMeta} onTextChange={handleTextChange} onSourceMetaChange={handleSourceMetaChange} locale={locale} t={t} />
      </CardContent>
    </Card>
  );

  const renderReaderView = () => (
    <div id="reader-view-top" className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>{t("reader")}</CardTitle>
              <CardDescription>{sessionTitle}</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handlePlayPause}>
                {playback.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {playback.isPlaying ? t("pause") : t("play")}
              </Button>
              <Button variant="outline" onClick={() => setZenMode(true)}>
                <Focus className="h-4 w-4" />
                {t("zen")}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {readerSurface}

          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {stats.map(([label, value]) => (
              <div key={String(label)} className="rounded-md border border-border/70 bg-background/70 p-2">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="truncate text-sm font-medium">{value}</p>
              </div>
            ))}
          </div>

          {transportButtons}
        </CardContent>
      </Card>

      <Controls
        settings={settings}
        isPlaying={playback.isPlaying}
        isAtEnd={playback.isAtEnd}
        progress={progressPercentage}
        timeLeft={estimatedTimeLeftInMinutes}
        currentPage={currentReadingPage}
        totalPages={totalReadingPages}
        t={t}
        onPlayPause={handlePlayPause}
        onReset={handleReset}
        onPageChange={handleReadingPageChange}
        onProgressChange={handleProgressNavigate}
        onSettingsChange={handleSettingsChange}
        onPresetChange={handlePresetChange}
        onResetStyle={handleResetStyle}
      />

      <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t("outline")}</CardTitle>
              <ListTree className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardDescription>{outline.length} {t("sections")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {outline.slice(0, outlineLimit).map((item, index) => (
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

            {outline.length === 0 ? <p className="text-sm text-muted-foreground">{t("emptyOutline")}</p> : null}
            {outlineLimit < outline.length ? (
              <Button variant="outline" size="sm" className="w-full" onClick={() => setOutlineLimit((value) => value + OUTLINE_PAGE_SIZE)}>
                {t("showMore")}
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("lineNavigator")}</CardTitle>
            <CardDescription>{lines.length} {t("lines")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input value={goToLine} onChange={(event) => setGoToLine(event.target.value)} placeholder={t("goToLine")} />
              <Button variant="outline" onClick={handleGoToLine}>
                {t("go")}
              </Button>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="reader-search"
                value={readerSearchQuery}
                onChange={(event) => {
                  setReaderSearchQuery(event.target.value);
                  setSearchResultCursor(0);
                }}
                placeholder={t("searchLines")}
                className="pl-9"
              />
            </div>
            {readerSearchQuery.trim() ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Button variant="outline" size="sm" onClick={() => handleSearchStep(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleSearchStep(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <span>
                  {searchMatchedLineIndexes.length === 0 ? `0 ${t("results")}` : `${safeSearchCursor + 1}/${searchMatchedLineIndexes.length}`}
                </span>
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>{activeLineIndex + 1} / {Math.max(lines.length, 1)}</span>
              <span>{t("page")} {currentReadingPage}/{totalReadingPages}</span>
            </div>

            <div className="max-h-[28rem] space-y-1 overflow-y-auto pr-2">
              {lines.map((line, lineIndex) => {
                return (
                <button
                  key={`preview-${line.id}`}
                  ref={(element) => {
                    previewLineRefs.current[lineIndex] = element;
                  }}
                  type="button"
                  onClick={() => jumpToWord(line.wordStartIndex, lineIndex)}
                  className={`grid w-full grid-cols-[2.5rem_minmax(0,1fr)] items-start rounded-md px-2 py-1 text-left text-xs transition-colors ${
                    lineIndex === activeLineIndex ? "bg-primary/15" : "hover:bg-accent/25"
                  }`}
                >
                  <span className="text-[11px] text-muted-foreground">{lineIndex + 1}</span>
                  <span className="truncate">{line.text || " "}</span>
                </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <BookmarksPanel bookmarks={bookmarks} t={t} onAdd={addBookmark} onGoTo={goToBookmark} onRename={renameBookmark} onDelete={deleteBookmark} />
        </CardContent>
      </Card>
    </div>
  );

  const renderClassicView = () => (
    <div className="grid gap-4 xl:grid-cols-[30rem_minmax(0,1fr)_24rem]">
      <section className="space-y-4">
        {renderSourceView()}
      </section>

      <section className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>{t("reader")}</CardTitle>
                <CardDescription>{sessionTitle}</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={handlePlayPause}>
                  {playback.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {playback.isPlaying ? t("pause") : t("play")}
                </Button>
                <Button variant="outline" onClick={() => setZenMode(true)}>
                  <Focus className="h-4 w-4" />
                  {t("zen")}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {readerSurface}
            {transportButtons}
          </CardContent>
        </Card>

        <Controls
          settings={settings}
          isPlaying={playback.isPlaying}
          isAtEnd={playback.isAtEnd}
          progress={progressPercentage}
          timeLeft={estimatedTimeLeftInMinutes}
          currentPage={currentReadingPage}
          totalPages={totalReadingPages}
          t={t}
          onPlayPause={handlePlayPause}
          onReset={handleReset}
          onPageChange={handleReadingPageChange}
          onProgressChange={handleProgressNavigate}
          onSettingsChange={handleSettingsChange}
          onPresetChange={handlePresetChange}
          onResetStyle={handleResetStyle}
        />
      </section>

      <section className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("sessionSummary")}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 text-sm">
            {stats.map(([label, value]) => (
              <div key={String(label)} className="rounded-md border border-border/70 bg-background/70 p-2">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="truncate font-medium">{value}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t("outline")}</CardTitle>
              <ListTree className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardDescription>{outline.length} {t("sections")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {outline.slice(0, OUTLINE_PAGE_SIZE).map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => jumpToWord(item.wordStartIndex, item.lineStartIndex)}
                className={`flex w-full items-center rounded-md px-2 py-1 text-left text-sm transition-colors ${
                  index === activeOutlineIndex ? "bg-primary/15 text-primary" : "hover:bg-accent/30"
                }`}
              >
                {item.label}
              </button>
            ))}
            {outline.length === 0 ? <p className="text-sm text-muted-foreground">{t("emptyOutline")}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("lineNavigator")}</CardTitle>
            <CardDescription>
              {lines.length === 0 ? "0" : `${lineWindowStart + 1}-${Math.min(lineWindowStart + LINE_PAGE_SIZE, lines.length)} / ${lines.length}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={lineWindowStart === 0} onClick={() => jumpLineWindow(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={lineWindowStart + LINE_PAGE_SIZE >= lines.length}
                onClick={() => jumpLineWindow(1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Input value={goToLine} onChange={(event) => setGoToLine(event.target.value)} placeholder={t("goToLine")} />
              <Button variant="outline" size="sm" onClick={handleGoToLine}>{t("go")}</Button>
            </div>

            <div className="space-y-1">
              {visibleLines.slice(0, 14).map((line, offset) => {
                const lineIndex = lineWindowStart + offset;
                return (
                  <button
                    key={`classic-preview-${line.id}`}
                    type="button"
                    onClick={() => jumpToWord(line.wordStartIndex, lineIndex)}
                    className={`grid w-full grid-cols-[2.3rem_minmax(0,1fr)] items-start rounded-md px-2 py-1 text-left text-xs transition-colors ${
                      lineIndex === activeLineIndex ? "bg-primary/15" : "hover:bg-accent/25"
                    }`}
                  >
                    <span className="text-[11px] text-muted-foreground">{lineIndex + 1}</span>
                    <span className="truncate">{line.text || " "}</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <BookmarksPanel bookmarks={bookmarks} t={t} onAdd={addBookmark} onGoTo={goToBookmark} onRename={renameBookmark} onDelete={deleteBookmark} />
          </CardContent>
        </Card>
      </section>
    </div>
  );

  const renderSessionsView = () => (
    <Card>
      <CardHeader>
        <CardTitle>{t("sessions")}</CardTitle>
        <CardDescription>{t("currentSession")}: {sessionTitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <SessionsPanel
          sessions={sessions}
          activeSessionId={activeSessionId}
          defaultTitle={sessionTitle}
          t={t}
          onSave={handleSaveSession}
          onOpen={openSession}
          onRename={renameSession}
          onDuplicate={(id) => {
            const newId = duplicateSession(id);
            if (newId) toast.success("Session duplicated.");
          }}
          onDelete={(id) => {
            deleteSession(id);
            if (id === activeSessionId) setActiveSessionId(null);
          }}
          onNew={handleNewSession}
        />
      </CardContent>
    </Card>
  );

  const renderInstallView = () => (
    <Card>
      <CardHeader>
        <CardTitle>{t("install")}</CardTitle>
        <CardDescription>Download RSVP Reader and run it locally, with or without an internet connection after setup.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <a
            href={REPOSITORY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-accent/40"
          >
            <ExternalLink className="h-4 w-4" />
            {t("repository")}
          </a>
          <a
            href={REPOSITORY_ZIP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-accent/40"
          >
            <Download className="h-4 w-4" />
            {t("downloadZip")}
          </a>
        </div>

        <section className="border-t border-border/70 pt-5">
          <h3 className="mb-2 text-base font-semibold">{t("requirements")}</h3>
          <p className="max-w-4xl text-sm leading-6 text-muted-foreground">
            Install Node.js from nodejs.org using the LTS installer for your operating system. npm is included with Node.js. After installing, open a terminal and run <code>node -v</code> and <code>npm -v</code> to confirm both are available.
          </p>
        </section>

        <section className="border-t border-border/70 pt-5">
          <h3 className="mb-2 text-base font-semibold">Non-technical flow</h3>
          <p className="max-w-4xl text-sm leading-6 text-muted-foreground">
            Download the ZIP, unzip it, open the folder in a terminal, run the commands below, and then open http://localhost:3000. Once dependencies are installed, the app runs from your own computer and keeps sessions in your browser.
          </p>
        </section>

        <section className="border-t border-border/70 pt-5">
          <h3 className="mb-2 text-base font-semibold">{t("commands")}</h3>
          <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm"><code>{`git clone ${REPOSITORY_URL}.git
cd RSVP-Reader
npm install
npm run dev

# production
npm run build
npm run start`}</code></pre>
        </section>

        <section className="border-t border-border/70 pt-5">
          <h3 className="mb-2 text-base font-semibold">Project and contributions</h3>
          <p className="max-w-4xl text-sm leading-6 text-muted-foreground">
            The repository includes the full source, documentation, and Vercel-ready Next.js setup. Issues, ideas, reading-mode improvements, and public-domain source additions are welcome.
          </p>
        </section>
      </CardContent>
    </Card>
  );

  const renderDocsView = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("docs")}</CardTitle>
          <CardDescription>
            {locale === "es"
              ? "Guía práctica para preparar textos, leer, navegar y guardar progreso."
              : "A practical guide for preparing text, reading, navigating, and keeping progress."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {(locale === "es"
            ? [
                ["Flujo recomendado", "Empieza en Fuente: pega texto, sube archivos, carga una URL o abre un libro de la biblioteca. Limpia el texto solo cuando quieras modificar la copia activa; si pegas Markdown, marca Markdown para que el índice y Ebook respeten encabezados."],
                ["Modos de lectura", "ORP centra una palabra con punto óptimo; Flujo por líneas mantiene contexto; Bloques agrupa varias palabras; Ebook muestra páginas fijas con una o dos caras, orientación vertical u horizontal, resaltado automático y marcador de línea."],
                ["Navegación", "Usa la barra de progreso como slider, el campo de página, el índice, búsqueda, saltos por frase o párrafo, navegador de líneas y marcadores. En Ebook, las flechas izquierda/derecha pasan página."],
                ["Atajos", "Espacio o K reproduce/pausa. Flecha derecha/izquierda avanza o retrocede; en Ebook cambia página. [ y ] bajan/suben la velocidad. F enfoca búsqueda en Reader. Esc sale de Zen."],
                ["Sesiones y marcadores", "Guarda una sesión para conservar texto, fuente, modo, WPM, tema, idioma, progreso y marcadores. Los marcadores son locales y sirven para volver a puntos importantes del libro."],
                ["Ajustes útiles", "Usa preajustes para arrancar rápido, cambia fuente y espaciado según el texto, deja serif para Ebook/ORP y sans para flujo si buscas estabilidad visual, y limpia la caché desde Ajustes si quieres reiniciar todo."],
                ["Zen", "Zen elimina distracciones y conserva controles compactos. En Ebook usa la misma paginación que Reader para evitar cortes y permite seguir leyendo por páginas fijas."],
                ["Solución de problemas", "Si una URL no importa bien, la página puede bloquear extracción o tener contenido dinámico. Prueba pegar el texto manualmente. Si el índice detecta demasiado, marca el texto como Markdown y usa encabezados claros."],
              ]
            : [
                ["Recommended workflow", "Start in Source: paste text, upload files, load a URL, or open a public-domain book. Clean text only when you want to change the active copy; if you paste Markdown, mark it as Markdown so outlines and Ebook can use headings."],
                ["Reading modes", "ORP centers one word with an optimal recognition point; Line flow keeps context; Chunk groups words; Ebook shows fixed pages with one or two faces, portrait or landscape, auto-highlight, and a line marker."],
                ["Navigation", "Use the progress bar as a slider, the page field, outline, search, sentence/paragraph jumps, line navigator, and bookmarks. In Ebook, left/right arrows turn pages."],
                ["Shortcuts", "Space or K plays/pauses. ArrowRight/ArrowLeft steps words, or pages in Ebook. [ and ] decrease/increase speed. F focuses search in Reader. Esc exits Zen."],
                ["Sessions and bookmarks", "Save a session to keep text, source, mode, WPM, theme, language, progress, and bookmarks. Bookmarks are local and let you return to important positions."],
                ["Useful settings", "Use presets to start quickly, adjust font and spacing per source, keep serif for Ebook/ORP and sans for line flow when you want stable metrics, and clear cache from Settings when you want a full reset."],
                ["Zen", "Zen removes distractions and keeps compact controls. Ebook uses the same pagination as Reader to avoid clipped lines and preserve fixed pages."],
                ["Troubleshooting", "If URL import fails, the page may block extraction or render content dynamically. Paste manually as a fallback. If outline detection is noisy, set the source as Markdown and use clear headings."],
              ]
          ).map(([title, body], index) => (
            <section key={title} className={index === 0 ? "" : "border-t border-border/70 pt-5"}>
              <h3 className="mb-2 text-base font-semibold">{title}</h3>
              <p className="max-w-5xl text-sm leading-6 text-muted-foreground">{body}</p>
            </section>
          ))}
        </CardContent>
      </Card>
    </div>
  );

  const renderActiveView = () => {
    if (activeView === "reader") return renderReaderView();
    if (activeView === "classic") return renderClassicView();
    if (activeView === "sessions") return renderSessionsView();
    if (activeView === "settings") return settingsPanel;
    if (activeView === "docs") return renderDocsView();
    if (activeView === "install") return renderInstallView();
    return renderSourceView();
  };

  return (
    <div className="flex min-h-screen flex-col text-foreground">
      <Header
        theme={theme}
        locale={locale}
        activeView={activeView}
        t={t}
        onThemeChange={setTheme}
        onLocaleChange={setLocale}
        onViewChange={setActiveView}
      />

      <main className="mx-auto w-full max-w-[120rem] flex-1 px-4 pb-8">
        {renderActiveView()}
      </main>

      {zenMode ? (
        <div className="fixed inset-0 z-[80] overflow-hidden bg-background">
          <div className={`mx-auto flex h-full w-full max-w-[90rem] p-4 ${settings.mode === "ebook" ? "items-start justify-center overflow-y-auto pt-16" : "items-center justify-center overflow-hidden"}`}>
            {settings.mode === "ebook" ? (
              <EbookViewer
                rawText={parsed.rawText}
                words={words}
                outline={outline}
                currentWordIndex={currentWordIndex}
                settings={settings}
                isPlaying={playback.isPlaying}
                compact
                markdownMode={sourceMeta.textFormat === "markdown"}
                t={t}
                onWordClick={(wordIndex) => jumpToWord(wordIndex, undefined, { syncNavigator: false })}
                onPageChange={(wordIndex) => jumpToWord(wordIndex, undefined, { syncNavigator: false })}
              />
            ) : (
              <RSVPViewer
                words={words}
                lines={lines}
                currentWordIndex={currentWordIndex}
                onWordClick={(wordIndex) => jumpToWord(wordIndex, undefined, { syncNavigator: false })}
                settings={settings}
                isPlaying={playback.isPlaying}
                className="h-[70vh] w-full"
              />
            )}
          </div>

          {zenControlsVisible ? (
            <div className="pointer-events-none fixed inset-x-0 top-4 z-[90] flex justify-center px-3">
              <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-full border border-border bg-card/95 px-2 py-2 shadow-lg">
                <Button variant="outline" size="sm" className="ml-1" onClick={() => setZenMode(false)}>
                  {t("exitZen")}
                </Button>
                <Button variant="outline" size="icon" onClick={() => jumpSentence(-1)} aria-label={t("previousSentence")}>
                  <SkipBack className="h-4 w-4" />
                </Button>
                <Button size="sm" onClick={handlePlayPause}>
                  {playback.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {playback.isPlaying ? t("pause") : t("play")}
                </Button>
                <Button variant="outline" size="icon" onClick={() => jumpSentence(1)} aria-label={t("nextSentence")}>
                  <SkipForward className="h-4 w-4" />
                </Button>
                <span className="px-2 text-xs text-muted-foreground">{settings.wpm} WPM · {Math.round(progressPercentage)}%</span>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <Footer />
    </div>
  );
}
