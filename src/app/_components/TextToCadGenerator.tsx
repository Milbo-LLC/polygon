"use client";

import { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { 
  Wand2, 
  Loader2, 
  ChevronLeft, 
  ChevronRight, 
  X
} from "lucide-react";

interface TextToCadGeneratorProps {
  onModelGenerated: (modelPath: string) => void;
}

export default function TextToCadGenerator({ onModelGenerated }: TextToCadGeneratorProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [pollingRetries, setPollingRetries] = useState(0);
  const MAX_RETRIES = 5; // Maximum number of retry attempts

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
  };

  const pollJobStatus = async (id: string) => {
    try {
      // Check if we've exceeded retry limit
      if (pollingRetries >= MAX_RETRIES) {
        console.log(`Reached maximum retry limit (${MAX_RETRIES}). Stopping polling.`);
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
        setIsLoading(false);
        setJobId(null);
        setErrorMessage("Model generation timed out. The job may still be processing in the background.");
        return;
      }
      
      console.log(`Polling job status for: ${id}`);
      const response = await fetch(`/api/text-to-cad?jobId=${id}`);
      
      // Special handling for 404 - the job might be in a different place
      // According to Zoo.dev API, we need to check /async/operations/{id} endpoint
      if (response.status === 404) {
        console.log('Job not found at the expected endpoint. This might be due to API changes or job completion.');
        
        // Increment retry counter
        setPollingRetries(prevRetries => prevRetries + 1);
        
        // Only stop after a few retries
        if (pollingRetries >= 3) {
          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }
          setIsLoading(false);
          setJobId(null);
          setErrorMessage("Could not find the job status. The model may have been created but could not be verified.");
        }
        return;
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Job status response error:', response.status, errorData);
        
        // Increment retry counter
        setPollingRetries(prevRetries => prevRetries + 1);
        
        // For persistent server errors, stop after a few tries
        if (response.status >= 500 && pollingRetries >= 3) {
          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }
          setIsLoading(false);
          setJobId(null);
          throw new Error(errorData.error || `Failed to fetch job status: ${response.status}`);
        }
        return;
      }

      // Reset retry counter on successful response
      setPollingRetries(0);
      
      const data = await response.json();
      console.log('Poll response:', data);

      // Handle the case where the job has already been processed
      if (data.alreadyProcessed) {
        console.log('Job has already been processed. Stopping polling.');
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
        setIsLoading(false);
        setJobId(null);
        return;
      }

      if (data.status === 'completed' && data.glbUrl) {
        // Job is complete and we have a GLB URL
        console.log('Job completed successfully with GLB URL:', data.glbUrl);
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
        setIsLoading(false);
        setJobId(null);
        
        // Use the GLB file
        onModelGenerated(data.glbUrl);
        
        // Collapse the panel
        setIsCollapsed(true);
      } else if (data.status === 'failed') {
        // Job failed
        console.log('Job failed:', data.message || 'Unknown error');
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
        setIsLoading(false);
        setJobId(null);
        setErrorMessage(`Generation failed: ${data.message || 'Unknown error'}`);
      } else {
        // Still in progress
        console.log(`Job still in progress with status: ${data.status}`);
      }
    } catch (error) {
      console.error('Error polling job status:', error);
      setErrorMessage(`Error polling job status: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Increment retry counter
      setPollingRetries(prevRetries => prevRetries + 1);
      
      // Stop polling if there's a persistent error after several retries
      if (pollingRetries >= 3) {
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
        setIsLoading(false);
      }
    }
  };

  const handleGenerate = async () => {
    if (prompt.trim() === "") {
      setErrorMessage("Please enter a description for your 3D model");
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);
    setPollingRetries(0); // Reset retry counter on new generation

    try {
      console.log("Sending text-to-CAD request with prompt:", prompt);
      
      const response = await fetch('/api/text-to-cad', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      console.log("Received response with status:", response.status);
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Server error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Response data:", data);

      if (data.glbUrl) {
        // Immediate success - we got a GLB URL directly
        console.log("Received GLB URL immediately:", data.glbUrl);
        setIsLoading(false);
        
        // Use the GLB file
        onModelGenerated(data.glbUrl);
        
        // Collapse the panel
        setIsCollapsed(true);
      } else if (data.jobId) {
        // Asynchronous job - start polling
        console.log("Received job ID, starting polling:", data.jobId);
        setJobId(data.jobId);
        
        // Start polling for job status every 3 seconds
        const interval = setInterval(() => pollJobStatus(data.jobId), 3000);
        setPollingInterval(interval);
      } else {
        console.error("Invalid API response - missing glbUrl and jobId:", data);
        throw new Error('No model URL or job ID returned');
      }
    } catch (error) {
      console.error('Error generating model:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to generate 3D model');
      setIsLoading(false);
    }
  };

  const cancelGeneration = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    setIsLoading(false);
    setJobId(null);
    setErrorMessage(null);
  };

  if (isCollapsed) {
    return (
      <div className="fixed top-16 right-4 z-10 flex">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleCollapse}
          className="rounded-md flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Text to 3D</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed top-16 right-4 z-10 p-4 bg-background border rounded-md shadow-sm max-w-[300px]">
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Label htmlFor="cad-prompt">Text to 3D Model</Label>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleCollapse}
            className="h-6 w-6"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex flex-col gap-2">
          <Textarea
            id="cad-prompt"
            placeholder="Describe the 3D model you want to generate..."
            value={prompt}
            onChange={handlePromptChange}
            className="min-h-[80px] resize-none"
            disabled={isLoading}
          />
          
          <div className="flex justify-between items-center">
            <Button 
              variant="default" 
              size="sm"
              onClick={handleGenerate}
              disabled={isLoading || prompt.trim() === ""}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {jobId ? "Processing..." : "Generating..."}
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Generate 3D Model
                </>
              )}
            </Button>
            
            {isLoading && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={cancelGeneration}
                className="ml-2"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        {errorMessage && <p className="text-xs text-red-500 mt-2">{errorMessage}</p>}
        
        <p className="text-xs text-muted-foreground mt-2">
          {isLoading 
            ? jobId 
              ? "AI is generating your 3D model. This may take a minute or two..." 
              : "Submitting your request..."
            : "Enter a detailed description of the 3D object you want to create."}
        </p>
        
        <p className="text-[10px] text-muted-foreground italic">
          Powered by <a href="https://zoo.dev" className="underline" target="_blank" rel="noopener noreferrer">Zoo.dev</a> AI
        </p>
      </div>
    </div>
  );
} 