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
  const start = word.slice(0, orpIndex);
  const orpChar = word[orpIndex];
  const end = word.slice(orpIndex + 1);

  return (
    <div className="flex items-center justify-center w-full h-48 bg-gray-100 dark:bg-gray-800 rounded-md">
      <p className="text-5xl font-semibold font-mono text-gray-900 dark:text-gray-100">
        <span className="text-gray-500 dark:text-gray-400">{start}</span>
        <span className="text-red-500">{orpChar}</span>
        <span className="text-gray-500 dark:text-gray-400">{end}</span>
      </p>
    </div>
  );
};

export default ORPViewer;
