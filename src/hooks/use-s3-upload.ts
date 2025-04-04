// src/hooks/useS3Upload.ts
'use client';

import { useState } from 'react';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

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
    // Validate file size
    if (file.size > maxSizeInBytes) {
      throw new Error(`File size exceeds maximum allowed (${maxSizeInBytes / (1024 * 1024)}MB)`);
    }

    // Validate file type
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

      // Build a more specific path structure
      let filePath = bucketPath;
      
      // Add organization ID to path if provided
      if (organizationId) {
        filePath = `organizations/${organizationId}/${filePath}`;
      }
      
      // Add subfolder if provided
      if (subFolder) {
        filePath = `${filePath}/${subFolder}`;
      }
      
      // Create a unique file name
      const fileExtension = file.name.split('.').pop();
      const uniqueFileName = `${filePath}/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExtension}`;
      
      // Initialize the S3 client
      const s3Client = new S3Client({
        region: process.env.NEXT_PUBLIC_AWS_REGION!,
        credentials: {
          // You should get temporary credentials from your backend
          accessKeyId: process.env.NEXT_PUBLIC_AWS_IDENTITY_POOL_ID!,
          secretAccessKey: '',
          sessionToken: '',
        },
      });

      // Set up the multipart upload
      const upload = new Upload({
        client: s3Client,
        params: {
          Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME!,
          Key: uniqueFileName,
          Body: file,
          ContentType: file.type,
        },
      });

      // Handle upload progress
      upload.on('httpUploadProgress', (progress: { loaded?: number; total?: number }) => {
        if (progress.loaded && progress.total) {
          const percentage = Math.round((progress.loaded / progress.total) * 100);
          setUploadState(prev => ({ ...prev, progress: percentage }));
        }
      });

      // Wait for the upload to complete
      await upload.done();

      // Generate the URL for the uploaded file
      const fileUrl = `https://${process.env.NEXT_PUBLIC_S3_BUCKET_NAME}.s3.${process.env.NEXT_PUBLIC_AWS_REGION}.amazonaws.com/${uniqueFileName}`;
      
      setUploadState({
        isUploading: false,
        progress: 100,
        error: null,
        url: fileUrl,
      });

      return fileUrl;
    } catch (error) {
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