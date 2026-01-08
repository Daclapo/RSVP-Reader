// src/components/Controls.tsx
import React from 'react';

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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-md">
      <div className="flex items-center justify-center sm:justify-start gap-4">
        <button
          onClick={onPlayPause}
          className="px-6 py-2 font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        >
          {isPlaying ? 'Pause' : isAtEnd ? 'Replay' : 'Play'}
        </button>
        <button
          onClick={onReset}
          className="px-6 py-2 font-semibold text-gray-700 bg-gray-300 rounded-md hover:bg-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 dark:bg-gray-600 dark:text-gray-100 dark:hover:bg-gray-500"
        >
          Reset
        </button>
      </div>
      <div className="flex items-center gap-3">
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
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
        />
      </div>
    </div>
  );
};

export default Controls;
