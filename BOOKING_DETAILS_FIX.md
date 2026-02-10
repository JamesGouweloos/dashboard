# Booking Details Fix

## Issue
The option to show booking details for each month disappeared from the analysis page after the upload.

## Root Cause
The `getMonthlyBookings` function was checking for bookings using the month key directly from `monthlyBreakdown`, but the `monthly_bookings` data structure stores months as normalized integer strings (e.g., "4" instead of "4.0" or 4).

Additionally, the booking details section was only rendered if `bookings.length > 0`, which meant if the month key didn't match, it would return an empty array and the section wouldn't show at all.

## Fix Applied

### 1. Normalized Month Key in `getMonthlyBookings`
Updated the function to normalize the month parameter to an integer string to match the storage format:

```typescript
const getMonthlyBookings = (year: string, month: string | number) => {
  // Normalize month to integer string to match storage format
  let monthKey: string
  if (typeof month === 'number') {
    monthKey = String(Math.floor(month))
  } else {
    // Handle string months, including "4.0" format
    monthKey = String(parseInt(month.toString().replace('.0', '')) || 0)
  }
  
  if (!data.monthly_bookings || !data.monthly_bookings[year] || !data.monthly_bookings[year][monthKey]) {
    return []
  }
  
  let bookings = data.monthly_bookings[year][monthKey]
  // ... rest of function
}
```

### 2. Check for Monthly Bookings Data Before Rendering
Updated the booking details section to check if `monthly_bookings` data exists for the month before deciding whether to render:

```typescript
// Check if monthly_bookings data exists for this month
const monthKey = typeof month === 'number' 
  ? String(Math.floor(month))
  : String(parseInt(month.toString().replace('.0', '')) || 0)
const hasMonthlyBookingsData = data.monthly_bookings && 
                               data.monthly_bookings[year] && 
                               data.monthly_bookings[year][monthKey] !== undefined

// Only show section if we have monthly_bookings data
if (!hasMonthlyBookingsData) return null
```

## Result
- Booking details option now appears for all months that have `monthly_bookings` data
- Month key normalization ensures correct lookup regardless of format
- Section shows even if filtered bookings are empty (so user can see "0 bookings")

## Testing
After this fix:
1. Navigate to Analysis page
2. Expand a year
3. Expand a month
4. Verify the "X bookings (click to show details)" button appears
5. Click to show details and verify bookings are displayed
