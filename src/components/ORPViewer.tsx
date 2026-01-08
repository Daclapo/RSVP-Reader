// src/components/ORPViewer.tsx
import React from 'react';

type ORPViewerProps = {
  word: string;
};

const ORPViewer = ({ word }: ORPViewerProps) => {
  if (!word) {
    return <span className="text-5xl font-semibold font-mono text-gray-900 dark:text-gray-100">...</span>;
  }

  const getORPIndex = (word: string): number => {
    const len = word.length;
    if (len <= 1) return 0;
    if (len <= 5) return 1;
    if (len <= 9) return 2;
    if (len <= 13) return 3;
    return 4;
  };

  const orpIndex = getORPIndex(word);
  const preORP = word.slice(0, orpIndex);
  const orpChar = word[orpIndex];
  const postORP = word.slice(orpIndex + 1);

  // Estimate the width of the text before the ORP
  // This is a rough estimation and might need adjustment for different fonts
  const preORPWidth = preORP.length * 20; // Adjust the multiplier as needed

  return (
    <div className="relative flex items-center justify-center w-full h-48 bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden">
      <p
        key={word}
        className="absolute text-5xl font-semibold font-mono text-gray-900 dark:text-gray-100 whitespace-nowrap"
        style={{ transform: `translateX(-${preORPWidth}px)` }}
      >
        <span className="text-gray-500 dark:text-gray-400">{preORP}</span>
        <span className="text-red-500">{orpChar}</span>
        <span className="text-gray-500 dark:text-gray-400">{postORP}</span>
      </p>
    </div>
  );
};

export default ORPViewer;
