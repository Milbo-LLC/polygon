"use client";

import { useState, useRef } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Upload, X, Box, ChevronLeft, ChevronRight } from "lucide-react";

interface ModelUploaderProps {
  onModelUpload: (modelPath: string) => void;
}

export default function ModelUploader({ onModelUpload }: ModelUploaderProps) {
  const [modelPreview, setModelPreview] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 1: Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setErrorMessage(null);
    
    // Check if file is a GLB or STEP
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (fileExtension === 'glb' || ['step', 'stp'].includes(fileExtension || '')) {
      // Store the selected file for later processing
      setSelectedFile(file);
    } 
    else {
      setErrorMessage('Please select a .glb or .step file');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setSelectedFile(null);
    }
  };

  // Step 2: Handle file upload/processing
  const handleFileUpload = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select a file first');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);
    
    try {
      const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
      
      if (fileExtension === 'glb') {
        // Direct GLB handling
        const objectUrl = URL.createObjectURL(selectedFile);
        setModelPreview(objectUrl);
        onModelUpload(objectUrl);
        setIsCollapsed(true);
      } 
      else if (['step', 'stp'].includes(fileExtension || '')) {
        // STEP file handling - requires conversion
        const formData = new FormData();
        formData.append('file', selectedFile);
        
        const response = await fetch('/api/step-convert', {
          method: 'POST',
          body: formData,
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to convert STEP file');
        }
        
        // Use the converted GLB URL
        setModelPreview(data.url);
        onModelUpload(data.url);
        setIsCollapsed(true);
      }
    } catch (error) {
      console.error('Error processing file:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to process file');
    } finally {
      setIsLoading(false);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const clearUploadedModel = () => {
    if (modelPreview && modelPreview.startsWith('blob:')) {
      URL.revokeObjectURL(modelPreview);
    }
    setModelPreview(null);
    setErrorMessage(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onModelUpload('');
  };
  
  const loadDefaultModel = () => {
    // Load the default model from the public directory
    const defaultModelPath = '/model.glb';
    setModelPreview(defaultModelPath);
    onModelUpload(defaultModelPath);
    setIsCollapsed(true);
  };
  
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  if (isCollapsed) {
    return (
      <div className="fixed top-4 right-4 z-10 flex">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleCollapse}
          className="rounded-md flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>{modelPreview ? "3D Model Loaded" : "Upload 3D Model"}</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-10 p-4 bg-background border rounded-md shadow-sm max-w-[300px]">
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label htmlFor="model-upload">Upload 3D Model</Label>
          <div className="flex items-center gap-1">
            {modelPreview && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={clearUploadedModel}
                className="h-6 w-6"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleCollapse}
              className="h-6 w-6"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Input
              id="model-upload"
              type="file"
              accept=".glb,.step,.stp"
              onChange={handleFileSelect}
              ref={fileInputRef}
              className="w-full"
              disabled={isLoading}
            />
            <Button 
              variant="secondary" 
              size="sm"
              onClick={handleFileUpload}
              className="shrink-0"
              disabled={isLoading || !selectedFile}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
          </div>
          
          {selectedFile && (
            <p className="text-xs text-muted-foreground">
              Selected: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
            </p>
          )}
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={loadDefaultModel}
            className="w-full mt-2"
            disabled={isLoading}
          >
            <Box className="h-4 w-4 mr-2" />
            Load Default Model
          </Button>
        </div>
        
        {isLoading && <p className="text-xs text-muted-foreground mt-2">Processing file...</p>}
        {errorMessage && <p className="text-xs text-red-500 mt-2">{errorMessage}</p>}
        
        {modelPreview && !isLoading && (
          <p className="text-xs text-muted-foreground mt-2">
            Model loaded: {
              modelPreview.includes('blob:') 
                ? 'Custom upload (GLB)' 
                : modelPreview.startsWith('/models/') 
                  ? 'Converted STEP file'
                  : 'Default model'
            }
          </p>
        )}
      </div>
    </div>
  );
} 