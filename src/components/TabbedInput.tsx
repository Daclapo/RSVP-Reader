// src/components/TabbedInput.tsx
import React, { useState } from 'react';
import { InputManagerProps } from './InputManager';
import Tab from './Tab';
import FileDropzone from './FileDropzone';
import { toast } from 'react-hot-toast';

type InputMode = 'paste' | 'upload' | 'url';

const TabbedInput = ({ text, onTextChange }: InputManagerProps) => {
  const [mode, setMode] = useState<InputMode>('paste');
  const [isLoading, setIsLoading] = useState(false);

  const handleUrlFetch = async () => {
    const url = prompt('Enter the URL to fetch text from:');
    if (!url) return;

    setIsLoading(true);
    const toastId = toast.loading('Fetching content...');

    try {
      const response = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
      if (response.ok) {
        const fetchedText = await response.text();
        onTextChange(fetchedText);
        toast.success('Content fetched successfully!', { id: toastId });
      } else {
        const errorData = await response.json();
        toast.error(`Failed to fetch content: ${errorData.error}`, { id: toastId });
      }
    } catch (error) {
      console.error('Error fetching from URL:', error);
      toast.error('An error occurred while fetching the content.', { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileContent = (content: string) => {
    onTextChange(content);
    toast.success('File loaded successfully!');
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
        <FileDropzone onFileContent={handleFileContent} />
      )}

      {mode === 'url' && (
        <div className="flex flex-col items-center justify-center h-40">
          <button
            onClick={handleUrlFetch}
            disabled={isLoading}
            className="px-6 py-3 font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Fetching...' : 'Fetch from URL'}
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
