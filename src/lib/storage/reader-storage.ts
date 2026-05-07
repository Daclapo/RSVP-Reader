"use client";

import type { Locale, ReaderSettings, ReaderTheme, SavedReadingSession, SourceMeta } from "@/lib/reader/types";

export const STORAGE_THEME_KEY = "rsvp.theme";
export const STORAGE_SETTINGS_KEY = "rsvp.settings";
export const STORAGE_LAST_SOURCE_KEY = "rsvp.lastSource";
export const STORAGE_LOCALE_KEY = "rsvp.locale";
export const STORAGE_ACTIVE_TEXT_KEY = "rsvp.activeText";
export const STORAGE_ACTIVE_SOURCE_KEY = "rsvp.activeSource";
export const STORAGE_ACTIVE_WORD_KEY = "rsvp.activeWord";
export const STORAGE_ACTIVE_SESSION_KEY = "rsvp.activeSessionId";
export const STORAGE_SESSIONS_KEY = "rsvp.sessions";

const canUseStorage = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";
const ACTIVE_TEXT_STORAGE_LIMIT = 1_500_000;

const isQuotaError = (error: unknown) =>
  error instanceof DOMException && (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED");

export function readJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) return fallback;
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson<T>(key: string, value: T) {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    if (isQuotaError(error)) {
      console.warn(`Storage quota exceeded while writing ${key}.`);
      return;
    }
    console.warn(`Could not write ${key} to localStorage.`, error);
  }
}

export function readString(key: string, fallback = "") {
  if (!canUseStorage()) return fallback;
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeString(key: string, value: string) {
  if (!canUseStorage()) return;
  try {
    if (key === STORAGE_ACTIVE_TEXT_KEY && value.length > ACTIVE_TEXT_STORAGE_LIMIT) {
      localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(key, value);
  } catch (error) {
    if (isQuotaError(error)) {
      console.warn(`Storage quota exceeded while writing ${key}.`);
      return;
    }
    console.warn(`Could not write ${key} to localStorage.`, error);
  }
}

export function readSessions() {
  return readJson<SavedReadingSession[]>(STORAGE_SESSIONS_KEY, []);
}

export function writeSessions(sessions: SavedReadingSession[]) {
  writeJson(STORAGE_SESSIONS_KEY, sessions);
}

export function clearReaderStorage() {
  if (!canUseStorage()) return;
  Object.keys(localStorage)
    .filter((key) => key.startsWith("rsvp."))
    .forEach((key) => localStorage.removeItem(key));
}

export type PersistedReaderSnapshot = {
  theme: ReaderTheme;
  locale: Locale;
  settings: ReaderSettings;
  sourceMeta: SourceMeta;
  text: string;
  currentWordIndex: number;
  activeSessionId: string | null;
};
