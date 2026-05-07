"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { ReaderSettings } from "@/lib/reader/types";

const sentenceEndRegex = /[.!?]["')\]]?$/;

export const punctuationMultiplierFor = (word: string, mode: ReaderSettings["punctuationPause"]) => {
  if (mode === "off") return 1;
  if (sentenceEndRegex.test(word)) return mode === "strong" ? 1.9 : 1.45;
  if (/[,:;]["')\]]?$/.test(word)) return mode === "strong" ? 1.45 : 1.2;
  return 1;
};

export function useReaderPlayback({
  words,
  currentWordIndex,
  setCurrentWordIndex,
  settings,
  onEnd,
}: {
  words: string[];
  currentWordIndex: number;
  setCurrentWordIndex: Dispatch<SetStateAction<number>>;
  settings: ReaderSettings;
  onEnd?: () => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);

  const step = settings.mode === "chunk" ? settings.chunkSize : 1;

  useEffect(() => {
    if (!isPlaying || words.length === 0) return;
    if (settings.mode === "ebook" && !settings.ebookAutoHighlight) {
      return;
    }

    const currentWord = words[currentWordIndex] ?? "";
    const interval = (60000 / settings.wpm) * punctuationMultiplierFor(currentWord, settings.punctuationPause);

    const timeout = window.setTimeout(() => {
      setCurrentWordIndex((index) => {
        if (settings.mode === "ebook" && !settings.ebookAutoPageAdvance) {
          const ebookPageSize = settings.ebookWordsPerPage * (settings.ebookSpread === "double" ? 2 : 1);
          const pageEnd = Math.min(
            (Math.floor(index / ebookPageSize) + 1) * ebookPageSize - 1,
            words.length - 1
          );
          if (index >= pageEnd) {
            setIsPlaying(false);
            return index;
          }
        }

        const nextIndex = Math.min(index + step, words.length - 1);
        if (nextIndex >= words.length - 1) {
          setIsPlaying(false);
          onEnd?.();
        }
        return nextIndex;
      });
    }, interval);

    return () => window.clearTimeout(timeout);
  }, [
    currentWordIndex,
    isPlaying,
    onEnd,
    setCurrentWordIndex,
    settings.ebookAutoHighlight,
    settings.ebookAutoPageAdvance,
    settings.ebookSpread,
    settings.ebookWordsPerPage,
    settings.mode,
    settings.punctuationPause,
    settings.wpm,
    step,
    words,
  ]);

  const isAtEnd = currentWordIndex >= Math.max(words.length - 1, 0);

  const controls = useMemo(
    () => ({
      isPlaying,
      setIsPlaying,
      isAtEnd,
    }),
    [isAtEnd, isPlaying]
  );

  const stop = useCallback(() => setIsPlaying(false), []);

  return { ...controls, stop };
}
