'use client'; // This is a client component

import { useState, useEffect } from 'react';
import RSVPViewer from '@/components/RSVPViewer';
import Controls from '@/components/Controls';
import InputManager from '@/components/InputManager';

const DEFAULT_TEXT = "This is a sample text for the RSVP formatter. You can replace this by typing your own, uploading a file, or fetching from a URL.";

export default function Home() {
  const [text, setText] = useState<string>(DEFAULT_TEXT);
  const [words, setWords] = useState<string[]>([]);
  const [wpm, setWpm] = useState<number>(300);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(0);

  // Effect to split text into words
  useEffect(() => {
    if (text) {
      setWords(text.trim().split(/\s+/));
      setCurrentWordIndex(0); // Reset index when text changes
    } else {
      setWords([]);
    }
  }, [text]);

  // Effect for RSVP playback logic
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isPlaying && currentWordIndex < words.length) {
      const intervalDuration = 60000 / wpm;
      interval = setInterval(() => {
        setCurrentWordIndex((prevIndex) => prevIndex + 1);
      }, intervalDuration);
    } else if (currentWordIndex >= words.length && words.length > 0) {
      setIsPlaying(false); // Stop when text ends
    }

    return () => {
      clearInterval(interval);
    };
  }, [isPlaying, wpm, currentWordIndex, words.length]);
  
  const handlePlayPause = () => {
    if (words.length > 0) {
      // If at the end, reset before playing
      if (currentWordIndex >= words.length - 1) {
        setCurrentWordIndex(0);
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentWordIndex(0);
  };
  
  const handleWpmChange = (newWpm: number) => {
    setWpm(newWpm);
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-8 md:p-12 lg:p-24 bg-white dark:bg-gray-900">
      <div className="w-full max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-center text-gray-900 dark:text-gray-100 mb-8">
          RSVP Formatter
        </h1>
        <div className="space-y-6">
          <RSVPViewer word={words[currentWordIndex]} />
          <Controls
            wpm={wpm}
            isPlaying={isPlaying}
            onWpmChange={handleWpmChange}
            onPlayPause={handlePlayPause}
            onReset={handleReset}
            isAtEnd={currentWordIndex >= words.length -1 && words.length > 0}
          />
          <InputManager text={text} onTextChange={setText} />
        </div>
      </div>
    </main>
  );
}
