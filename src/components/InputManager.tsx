// src/components/InputManager.tsx
import React from 'react';
import TabbedInput from './TabbedInput';

export type InputManagerProps = {
  text: string;
  onTextChange: (text: string) => void;
};

const InputManager = ({ text, onTextChange }: InputManagerProps) => {
  return (
    <TabbedInput text={text} onTextChange={onTextChange} />
  );
};

export default InputManager;
