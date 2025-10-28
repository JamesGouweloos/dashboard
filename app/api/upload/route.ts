import { NextRequest, NextResponse } from 'next/server'
import { writeFile, unlink, access, rename } from 'fs/promises'
import { join } from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

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

    // Use a completely different filename to avoid conflicts
    const timestamp = Date.now()
    const newDataFile = join(process.cwd(), `new_booking_data_${timestamp}.csv`)
    const finalFilePath = join(process.cwd(), 'bookingData.csv')
    const backupFilePath = join(process.cwd(), `backup_booking_data_${timestamp}.csv`)

    try {
      // Write to new filename
      await writeFile(newDataFile, buffer)
      console.log('Uploaded file saved as:', newDataFile)

      // Backup existing file if it exists (with retry)
      let backupSuccess = false
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await access(finalFilePath)
          await rename(finalFilePath, backupFilePath)
          console.log('Backed up existing file to:', backupFilePath)
          backupSuccess = true
          break
        } catch (error: any) {
          console.log(`Backup attempt ${attempt} failed:`, error.message)
          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second
          }
        }
      }

      if (!backupSuccess) {
        console.log('No existing file to backup or backup failed')
      }

      // Rename new file to the expected name (with retry)
      let renameSuccess = false
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await rename(newDataFile, finalFilePath)
          console.log('Successfully replaced bookingData.csv')
          renameSuccess = true
          break
        } catch (error: any) {
          console.log(`Rename attempt ${attempt} failed:`, error.message)
          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second
          }
        }
      }

      if (!renameSuccess) {
        throw new Error('Failed to replace bookingData.csv after 3 attempts')
      }

      // Process the data using the Python script
      try {
        console.log('Starting Python processing...')
        const { stdout, stderr } = await execAsync('python process_booking_data.py', {
          cwd: process.cwd(),
          timeout: 30000 // 30 second timeout
        })

        if (stderr) {
          console.error('Python script stderr:', stderr)
        }

        console.log('Python script stdout:', stdout)

        // Clean up backup file on success
        try {
          await unlink(backupFilePath)
          console.log('Cleaned up backup file')
        } catch {
          // Backup cleanup failed, not critical
        }

        return NextResponse.json({
          message: 'File uploaded and processed successfully',
          details: stdout
        })

      } catch (error: any) {
        console.error('Error processing file:', error)
        
        // Restore backup file if processing failed
        try {
          await access(backupFilePath)
          await rename(backupFilePath, finalFilePath)
          console.log('Restored backup file due to processing failure')
        } catch (restoreError) {
          console.error('Failed to restore backup:', restoreError)
        }

        return NextResponse.json({
          error: 'Failed to process the uploaded file. Please check the file format.',
          details: error.message
        }, { status: 500 })
      }

    } catch (fileError: any) {
      console.error('File operation error:', fileError)
      
      // Clean up new file if it exists
      try {
        await unlink(newDataFile)
      } catch {
        // Ignore cleanup errors
      }

      // Try to restore backup
      try {
        await access(backupFilePath)
        await rename(backupFilePath, finalFilePath)
        console.log('Restored backup file due to file operation failure')
      } catch {
        // Backup restore failed
      }

      return NextResponse.json({
        error: 'Failed to save the uploaded file. Please try again.',
        details: fileError.message
      }, { status: 500 })
    }

  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json({
      error: 'Upload failed',
      details: error.message
    }, { status: 500 })
  }
}

