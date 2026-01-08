// src/components/TabbedInput.tsx
import React, { useState } from 'react';
import { InputManagerProps } from './InputManager';
import Tab from './Tab';
import FileDropzone from './FileDropzone'; // Import the new FileDropzone component

type InputMode = 'paste' | 'upload' | 'url';

const TabbedInput = ({ text, onTextChange }: InputManagerProps) => {
  const [mode, setMode] = useState<InputMode>('paste');

  const handleUrlFetch = async () => {
    const url = prompt('Enter the URL to fetch text from:');
    if (url) {
      try {
        // A proper implementation would use a server-side proxy to avoid CORS issues.
        const response = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
        if (response.ok) {
          const fetchedText = await response.text();
          onTextChange(fetchedText);
        } else {
          const errorData = await response.json();
          alert(`Failed to fetch content: ${errorData.error}`);
        }
      } catch (error) {
        console.error('Error fetching from URL:', error);
        alert('An error occurred while fetching the content.');
      }
    }
  };
  
  return (
    <div className="w-full p-4 bg-gray-100 dark:bg-gray-800 rounded-md">
      <div className="flex border-b border-gray-300 dark:border-gray-600 mb-4">
        <Tab title="Paste Text" active={mode === 'paste'} onClick={() => setMode('paste')} />
        <Tab title="Upload File" active={mode === 'upload'} onClick={() => setMode('upload')} />
        <Tab title="From URL" active={mode === 'url'} onClick={() => setMode('url')} />
      </div>

      {mode === 'paste' && (
        <textarea
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          className="w-full h-40 p-2 border border-gray-300 rounded-md resize-y dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Paste your text here..."
        />
      )}

      {mode === 'upload' && (
        <FileDropzone onFileContent={onTextChange} />
      )}

      {mode === 'url' && (
        <div className="flex flex-col items-center justify-center h-40">
          <button
            onClick={handleUrlFetch}
            className="px-6 py-3 font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
          >
            Fetch from URL
          </button>
          <p className="text-xs text-gray-500 mt-2">
            Enter a URL to fetch the text content.
          </p>
        </div>
      )}
    </div>
  );
};

export default TabbedInput;
