// src/components/RSVPViewer.tsx
import React from 'react';
import ORPViewer from './ORPViewer';

type RSVPViewerProps = {
  word: string;
};

const RSVPViewer = ({ word }: RSVPViewerProps) => {
  return <ORPViewer word={word} />;
};

export default RSVPViewer;
