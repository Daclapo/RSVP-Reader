import React, { useMemo } from 'react';

type RSVPViewerProps = {
  words: string[];
  currentWordIndex: number;
  showContext: boolean;
  onWordClick: (wordIndex: number) => void;
  contextLinesToShow: number;
};

interface Line {
  words: string[];
  startIndex: number;
  endIndex: number;
}

const createLines = (words: string[], charsPerLine: number): Line[] => {
  const lines: Line[] = [];
  if (words.length === 0) return lines;

  let currentLine: string[] = [];
  let currentLineCharCount = 0;
  let lineStartIndex = 0;

  words.forEach((word, index) => {
    if (currentLine.length > 0 && currentLineCharCount + word.length + 1 > charsPerLine) {
      lines.push({
        words: currentLine,
        startIndex: lineStartIndex,
        endIndex: index - 1,
      });
      currentLine = [word];
      currentLineCharCount = word.length;
      lineStartIndex = index;
    } else {
      currentLine.push(word);
      currentLineCharCount += word.length + 1; // for space
    }
  });

  lines.push({
    words: currentLine,
    startIndex: lineStartIndex,
    endIndex: words.length - 1,
  });

  return lines;
};

const RSVPViewer = ({ words, currentWordIndex, showContext, onWordClick, contextLinesToShow }: RSVPViewerProps) => {
  const lines = useMemo(() => createLines(words, 50), [words]);
  const word = words[currentWordIndex];

  const renderWord = (word: string, isCurrent: boolean, key: number, wordIndex: number) => {
    const commonProps = {
      onClick: () => onWordClick(wordIndex),
      className: "cursor-pointer"
    };

    if (!isCurrent) {
      return <span key={key} {...commonProps}>{word} </span>;
    }
    const pivotIndex = 1;
    const beforePivot = word.substring(0, pivotIndex);
    const pivotChar = word[pivotIndex];
    const afterPivot = word.substring(pivotIndex + 1);
    return (
      <span key={key} {...commonProps} className="font-bold text-gray-900 dark:text-gray-100 cursor-pointer">
        {word.length > 1 ? (
          <>
            <span>{beforePivot}</span>
            <span className="text-red-500">{pivotChar}</span>
            <span>{afterPivot} </span>
          </>
        ) : (
          <span>{word} </span>
        )}
      </span>
    );
  };

  if (!word) {
    return (
      <div className="flex items-center justify-center w-full min-h-[12rem] bg-gray-100 dark:bg-gray-800 rounded-md">
        <p className="text-5xl font-semibold font-mono text-gray-900 dark:text-gray-100">...</p>
      </div>
    );
  }
  
  if (!showContext) {
    const pivotIndex = 1;
    const beforePivot = word.substring(0, pivotIndex);
    const pivotChar = word[pivotIndex];
    const afterPivot = word.substring(pivotIndex + 1);
    return (
        <div className="flex flex-col items-center justify-center w-full h-full">
            <p className="text-5xl font-semibold font-mono text-gray-900 dark:text-gray-100 my-4">
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
    )
  }

  const currentLineIndex = lines.findIndex(line => currentWordIndex >= line.startIndex && currentWordIndex <= line.endIndex);
  
  const translateYValue = (currentLineIndex * 4) - (contextLinesToShow * 4); // To center the current line

  return (
    <div className="w-full h-full bg-gray-100 dark:bg-gray-800 rounded-md p-4 font-mono text-2xl overflow-y-auto">
      <div className="transition-transform duration-500" style={{ transform: `translateY(-${translateYValue}rem)` }}>
        {lines.map((line, lineIndex) => (
          <p
            key={line.startIndex}
            className={`
              h-16 text-center py-2
              ${lineIndex === currentLineIndex ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}
            `}
          >
            {line.words.map((w, i) => renderWord(w, line.startIndex + i === currentWordIndex, line.startIndex + i, line.startIndex + i))}
          </p>
        ))}
      </div>
    </div>
  );
};

export default RSVPViewer;
