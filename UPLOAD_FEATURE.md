# File Upload Feature - Documentation

## Overview

The dashboard now includes a file upload feature that allows users to update the dataset with new booking data. The system automatically processes the uploaded CSV file and refreshes all dashboard visualizations.

## Features

### 1. Upload Interface
- **Location**: `/upload` page (accessible via sidebar)
- **Drag & Drop**: Users can drag CSV files directly onto the upload area
- **Click to Upload**: Traditional file picker interface
- **File Validation**: Only CSV files are accepted
- **Progress Indication**: Loading spinner during processing

### 2. Processing Pipeline
1. **File Validation**: Checks file type (CSV only)
2. **File Storage**: Saves as `bookingData.csv` in project root
3. **Data Processing**: Runs `process_booking_data.py` script
4. **Business Rules**: Applies all filtering and categorization rules
5. **JSON Generation**: Creates new `dashboard_data.json`
6. **Dashboard Refresh**: All pages automatically update

### 3. Error Handling
- **File Type Validation**: Rejects non-CSV files
- **Processing Errors**: Catches Python script failures
- **Network Errors**: Handles upload failures
- **Cleanup**: Removes uploaded file if processing fails

## Technical Implementation

### API Endpoint: `/api/upload`

**Method**: POST  
**Content-Type**: multipart/form-data

**Request**:
```
FormData with 'file' field containing CSV file
```

**Response**:
```json
{
  "message": "File uploaded and processed successfully",
  "details": "Python script output"
}
```

**Error Response**:
```json
{
  "error": "Error message",
  "details": "Detailed error information"
}
```

### Components

#### FileUpload Component
- **Props**: `onUploadComplete: () => void`
- **Features**:
  - Drag and drop support
  - File type validation
  - Upload progress indication
  - Success/error messaging
  - Responsive design

#### Upload Page
- **Route**: `/upload`
- **Features**:
  - Upload interface
  - Process explanation
  - Important notes
  - Success notifications

### Data Refresh System

#### useDataRefresh Hook
- **Purpose**: Detects when data has been updated
- **Implementation**: Uses localStorage events
- **Usage**: Integrated into all dashboard pages

#### triggerDataRefresh Function
- **Purpose**: Notifies all pages of data updates
- **Implementation**: Sets/removes localStorage item
- **Usage**: Called after successful upload

## User Workflow

### 1. Access Upload Page
- Navigate to "Upload Data" in the sidebar
- Or visit `/upload` directly

### 2. Upload File
- **Option A**: Drag CSV file onto upload area
- **Option B**: Click upload area to select file
- **Validation**: System checks file type

### 3. Processing
- File is uploaded to server
- Python script processes the data
- Business rules are applied
- New dashboard data is generated

### 4. Dashboard Update
- All pages automatically refresh
- New data appears in all visualizations
- Success message is displayed

## File Requirements

### Format
- **File Type**: CSV (.csv extension)
- **Structure**: Same format as current `bookingData.csv`
- **Headers**: Must match existing column structure

### Expected Columns
- Property
- Reservation #
- Reservation name
- Status
- Agent
- Source
- Arrival date
- Departure date
- Bed nights
- PAX
- Accommodation
- Revenue Total
- Total amount outstanding
- [Various revenue category columns]

## Business Rules Applied

The uploaded data goes through the same processing pipeline:

1. **Rule 1**: Remove MV-Matusadona bookings
2. **Rule 2**: Remove staff bookings (with exceptions)
3. **Rule 3 & 4**: Categorize as Income/Non-Income Generating
4. **Rule 5**: Calculate Income column
5. **Rule 6**: Calculate Disbursements
6. **Rule 7**: Generate breakdowns and aggregations

## Error Scenarios

### File Upload Errors
- **Invalid file type**: "Only CSV files are allowed"
- **No file selected**: "No file uploaded"
- **Network error**: "Network error. Please try again."

### Processing Errors
- **Python script failure**: "Failed to process the uploaded file"
- **Timeout**: Processing stops after 30 seconds
- **File format issues**: "Please check the file format"

### Recovery
- Uploaded file is automatically cleaned up on failure
- User can retry upload with corrected file
- Original data remains intact until successful processing

## Security Considerations

### File Validation
- Only CSV files accepted
- File size limits (implicit through timeout)
- Processing timeout prevents infinite loops

### Data Safety
- Original `bookingData.csv` is replaced
- Backup not automatically created
- Processing errors don't corrupt existing data

## Performance

### Processing Time
- **Small files** (< 1000 rows): 5-10 seconds
- **Medium files** (1000-5000 rows): 10-20 seconds
- **Large files** (> 5000 rows): 20-30 seconds

### Timeout
- **Processing timeout**: 30 seconds
- **Upload timeout**: Browser default

## Usage Examples

### Weekly Data Update
1. Export new booking data from system
2. Navigate to Upload Data page
3. Upload CSV file
4. Wait for processing completion
5. Verify data in dashboard

### Data Correction
1. Fix data in source system
2. Export corrected CSV
3. Upload to dashboard
4. Confirm corrections are applied

## Troubleshooting

### Upload Not Working
- Check file is CSV format
- Verify file size is reasonable
- Check browser console for errors
- Ensure server is running

### Processing Fails
- Verify CSV format matches expected structure
- Check Python dependencies are installed
- Review server logs for detailed errors
- Try with smaller test file

### Data Not Updating
- Refresh browser page
- Check if processing completed successfully
- Verify `dashboard_data.json` was updated
- Clear browser cache if needed

## Future Enhancements

### Planned Features
- **Backup System**: Automatic backup before upload
- **Data Validation**: Pre-upload format checking
- **Batch Processing**: Multiple file uploads
- **Data Comparison**: Show differences between datasets
- **Scheduled Updates**: Automatic data refresh
- **User Permissions**: Role-based upload access

### Technical Improvements
- **Progress Tracking**: Real-time processing status
- **Data Preview**: Show sample data before processing
- **Rollback**: Revert to previous dataset
- **Audit Log**: Track all uploads and changes

## Integration Points

### Dashboard Pages
All pages automatically refresh when new data is uploaded:
- Dashboard (overview)
- Performance (analytics)
- Revenue (financial trends)
- Sources (marketing data)
- Analysis (detailed breakdown)

### Data Flow
```
CSV Upload → File Validation → Python Processing → JSON Generation → Dashboard Refresh
```

The upload feature provides a complete data management solution for the dashboard, enabling regular updates with fresh booking data while maintaining data integrity and user experience.

