// src/components/Tab.tsx
import React from 'react';

type TabProps = {
  title: string;
  active: boolean;
  onClick: () => void;
};

const Tab = ({ title, active, onClick }: TabProps) => {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium transition-colors focus:outline-none ${
        active
          ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
      }`}
    >
      {title}
    </button>
  );
};

export default Tab;
