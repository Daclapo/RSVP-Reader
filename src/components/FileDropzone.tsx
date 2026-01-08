// src/components/FileDropzone.tsx
import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

type FileDropzoneProps = {
  onFileContent: (content: string) => void;
};

const FileDropzone = ({ onFileContent }: FileDropzoneProps) => {
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setError(null);
      const file = acceptedFiles[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          const fileContent = reader.result as string;
          onFileContent(fileContent);
        };
        reader.onerror = () => {
          setError('Failed to read the file.');
        };
        reader.readAsText(file);
      }
    },
    [onFileContent]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'text/html': ['.html'],
    },
    maxFiles: 1,
  });

  return (
    <div
      {...getRootProps()}
      className={`flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-md p-4 transition-colors ${
        isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/50' : 'border-gray-300 dark:border-gray-600'
      }`}
    >
      <input {...getInputProps()} />
      {isDragActive ? (
        <p className="text-blue-600 dark:text-blue-300">Drop the file here...</p>
      ) : (
        <div className="text-center">
          <p className="text-gray-500">Drag & drop a file here, or click to select a file</p>
          <p className="text-xs text-gray-500 mt-1">
            Supported formats: .txt, .md, .html
          </p>
        </div>
      )}
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  );
};

export default FileDropzone;
