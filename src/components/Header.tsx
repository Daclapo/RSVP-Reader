// src/components/Header.tsx
import React from 'react';
import { Github } from 'lucide-react';

const Header = () => {
  return (
    <header className="w-full max-w-4xl mx-auto px-4 py-6 flex justify-between items-center">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        RSVP Formatter
      </h1>
      <a
        href="https://github.com/your-repo/rsvp-formatter" // Please replace with your actual repo URL
        target="_blank"
        rel="noopener noreferrer"
        className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
      >
        <Github size={24} />
      </a>
    </header>
  );
};

export default Header;
