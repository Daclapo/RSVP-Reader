// src/components/RSVPViewer.tsx
import React from 'react';

type RSVPViewerProps = {
  word: string;
};

const RSVPViewer = ({ word }: RSVPViewerProps) => {
  if (!word) {
    return (
      <div className="flex items-center justify-center w-full h-48 bg-gray-100 dark:bg-gray-800 rounded-md">
        <p className="text-5xl font-semibold font-mono text-gray-900 dark:text-gray-100">...</p>
      </div>
    );
  }

  const pivotIndex = 1; // second character

  const beforePivot = word.substring(0, pivotIndex);
  const pivotChar = word[pivotIndex];
  const afterPivot = word.substring(pivotIndex + 1);

  return (
    <div className="flex items-center justify-center w-full h-48 bg-gray-100 dark:bg-gray-800 rounded-md">
      <p className="text-5xl font-semibold font-mono text-gray-900 dark:text-gray-100">
        {word.length > 1 ? (
          <>
            <span>{beforePivot}</span>
            <span className="text-red-500">{pivotChar}</span>
            <span>{afterPivot}</span>
          </>
        ) : (
          <span>{word}</span>
        )}
      </p>
    </div>
  );
};

export default RSVPViewer;
