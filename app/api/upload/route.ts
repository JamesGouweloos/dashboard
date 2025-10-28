import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { storage } from '../../../../firebase'
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData()
    const file: File | null = data.get('file') as unknown as File

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json({ error: 'Only CSV files are allowed' }, { status: 400 })
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Create a storage reference
    const timestamp = Date.now()
    const storageRef = ref(storage, `uploads/booking_data_${timestamp}.csv`);

    // Upload the file
    await uploadBytes(storageRef, buffer);

    // Get the download URL
    const downloadURL = await getDownloadURL(storageRef);

    // Process the data using the Python script, passing the download URL as an argument
    try {
      console.log('Starting Python processing...');
      const { stdout, stderr } = await execAsync(`python process_booking_data.py "${downloadURL}"`, {
        cwd: process.cwd(),
        timeout: 30000 // 30 second timeout
      });

      if (stderr) {
        console.error('Python script stderr:', stderr);
      }

      console.log('Python script stdout:', stdout);

      return NextResponse.json({
        message: 'File uploaded and processed successfully',
        details: stdout
      });

    } catch (error: any) {
      console.error('Error processing file:', error);
      return NextResponse.json({
        error: 'Failed to process the uploaded file. Please check the file format.',
        details: error.message
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({
      error: 'Upload failed',
      details: error.message
    }, { status: 500 });
  }
}
