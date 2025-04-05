// src/hooks/useS3Upload.ts
'use client';

import { useState } from 'react';

type UploadState = {
  isUploading: boolean;
  progress: number;
  error: Error | null;
  url: string | null;
};

type UseS3UploadOptions = {
  maxSizeInBytes?: number;
  allowedFileTypes?: string[];
  bucketPath?: string;
  organizationId?: string;
  subFolder?: string;  // For more specific path organization
};

type UploadResponse = {
  fileUrl: string;
}

export function useS3Upload(options: UseS3UploadOptions = {}) {
  const {
    maxSizeInBytes = 5 * 1024 * 1024, // 5MB default
    allowedFileTypes = ['image/jpeg', 'image/png'],
    bucketPath = 'logos',
    organizationId,
    subFolder,
  } = options;

  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    url: null,
  });

  const uploadToS3 = async (file: File): Promise<string> => {
    // Validate file
    if (file.size > maxSizeInBytes) {
      throw new Error(`File size exceeds maximum allowed (${maxSizeInBytes / (1024 * 1024)}MB)`);
    }

    if (!allowedFileTypes.includes(file.type)) {
      throw new Error(`File type ${file.type} is not allowed`);
    }

    try {
      setUploadState({
        isUploading: true,
        progress: 0,
        error: null,
        url: null,
      });

      // Build path
      let filePath = bucketPath;
      if (organizationId) {
        filePath = `organizations/${organizationId}/${filePath}`;
      }
      if (subFolder) {
        filePath = `${filePath}/${subFolder}`;
      }

      // Create FormData for the file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', filePath);

      // Upload via our server API
      const response = await fetch('/api/s3-upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json() as { message?: string };
        throw new Error(errorData.message ?? 'Upload failed');
      }

      const data = await response.json() as UploadResponse;
      const fileUrl = data.fileUrl;

      setUploadState({
        isUploading: false,
        progress: 100,
        error: null,
        url: fileUrl,
      });

      return fileUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      const err = error instanceof Error ? error : new Error('Unknown error during upload');
      setUploadState({
        isUploading: false,
        progress: 0,
        error: err,
        url: null,
      });
      throw err;
    }
  };

  return {
    uploadToS3,
    ...uploadState,
  };
}