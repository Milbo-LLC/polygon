// src/app/api/s3-upload/route.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const path = formData.get('path') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Create a unique key for the file
    const fileExtension = file.name.split('.').pop();
    const key = `${path}/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExtension}`;
    
    const s3Client = new S3Client({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    // Get file buffer for upload
    const buffer = await file.arrayBuffer();

    // Upload directly from server
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.AWS_S3_PUBLIC_BUCKET_NAME,
      Key: key,
      Body: Buffer.from(buffer),
      ContentType: file.type,
    }));

    // Return the file URL
    const fileUrl = `https://${process.env.AWS_S3_PUBLIC_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    return NextResponse.json({
      success: true,
      fileUrl
    });
  } catch (error) {
    console.error('Error uploading to S3:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}