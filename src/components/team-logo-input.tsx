'use client';

import { UploadIcon, XIcon } from 'lucide-react';
import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Muted, Small } from './ui/typography';
import { useS3Upload } from '~/hooks/use-s3-upload';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
const ACCEPTED_IMAGE_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
};

export function TeamLogoInput({
  value,
  onChange,
  organizationId,
}: {
  value?: string;
  onChange: (url?: string) => void;
  organizationId?: string;
}) {
  const [isDragging, setIsDragging] = useState(false);
  
  // Use the S3 upload hook
  const { uploadToS3, isUploading, progress } = useS3Upload({
    maxSizeInBytes: MAX_IMAGE_SIZE,
    allowedFileTypes: Object.keys(ACCEPTED_IMAGE_TYPES),
    bucketPath: 'assets',
    organizationId,
    subFolder: 'team-logos'
  });

  const handleFileAdd = async (file: File) => {
    try {
      // Upload the file to S3
      const s3Url = await uploadToS3(file);
      // Update with the permanent S3 URL
      onChange(s3Url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload image');
    }
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        handleFileAdd(acceptedFiles[0] as File);
      }
    },
    accept: ACCEPTED_IMAGE_TYPES,
    multiple: false,
    maxSize: MAX_IMAGE_SIZE,
    onDropRejected: () => {
      toast.error('Please upload either a JPG or PNG file under 5MB');
    },
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
  });

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(undefined);
  };

  return (
    <div
      {...getRootProps()}
      className={`relative aspect-[1/1] rounded-md border-2 border-dashed overflow-hidden ${isDragging ? 'border-primary bg-primary/10' : 'border-border'}`}
    >
      <input {...getInputProps()} />
      
      {isUploading ? (
        // Show upload progress
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80">
          <div className="mb-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          <Small>{progress}% uploaded</Small>
        </div>
      ) : value ? (
        // Show image preview
        <div className="absolute inset-0 flex items-center justify-center">
          <img
            src={value}
            alt="Team logo preview"
            className="max-h-full max-w-full object-contain"
          />
          <Button
            onClick={handleRemoveImage}
            variant="ghost"
            size="icon"
            className="opacity-0 hover:opacity-100 absolute z-30 w-full h-full rounded-none"
            type="button"
          >
            <XIcon className="size-4" />
          </Button>
        </div>
      ) : (
        // Show upload prompt
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <UploadIcon className="size-4" strokeWidth={1.5} />
          <div className="flex flex-col items-center text-sm">
            <Muted>
              <Small>Logo</Small>
            </Muted>
          </div>
        </div>
      )}
    </div>
  );
}
