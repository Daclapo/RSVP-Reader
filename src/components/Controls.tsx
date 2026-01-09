// src/components/Controls.tsx
import React from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';

type ControlsProps = {
  wpm: number;
  isPlaying: boolean;
  isAtEnd: boolean;
  onWpmChange: (wpm: number) => void;
  onPlayPause: () => void;
  onReset: () => void;
};

const Controls = ({ wpm, isPlaying, isAtEnd, onWpmChange, onPlayPause, onReset }: ControlsProps) => {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-inner">
      <div className="flex items-center gap-4">
        <button
          onClick={() => {
            console.log('Play/Pause button clicked');
            onPlayPause();
          }}
          className="p-3 text-white bg-blue-600 rounded-full hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
        </button>
        <button
          onClick={onReset}
          className="p-3 text-gray-700 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
          aria-label="Reset"
        >
          <RotateCcw size={20} />
        </button>
      </div>
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <label htmlFor="wpm" className="text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
          {wpm} WPM
        </label>
        <input
          type="range"
          id="wpm"
          min="100"
          max="1200"
          step="10"
          value={wpm}
          onChange={(e) => onWpmChange(Number(e.target.value))}
          className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 range-thumb:bg-blue-500"
        />
      </div>
    </div>
  );
};

export default Controls;
