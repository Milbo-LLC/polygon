import { NextRequest, NextResponse } from 'next/server';
import { env } from '~/env';
import fs from 'fs';
import path from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

// Directory setup
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// Keep track of completed jobs to avoid duplicate processing
const completedJobs = new Set<string>();

// Ensure directories exist
async function ensureDirectories() {
  try {
    if (!fs.existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }
  } catch (error) {
    console.error('Error creating directories:', error);
    throw error;
  }
}

// Generate a unique ID for the STEP file based on job ID to ensure consistency
function generateFileId(jobId: string): string {
  // Create a deterministic hash from the jobId
  // This ensures that the same jobId always produces the same fileId
  // even if the server restarts
  const hash = require('crypto').createHash('md5').update(jobId).digest('hex');
  return hash.substring(0, 8) + '-' + jobId.substring(0, 8);
}

export async function POST(request: NextRequest) {
  try {
    await ensureDirectories();

    // Parse JSON request body
    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required and must be a string' }, { status: 400 });
    }

    console.log(`Received text-to-CAD request with prompt: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`);

    // Generate a unique ID for the STEP file
    const fileId = uuidv4();
    const stepFileName = `${fileId}.step`;
    const stepFilePath = path.join(UPLOAD_DIR, stepFileName);

    // Make request to Zoo.dev API for text-to-CAD (STEP format)
    console.log(`Making request to Zoo.dev API with API key: ${env.ZOO_DEV_API_KEY ? env.ZOO_DEV_API_KEY.substring(0, 10) + '...' : 'undefined'}`);
    
    // Using the correct format as per documentation: /ai/text-to-cad/{output_format}
    const zooResponse = await fetch('https://api.zoo.dev/ai/text-to-cad/step', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.ZOO_DEV_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        // We can optionally add these parameters from the documentation
        // kcl_version: 'latest', // optional
        // project_name: 'my_project', // optional
      }),
    });

    console.log(`Zoo.dev API response status: ${zooResponse.status}`);

    if (!zooResponse.ok) {
      const errorText = await zooResponse.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      
      console.error('Zoo.dev API error:', zooResponse.status, errorData);
      
      return NextResponse.json({ 
        error: `Failed to generate CAD model from text: ${zooResponse.status}`, 
        details: errorData 
      }, { status: 500 });
    }

    const zooData = await zooResponse.json();
    console.log(`Zoo.dev API response data: ${JSON.stringify(zooData, null, 2)}`);

    // Check if this is a synchronous or asynchronous response
    if (zooData.status === 'completed' && zooData.outputs) {
      // Check if we have the source.step directly in the response (base64 encoded)
      if (zooData.outputs['source.step']) {
        console.log("Processing completed response with base64 encoded STEP data");
        // We have base64 encoded STEP data
        const stepData = Buffer.from(zooData.outputs['source.step'], 'base64');
        
        // Save the STEP file
        await writeFile(stepFilePath, stepData);
        
        // Now convert the STEP file to GLB using our existing endpoint
        const formData = new FormData();
        const fileBlob = new Blob([stepData], { type: 'application/step' });
        formData.append('file', new File([fileBlob], stepFileName, { type: 'application/step' }));
        
        const convertResponse = await fetch(new URL('/api/step-convert', request.url).toString(), {
          method: 'POST',
          body: formData,
        });
        
        if (!convertResponse.ok) {
          const convertError = await convertResponse.json();
          return NextResponse.json({ error: 'Failed to convert generated STEP file to GLB', details: convertError }, { status: 500 });
        }
        
        const convertData = await convertResponse.json();
        console.log("STEP file successfully converted to GLB, returning URL:", convertData.url);
        
        return NextResponse.json({
          success: true,
          stepFileId: fileId,
          glbUrl: convertData.url,
          message: 'Generated CAD model from text and converted to GLB successfully',
        });
      } 
      // Keep the old code for backwards compatibility with outputs.file
      else if (zooData.outputs.file) {
        // Synchronous response with file data
        // Download the file from the URL provided by Zoo.dev
        const fileResponse = await fetch(zooData.outputs.file);
        
        if (!fileResponse.ok) {
          return NextResponse.json({ error: 'Failed to download the generated CAD file' }, { status: 500 });
        }
        
        // Save the STEP file
        const fileBuffer = Buffer.from(await fileResponse.arrayBuffer());
        await writeFile(stepFilePath, fileBuffer);
        
        // Now convert the STEP file to GLB using our existing endpoint
        const formData = new FormData();
        const fileBlob = new Blob([fileBuffer], { type: 'application/step' });
        formData.append('file', new File([fileBlob], stepFileName, { type: 'application/step' }));
        
        const convertResponse = await fetch(new URL('/api/step-convert', request.url).toString(), {
          method: 'POST',
          body: formData,
        });
        
        if (!convertResponse.ok) {
          const convertError = await convertResponse.json();
          return NextResponse.json({ error: 'Failed to convert generated STEP file to GLB', details: convertError }, { status: 500 });
        }
        
        const convertData = await convertResponse.json();
        
        return NextResponse.json({
          success: true,
          stepFileId: fileId,
          glbUrl: convertData.url,
          message: 'Generated CAD model from text and converted to GLB successfully',
        });
      } else {
        // Error or unexpected response format
        return NextResponse.json({ 
          error: 'Unexpected response from Zoo.dev API - missing outputs data', 
          details: zooData 
        }, { status: 500 });
      }
    } else if (zooData.status === 'queued' || zooData.status === 'in_progress') {
      // This is an actual asynchronous job that needs polling 
      // (rare for Zoo.dev api which usually returns completed immediately)
      console.log("Received asynchronous job that needs polling:", zooData.id);
      return NextResponse.json({
        success: true,
        jobId: zooData.id,
        status: zooData.status,
        message: 'Text-to-CAD generation job started. Please poll for completion.',
      });
    } else {
      // Error or unexpected status
      return NextResponse.json({ 
        error: 'Unexpected response from Zoo.dev API', 
        details: zooData 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Text-to-CAD API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Add a GET endpoint to poll for job status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    // Check if this job has already been processed successfully
    if (completedJobs.has(jobId)) {
      console.log(`Job ${jobId} has already been processed successfully. Returning completed status.`);
      return NextResponse.json({
        success: true,
        status: 'completed',
        message: 'Job has already been processed successfully.',
        alreadyProcessed: true
      });
    }

    // Generate deterministic file IDs based on the job ID
    const fileId = generateFileId(jobId);
    const stepFileName = `${fileId}.step`;
    const stepFilePath = path.join(UPLOAD_DIR, stepFileName);
    const glbFileName = `${fileId}.glb`;
    const glbFilePath = path.join(process.cwd(), 'public', 'models', glbFileName);
    const glbUrl = `/models/${glbFileName}`;

    // Check if the GLB file already exists - if so, we've already processed this job
    if (fs.existsSync(glbFilePath)) {
      console.log(`GLB file already exists for job ${jobId}. Returning existing file.`);
      completedJobs.add(jobId); // Add to memory cache
      return NextResponse.json({
        success: true,
        status: 'completed',
        message: 'Job has already been processed successfully.',
        alreadyProcessed: true,
        glbUrl: glbUrl
      });
    }

    console.log(`Polling job status for jobId: ${jobId}`);

    // Poll Zoo.dev API for job status
    // Using the correct endpoint from the documentation: /async/operations/{id}
    const apiUrl = `https://api.zoo.dev/async/operations/${jobId}`;
    console.log(`Making request to Zoo.dev API: ${apiUrl}`);
    
    let zooResponse;
    try {
      zooResponse = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${env.ZOO_DEV_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Network error fetching Zoo.dev API:', error);
      return NextResponse.json({ 
        error: 'Failed to connect to Zoo.dev API',
        message: error instanceof Error ? error.message : 'Network error'
      }, { status: 500 });
    }

    // Handle 404 errors specifically with a clearer message
    if (zooResponse.status === 404) {
      console.log(`Zoo.dev API job not found: ${jobId}`);
      
      // Try alternative endpoint as a fallback
      console.log(`Trying alternative endpoint /ai/jobs/${jobId}`);
      try {
        const altResponse = await fetch(`https://api.zoo.dev/ai/jobs/${jobId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${env.ZOO_DEV_API_KEY}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (altResponse.ok) {
          zooResponse = altResponse;
          console.log(`Alternative endpoint successful`);
        } else {
          return NextResponse.json({ 
            error: 'The specified job was not found on Zoo.dev',
            status: 'not_found',
            jobId
          }, { status: 404 });
        }
      } catch (error) {
        return NextResponse.json({ 
          error: 'The specified job was not found on Zoo.dev',
          status: 'not_found',
          jobId
        }, { status: 404 });
      }
    }

    if (!zooResponse.ok) {
      const errorText = await zooResponse.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      
      console.error('Zoo.dev API error response:', zooResponse.status, errorData);
      
      return NextResponse.json({ 
        error: `Failed to fetch job status from Zoo.dev: ${zooResponse.status}`, 
        details: errorData 
      }, { status: 500 });
    }

    // Process successful response
    const zooData = await zooResponse.json();
    console.log(`Job status response from Zoo.dev:`, JSON.stringify(zooData, null, 2));

    // Parse the response according to the API documentation
    // Map Zoo.dev API response to our expected format
    if (zooData.status) {
      if (zooData.status === 'completed' && zooData.outputs) {
        // Use our deterministic file ID instead of generating a new one
        // const fileId = uuidv4(); -- remove this line
        // We've already defined these above:
        // const stepFileName = `${fileId}.step`;
        // const stepFilePath = path.join(UPLOAD_DIR, stepFileName);

        // Check if we have the source.step directly in the response (base64 encoded)
        if (zooData.outputs['source.step']) {
          console.log(`Job completed, processing base64 encoded STEP data`);
          
          // Decode the base64 data
          const stepData = Buffer.from(zooData.outputs['source.step'], 'base64');
          
          // Save the STEP file
          await writeFile(stepFilePath, stepData);
          
          console.log(`STEP file saved to: ${stepFilePath}, now converting to GLB`);
          
          // Now convert the STEP file to GLB using our existing endpoint
          const formData = new FormData();
          const fileBlob = new Blob([stepData], { type: 'application/step' });
          formData.append('file', new File([fileBlob], stepFileName, { type: 'application/step' }));
          
          const convertUrl = new URL('/api/step-convert', request.url).toString();
          console.log(`Converting using endpoint: ${convertUrl}`);
          
          const convertResponse = await fetch(convertUrl, {
            method: 'POST',
            body: formData,
          });
          
          if (!convertResponse.ok) {
            const convertErrorText = await convertResponse.text();
            let convertError;
            try {
              convertError = JSON.parse(convertErrorText);
            } catch {
              convertError = { message: convertErrorText };
            }
            
            console.error('Conversion error:', convertError);
            return NextResponse.json({ 
              error: 'Failed to convert generated STEP file to GLB', 
              details: convertError 
            }, { status: 500 });
          }
          
          const convertData = await convertResponse.json();
          console.log(`Conversion successful, GLB URL: ${convertData.url}`);
          
          // Mark this job as completed to avoid duplicate processing
          completedJobs.add(jobId);
          
          return NextResponse.json({
            success: true,
            status: zooData.status,
            stepFileId: fileId,
            glbUrl: glbUrl, // Use the deterministic URL
            message: 'Generated CAD model from text and converted to GLB successfully',
          });
        }
        // Keep existing code for the case where outputs.file is used
        else if (zooData.outputs.file) {
          console.log(`Job completed, downloading file from: ${zooData.outputs.file}`);

          // Download the file from the URL provided by Zoo.dev
          const fileResponse = await fetch(zooData.outputs.file);
          
          if (!fileResponse.ok) {
            console.error(`Failed to download CAD file: ${fileResponse.status}`);
            return NextResponse.json({ error: `Failed to download the generated CAD file: ${fileResponse.status}` }, { status: 500 });
          }
          
          // Save the STEP file
          const fileBuffer = Buffer.from(await fileResponse.arrayBuffer());
          await writeFile(stepFilePath, fileBuffer);
          
          console.log(`STEP file saved to: ${stepFilePath}, now converting to GLB`);
          
          // Now convert the STEP file to GLB using our existing endpoint
          const formData = new FormData();
          const fileBlob = new Blob([fileBuffer], { type: 'application/step' });
          formData.append('file', new File([fileBlob], stepFileName, { type: 'application/step' }));
          
          const convertUrl = new URL('/api/step-convert', request.url).toString();
          console.log(`Converting using endpoint: ${convertUrl}`);
          
          const convertResponse = await fetch(convertUrl, {
            method: 'POST',
            body: formData,
          });
          
          if (!convertResponse.ok) {
            const convertErrorText = await convertResponse.text();
            let convertError;
            try {
              convertError = JSON.parse(convertErrorText);
            } catch {
              convertError = { message: convertErrorText };
            }
            
            console.error('Conversion error:', convertError);
            return NextResponse.json({ 
              error: 'Failed to convert generated STEP file to GLB', 
              details: convertError 
            }, { status: 500 });
          }
          
          const convertData = await convertResponse.json();
          console.log(`Conversion successful, GLB URL: ${convertData.url}`);
          
          // Mark this job as completed to avoid duplicate processing
          completedJobs.add(jobId);
          
          return NextResponse.json({
            success: true,
            status: zooData.status,
            stepFileId: fileId,
            glbUrl: glbUrl, // Use the deterministic URL
            message: 'Generated CAD model from text and converted to GLB successfully',
          });
        } else {
          return NextResponse.json({ 
            error: 'Unexpected response format from Zoo.dev API - missing output data', 
            details: zooData 
          }, { status: 500 });
        }
      } else if (zooData.status === 'failed') {
        // Mark failed jobs as completed too to avoid reprocessing
        completedJobs.add(jobId);
        
        return NextResponse.json({
          success: false,
          status: 'failed',
          message: zooData.error || 'Generation failed',
          details: zooData
        }, { status: 200 });
      } else {
        // Still processing
        return NextResponse.json({
          success: true,
          jobId: zooData.id,
          status: zooData.status,
          message: `Text-to-CAD generation job status: ${zooData.status}`,
        });
      }
    } else {
      // Unknown response format
      return NextResponse.json({
        error: 'Unexpected response format from Zoo.dev API',
        details: zooData
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Text-to-CAD status API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 