"use client";

import { useState } from "react";
import ModelUploader from "./ModelUploader";
import TextToCadGenerator from "./TextToCadGenerator";

interface Model3DToolsProps {
  onModelChange: (modelPath: string) => void;
}

export default function Model3DTools({ onModelChange }: Model3DToolsProps) {
  const [currentModelPath, setCurrentModelPath] = useState<string>('');
  
  const handleModelChange = (modelPath: string) => {
    setCurrentModelPath(modelPath);
    onModelChange(modelPath);
  };
  
  return (
    <>
      <ModelUploader onModelUpload={handleModelChange} />
      <TextToCadGenerator onModelGenerated={handleModelChange} />
    </>
  );
} 