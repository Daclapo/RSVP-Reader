"use client";

import { useEffect, useState } from "react";
import { DEFAULT_SETTINGS, DEFAULT_SOURCE_META, DEFAULT_TEXT, DEFAULT_THEME } from "@/lib/reader/defaults";
import type { Locale, ReaderFontFamily, ReaderSettings, ReaderTheme, SourceMeta } from "@/lib/reader/types";
import {
  readJson,
  readString,
  STORAGE_ACTIVE_SESSION_KEY,
  STORAGE_ACTIVE_SOURCE_KEY,
  STORAGE_ACTIVE_TEXT_KEY,
  STORAGE_ACTIVE_WORD_KEY,
  STORAGE_LAST_SOURCE_KEY,
  STORAGE_LOCALE_KEY,
  STORAGE_SETTINGS_KEY,
  STORAGE_THEME_KEY,
  writeJson,
  writeString,
} from "@/lib/storage/reader-storage";

const isTheme = (value: string | null): value is ReaderTheme =>
  value === "slate" ||
  value === "linen" ||
  value === "sepia" ||
  value === "midnight" ||
  value === "forest" ||
  value === "dawn" ||
  value === "arctic";

const isLocale = (value: string | null): value is Locale => value === "en" || value === "es";
const isReaderFontFamily = (value: unknown): value is ReaderFontFamily =>
  value === "sans" ||
  value === "serif" ||
  value === "mono" ||
  value === "times" ||
  value === "arial" ||
  value === "open-sans" ||
  value === "georgia" ||
  value === "baskerville" ||
  value === "garamond" ||
  value === "literata" ||
  value === "merriweather" ||
  value === "lora" ||
  value === "crimson" ||
  value === "raleway";

export function normalizeSettings(settings: Partial<ReaderSettings>): ReaderSettings {
  const savedWpm = Number(settings.wpm);
  const wpm = Number.isFinite(savedWpm) && savedWpm >= 100 && savedWpm <= 900 ? savedWpm : DEFAULT_SETTINGS.wpm;
  const fontFamily = isReaderFontFamily(settings.fontFamily)
    ? settings.fontFamily
    : settings.fontFamily === "libre-baskerville"
      ? "baskerville"
      : DEFAULT_SETTINGS.fontFamily;

  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    wpm,
    fontFamily,
    preset: settings.preset ?? "custom",
    punctuationPause: settings.punctuationPause ?? DEFAULT_SETTINGS.punctuationPause,
    lineFlowWordHighlight: settings.lineFlowWordHighlight ?? DEFAULT_SETTINGS.lineFlowWordHighlight,
    ebookWordsPerPage: settings.ebookWordsPerPage ?? DEFAULT_SETTINGS.ebookWordsPerPage,
    ebookAutoHighlight: settings.ebookAutoHighlight ?? DEFAULT_SETTINGS.ebookAutoHighlight,
    ebookAutoPageAdvance: settings.ebookAutoPageAdvance ?? DEFAULT_SETTINGS.ebookAutoPageAdvance,
    ebookLineMarker: settings.ebookLineMarker ?? DEFAULT_SETTINGS.ebookLineMarker,
    ebookSpread: settings.ebookSpread ?? DEFAULT_SETTINGS.ebookSpread,
    ebookSinglePageOrientation: settings.ebookSinglePageOrientation ?? DEFAULT_SETTINGS.ebookSinglePageOrientation,
  };
}

export function useReaderPreferences() {
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [theme, setTheme] = useState<ReaderTheme>(DEFAULT_THEME);
  const [locale, setLocale] = useState<Locale>("en");
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);
  const [sourceMeta, setSourceMeta] = useState<SourceMeta>(DEFAULT_SOURCE_META);
  const [text, setText] = useState(DEFAULT_TEXT);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const savedTheme = readString(STORAGE_THEME_KEY, DEFAULT_THEME);
      if (isTheme(savedTheme)) setTheme(savedTheme);

      const savedLocale = readString(STORAGE_LOCALE_KEY, "en");
      if (isLocale(savedLocale)) setLocale(savedLocale);

      setSettings(normalizeSettings(readJson<Partial<ReaderSettings>>(STORAGE_SETTINGS_KEY, DEFAULT_SETTINGS)));

      const savedText = readString(STORAGE_ACTIVE_TEXT_KEY, "");
      if (savedText.trim()) setText(savedText);

      const savedSource = readJson<SourceMeta | null>(STORAGE_ACTIVE_SOURCE_KEY, null);
      const savedSourceKind = readString(STORAGE_LAST_SOURCE_KEY, "");
      if (savedSource) {
        setSourceMeta(savedSource);
      } else if (savedSourceKind === "paste" || savedSourceKind === "upload" || savedSourceKind === "url" || savedSourceKind === "wikipedia" || savedSourceKind === "library") {
        setSourceMeta((previous) => ({ ...previous, kind: savedSourceKind }));
      }

      const savedWordIndex = Number(readString(STORAGE_ACTIVE_WORD_KEY, "0"));
      if (Number.isFinite(savedWordIndex) && savedWordIndex >= 0) {
        setCurrentWordIndex(savedWordIndex);
      }

      const savedSessionId = readString(STORAGE_ACTIVE_SESSION_KEY, "");
      setActiveSessionId(savedSessionId || null);
      setPreferencesLoaded(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!preferencesLoaded) return;
    document.documentElement.dataset.theme = theme;
    writeString(STORAGE_THEME_KEY, theme);
  }, [preferencesLoaded, theme]);

  useEffect(() => {
    if (!preferencesLoaded) return;
    writeString(STORAGE_LOCALE_KEY, locale);
  }, [preferencesLoaded, locale]);

  useEffect(() => {
    if (!preferencesLoaded) return;
    writeJson(STORAGE_SETTINGS_KEY, settings);
  }, [preferencesLoaded, settings]);

  useEffect(() => {
    if (!preferencesLoaded) return;
    writeString(STORAGE_ACTIVE_TEXT_KEY, text);
  }, [preferencesLoaded, text]);

  useEffect(() => {
    if (!preferencesLoaded) return;
    writeJson(STORAGE_ACTIVE_SOURCE_KEY, sourceMeta);
    writeString(STORAGE_LAST_SOURCE_KEY, sourceMeta.kind);
  }, [preferencesLoaded, sourceMeta]);

  useEffect(() => {
    if (!preferencesLoaded) return;
    writeString(STORAGE_ACTIVE_WORD_KEY, String(currentWordIndex));
  }, [currentWordIndex, preferencesLoaded]);

  useEffect(() => {
    if (!preferencesLoaded) return;
    writeString(STORAGE_ACTIVE_SESSION_KEY, activeSessionId ?? "");
  }, [activeSessionId, preferencesLoaded]);

  return {
    preferencesLoaded,
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
  };
}
