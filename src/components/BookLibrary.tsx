// src/components/BookLibrary.tsx
import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { InputManagerProps } from './InputManager';

const books = [
  { title: 'Pride and Prejudice', url: 'https://www.gutenberg.org/ebooks/1342.txt.utf-8' },
  { title: 'Frankenstein', url: 'https://www.gutenberg.org/ebooks/84.txt.utf-8' },
  { title: 'A Tale of Two Cities', url: 'https://www.gutenberg.org/ebooks/98.txt.utf-8' },
];

const BookLibrary = ({ onTextChange }: InputManagerProps) => {
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleBookFetch = async (title: string, url: string) => {
    setIsLoading(title);
    const toastId = toast.loading(`Fetching ${title}...`);

    try {
      const response = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
      if (response.ok) {
        const fetchedText = await response.text();
        onTextChange(fetchedText);
        toast.success(`${title} loaded successfully!`, { id: toastId });
      } else {
        const errorData = await response.json();
        toast.error(`Failed to fetch ${title}: ${errorData.error}`, { id: toastId });
      }
    } catch (error) {
      console.error(`Error fetching ${title}:`, error);
      toast.error(`An error occurred while fetching ${title}.`, { id: toastId });
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="h-64 overflow-y-auto">
      <ul className="space-y-2">
        {books.map((book) => (
          <li key={book.title}>
            <button
              onClick={() => handleBookFetch(book.title, book.url)}
              disabled={!!isLoading}
              className="w-full text-left p-3 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="font-semibold">{book.title}</span>
              {isLoading === book.title && <span className="ml-2 animate-pulse">Loading...</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default BookLibrary;
