"use client";

import { useCallback, useEffect, useState } from "react";
import { normalizeSettings } from "@/hooks/useReaderPreferences";
import type { Locale, ReaderBookmark, ReaderSettings, ReaderTheme, SavedReadingSession, SourceMeta } from "@/lib/reader/types";
import { readSessions, writeSessions } from "@/lib/storage/reader-storage";

const toId = () => `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

type SaveSessionInput = {
  id?: string | null;
  title: string;
  text: string;
  sourceMeta: SourceMeta;
  settings: ReaderSettings;
  theme: ReaderTheme;
  locale: Locale;
  currentWordIndex: number;
  bookmarks: ReaderBookmark[];
};

export function useReadingSessions() {
  const [sessions, setSessions] = useState<SavedReadingSession[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setSessions(readSessions().map((session) => ({ ...session, settings: normalizeSettings(session.settings), bookmarks: session.bookmarks ?? [] })));
      setLoaded(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    writeSessions(sessions);
  }, [loaded, sessions]);

  const saveSession = useCallback((input: SaveSessionInput) => {
    const now = new Date().toISOString();
    let savedId = input.id ?? toId();

    setSessions((previous) => {
      const existing = previous.find((session) => session.id === input.id);
      const nextSession: SavedReadingSession = {
        id: existing?.id ?? savedId,
        title: input.title.trim() || "Untitled session",
        text: input.text,
        sourceMeta: input.sourceMeta,
        settings: input.settings,
        theme: input.theme,
        locale: input.locale,
        currentWordIndex: input.currentWordIndex,
        bookmarks: input.bookmarks,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      savedId = nextSession.id;

      const withoutExisting = previous.filter((session) => session.id !== nextSession.id);
      return [nextSession, ...withoutExisting].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    });

    return savedId;
  }, []);

  const deleteSession = useCallback((id: string) => {
    setSessions((previous) => previous.filter((session) => session.id !== id));
  }, []);

  const duplicateSession = useCallback((id: string) => {
    const original = sessions.find((session) => session.id === id);
    if (!original) return null;

    const now = new Date().toISOString();
    const duplicate: SavedReadingSession = {
      ...original,
      id: toId(),
      title: `${original.title} copy`,
      createdAt: now,
      updatedAt: now,
    };
    setSessions((previous) => [duplicate, ...previous]);
    return duplicate.id;
  }, [sessions]);

  const renameSession = useCallback((id: string, title: string) => {
    const now = new Date().toISOString();
    setSessions((previous) =>
      previous.map((session) =>
        session.id === id
          ? { ...session, title: title.trim() || session.title, updatedAt: now }
          : session
      )
    );
  }, []);

  const clearSessions = useCallback(() => {
    setSessions([]);
  }, []);

  return {
    sessions,
    saveSession,
    deleteSession,
    duplicateSession,
    renameSession,
    clearSessions,
  };
}
