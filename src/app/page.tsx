'use client'; // This is a client component

import { useState, useEffect } from 'react';
import RSVPViewer from '@/components/RSVPViewer';
import Controls from '@/components/Controls';
import InputManager from '@/components/InputManager';


const DEFAULT_TEXT = "This is a sample text for the RSVP formatter. You can replace this by typing your own, uploading a file, or fetching from a URL.";

import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function Home() {
  const [text, setText] = useState<string>(DEFAULT_TEXT);
  const [words, setWords] = useState<string[]>([]);
  const [wpm, setWpm] = useState<number>(300);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(0);
  const [showContext, setShowContext] = useState<boolean>(false);
  const [contextLinesToShow, setContextLinesToShow] = useState<number>(1); // Default to 1 line before and after

  // Effect to process text into words
  useEffect(() => {
    const wordsArray = text.split(/\s+/).filter(word => word.length > 0);
    setWords(wordsArray);
    setCurrentWordIndex(0); // Reset index when text changes
    setIsPlaying(false); // Stop playing when text changes
  }, [text]);

  // Effect for RSVP playback logic
  useEffect(() => {
    console.log('Playback useEffect triggered:', { isPlaying, wpm, currentWordIndex, wordsLength: words.length });
    let interval: NodeJS.Timeout | undefined;

    if (isPlaying && currentWordIndex < words.length) {
      const PUNCTUATION_PAUSE_MULTIPLIER = 1.5;
      const baseInterval = 60000 / wpm;
      const currentWord = words[currentWordIndex];
      // Check for common sentence-ending or significant punctuation marks
      const hasPunctuation = /[.,—?!;:]/.test(currentWord);
      
      let intervalDuration = baseInterval;
      if (hasPunctuation) {
        intervalDuration *= PUNCTUATION_PAUSE_MULTIPLIER;
      }
      console.log(`Setting interval for word "${currentWord}" (${intervalDuration}ms)`);
      interval = setInterval(() => {
        setCurrentWordIndex((prevIndex) => {
          console.log('setCurrentWordIndex from interval:', prevIndex + 1);
          if (prevIndex >= words.length - 1) {
            setIsPlaying(false); // Stop when text ends
            return prevIndex; // Don't increment past the end
          }
          return prevIndex + 1;
        });
      }, intervalDuration);
    } else if (currentWordIndex >= words.length -1 && words.length > 0) {
      console.log('Playback ended, setting isPlaying to false.');
      setIsPlaying(false); // Ensure playback stops at the very end
    }

    return () => {
      console.log('Cleanup: clearing interval.');
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, wpm, currentWordIndex, words.length]); // words.length is sufficient as dependency here, not the whole words array
  
  const handlePlayPause = () => {
    console.log('handlePlayPause called. Current isPlaying:', isPlaying);
    if (words.length > 0) {
      // If at the end, reset before playing
      if (currentWordIndex >= words.length - 1) {
        console.log('At end of text, resetting index to 0.');
        setCurrentWordIndex(0);
      }
      setIsPlaying((prev) => {
        console.log('setIsPlaying toggled to:', !prev);
        return !prev;
      });
    } else {
      console.log('handlePlayPause: words array is empty, doing nothing.');
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentWordIndex(0);
  };
  
  const handleWpmChange = (newWpm: number) => {
    setWpm(newWpm);
  };

  const handleToggleContext = () => {
    setShowContext(prev => !prev);
  }

  const handleWordClick = (wordIndex: number) => {
    setCurrentWordIndex(wordIndex);
    // If it was playing, keep playing. If paused, stay paused.
    // We don't want to auto-play if the user clicked on a word while paused.
  }

  const handleContextLinesChange = (lines: number) => {
    setContextLinesToShow(lines);
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Header />
      <main className="flex-grow flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-2xl mx-auto space-y-6">
          <div className="w-full h-96">
            <RSVPViewer words={words} currentWordIndex={currentWordIndex} showContext={showContext} onWordClick={handleWordClick} contextLinesToShow={contextLinesToShow} />
          </div>
          <Controls
            wpm={wpm}
            isPlaying={isPlaying}
            onWpmChange={handleWpmChange}
            onPlayPause={handlePlayPause}
            onReset={handleReset}
            isAtEnd={currentWordIndex >= words.length -1 && words.length > 0}
            showContext={showContext}
            onToggleContext={handleToggleContext}
            contextLinesToShow={contextLinesToShow}
            onContextLinesChange={handleContextLinesChange}
          />
          <InputManager text={text} onTextChange={setText} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
