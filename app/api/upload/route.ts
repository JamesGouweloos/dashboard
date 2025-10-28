import { NextRequest, NextResponse } from 'next/server'
import { storage } from '../../../firebase.js'
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

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

    // Upload the file to Firebase Storage
    await uploadBytes(storageRef, buffer);

    // Get the download URL of the uploaded file
    const downloadURL = await getDownloadURL(storageRef);

    return NextResponse.json({ success: true, downloadURL });

  } catch (error) {
    console.error('Upload failed:', error);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}