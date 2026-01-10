// src/components/Controls.tsx
import React from 'react';
import { Play, Pause, RotateCcw, Eye, EyeOff } from 'lucide-react';

type ControlsProps = {
  wpm: number;
  isPlaying: boolean;
  isAtEnd: boolean;
  showContext: boolean;
  contextLinesToShow: number;
  onWpmChange: (wpm: number) => void;
  onPlayPause: () => void;
  onReset: () => void;
  onToggleContext: () => void;
  onContextLinesChange: (lines: number) => void;
};

const ControlGroup = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <div className="p-4 bg-white dark:bg-gray-800/50 rounded-lg shadow-sm">
    <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3">{title}</h3>
    <div className="flex items-center gap-4">
      {children}
    </div>
  </div>
);

const Controls = ({
  wpm,
  isPlaying,
  isAtEnd,
  showContext,
  contextLinesToShow,
  onWpmChange,
  onPlayPause,
  onReset,
  onToggleContext,
  onContextLinesChange,
}: ControlsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-100 dark:bg-gray-900/50 rounded-lg shadow-inner">
      <ControlGroup title="Playback">
        <button
          onClick={onPlayPause}
          className="p-3 text-white bg-blue-600 rounded-full hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-transform active:scale-95"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
        </button>
        <button
          onClick={onReset}
          className="p-3 text-gray-700 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 transition-transform active:scale-95"
          aria-label="Reset"
        >
          <RotateCcw size={20} />
        </button>
      </ControlGroup>

      <ControlGroup title="Speed">
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
          className="w-full h-3 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer range-thumb:bg-blue-500"
        />
      </ControlGroup>

      <ControlGroup title="Context View">
        <button
          onClick={onToggleContext}
          className="p-3 text-gray-700 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 transition-transform active:scale-95"
          aria-label={showContext ? 'Hide Context' : 'Show Context'}
        >
          {showContext ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
        {showContext && (
          <>
            <label htmlFor="contextLines" className="text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
              {contextLinesToShow} Lines
            </label>
            <input
              type="range"
              id="contextLines"
              min="0"
              max="3"
              step="1"
              value={contextLinesToShow}
              onChange={(e) => onContextLinesChange(Number(e.target.value))}
              className="w-full h-3 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer range-thumb:bg-blue-500"
            />
          </>
        )}
      </ControlGroup>
    </div>
  );
};

export default Controls;
