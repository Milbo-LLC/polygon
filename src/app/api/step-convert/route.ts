import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { mkdir, writeFile } from 'fs/promises';

// Directory setup
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const PUBLIC_DIR = path.join(process.cwd(), 'public');
const PUBLIC_MODELS_DIR = path.join(PUBLIC_DIR, 'models');

// Ensure directories exist
async function ensureDirectories() {
  try {
    if (!fs.existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }
    if (!fs.existsSync(PUBLIC_MODELS_DIR)) {
      await mkdir(PUBLIC_MODELS_DIR, { recursive: true });
    }
  } catch (error) {
    console.error('Error creating directories:', error);
    throw error;
  }
}

// Convert STEP to GLB using the Python script
async function convertStepToGlb(stepFilePath: string, glbFilePath: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const converterPath = path.join(process.cwd(), 'step_to_glb_converter.py');
    
    // Check if converter exists
    if (!fs.existsSync(converterPath)) {
      return reject(new Error('STEP to GLB converter not found'));
    }
    
    const pythonProcess = spawn('python3', [
      converterPath,
      stepFilePath,
      glbFilePath
    ]);
    
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    
    pythonProcess.stdout.on('data', (data) => {
      stdout.push(data);
      console.log(`stdout: ${data}`);
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr.push(data);
      console.error(`stderr: ${data}`);
    });
    
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        resolve(true);
      } else {
        reject(new Error(`Conversion failed with code ${code}: ${Buffer.concat(stderr).toString()}`));
      }
    });
  });
}

export async function POST(request: NextRequest) {
  try {
    await ensureDirectories();
    
    // Parse the form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    
    // Validate the file type
    const fileType = file.name.split('.').pop()?.toLowerCase();
    if (!fileType || !['step', 'stp'].includes(fileType)) {
      return NextResponse.json({ error: 'Invalid file type. Only STEP files are allowed' }, { status: 400 });
    }
    
    // Generate unique IDs for the files
    const fileId = uuidv4();
    const stepFileName = `${fileId}.${fileType}`;
    const glbFileName = `${fileId}.glb`;
    
    // Set up file paths
    const stepFilePath = path.join(UPLOAD_DIR, stepFileName);
    const publicGlbPath = path.join(PUBLIC_MODELS_DIR, glbFileName);
    
    // Write the uploaded file to disk
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await writeFile(stepFilePath, fileBuffer);
    
    // Convert the STEP file to GLB
    try {
      await convertStepToGlb(stepFilePath, publicGlbPath);
    } catch (error) {
      console.error('Conversion error:', error);
      return NextResponse.json({ error: 'Failed to convert STEP file to GLB' }, { status: 500 });
    }
    
    // Return the URL to the GLB file
    const glbUrl = `/models/${glbFileName}`;
    
    return NextResponse.json({ 
      success: true,
      url: glbUrl,
      message: 'STEP file converted to GLB successfully' 
    });
    
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Optional: Add a GET method to check if the API is up
export async function GET() {
  return NextResponse.json({ status: 'STEP to GLB conversion API is running' });
} 