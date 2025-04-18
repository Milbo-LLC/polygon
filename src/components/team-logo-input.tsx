'use client';

import { UploadIcon, TrashIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Muted, Small } from './ui/typography';
import { useS3Upload } from '~/hooks/use-s3-upload';
import Image from 'next/image';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
// Only allow JPG/JPEG uploads due to Chrome PNG display issues
const ACCEPTED_IMAGE_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
};

export function TeamLogoInput({
  value,
  onChange,
  organizationId,
  onRemove,
  autoSave = false,
}: {
  value?: string;
  onChange: (url?: string) => void;
  organizationId?: string;
  onRemove?: () => Promise<void>;
  autoSave?: boolean;
}) {
  const [localValue, setLocalValue] = useState<string | undefined>(value);
  const [isRemoving, setIsRemoving] = useState(false);
  
  useEffect(() => {
    setLocalValue(value);
  }, [value]);
  
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
      
      // Update local state first
      setLocalValue(s3Url);
      // Then update parent component
      onChange(s3Url);
      
      if (autoSave && onRemove) {
        await onRemove();
        toast.success('Logo updated and saved');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload image');
    }
  };

  const { getInputProps, open } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        // Wrap the async call in a void function
        void handleFileAdd(acceptedFiles[0] as File);
      }
    },
    accept: ACCEPTED_IMAGE_TYPES,
    multiple: false,
    maxSize: MAX_IMAGE_SIZE,
    onDropRejected: () => {
      toast.error('Please upload a JPG/JPEG file under 5MB');
    },
    noClick: true,
    noDrag: true,
  });

  const handleRemoveImage = async (e?: React.MouseEvent) => {

    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    try {
      setIsRemoving(true);
      
      setLocalValue(undefined);
      
      onChange(undefined);
      if (onRemove) {
        await onRemove();
        toast.success('Logo removed and saved successfully');
      } else {
        toast.success('Logo removed successfully');
      }
    } catch (error) {
      console.error('Error removing logo:', error);
      toast.error('Failed to remove logo');
      setLocalValue(value);
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Logo display area - no longer a dropzone */}
      <div className="relative aspect-[1/1] size-24 rounded-md border-2 border-dashed overflow-hidden border-border">
        <input {...getInputProps()} />
        
        {isUploading || isRemoving ? (
          // Show upload/remove progress
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80">
            <div className="mb-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            <Small>{isUploading ? `${progress}% uploaded` : 'Removing...'}</Small>
          </div>
        ) : localValue ? (
          // Show image preview
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="size-24 relative">
              <Image
                src={localValue}
                alt="Team logo preview"
                fill
                className="object-contain"
              />
            </div>
          </div>
        ) : (
          // Show empty logo placeholder
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="flex flex-col items-center text-sm">
              <Muted>
                <Small>Logo</Small>
              </Muted>
            </div>
          </div>
        )}
      </div>
      
      {/* Action buttons below the logo */}
      <div className="flex gap-2 mt-1">
        <Button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            open();
          }}
          variant="outline"
          size="icon"
          className="size-7"
          type="button"
          title="Upload JPG logo"
          disabled={isUploading || isRemoving}
        >
          <UploadIcon className="size-3.5" />
        </Button>
        
        {localValue && (
          <Button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void handleRemoveImage();
            }}
            variant="outline"
            size="icon"
            className="size-7 text-destructive hover:bg-destructive/10"
            type="button"
            title="Remove logo"
            disabled={isUploading || isRemoving}
          >
            <TrashIcon className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
