// src/components/Footer.tsx
import React from 'react';

const Footer = () => {
  return (
    <footer className="w-full max-w-4xl mx-auto px-4 py-6 text-center text-gray-500 text-sm">
      <p>
        David Clarkson - github.com/daclapo - &copy; {new Date().getFullYear()}
      </p>
    </footer>
  );
};

export default Footer;
