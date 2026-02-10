import pandas as pd
import json
from datetime import datetime, timedelta
from collections import defaultdict
import re

def parse_date_from_header(header_row):
    """Parse dates from the header row (row 12)"""
    dates = []
    month_counts = {}  # Track how many times we've seen each month/year
    
    # Skip first two columns (empty or property/accommodation headers)
    for i in range(2, len(header_row)):
        cell = header_row.iloc[i] if hasattr(header_row, 'iloc') else header_row[i]
        
        if pd.isna(cell) or cell == '' or str(cell).strip() == '':
            continue
            
        cell_str = str(cell).strip()
            
        # Try to parse month/year format like "Jan 2025"
        month_year_match = re.match(r'([A-Za-z]+)\s+(\d{4})', cell_str)
        if month_year_match:
            month_name = month_year_match.group(1)
            year = int(month_year_match.group(2))
            
            # Convert month name to number
            month_map = {
                'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
                'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
            }
            month_num = month_map.get(month_name[:3], 1)
            
            month_year_key = f"{year}-{month_num:02d}"
            
            # Count occurrences of this month/year
            if month_year_key not in month_counts:
                month_counts[month_year_key] = 0
            month_counts[month_year_key] += 1
            
            # The day is the count (1st occurrence = day 1, 2nd = day 2, etc.)
            day = month_counts[month_year_key]
            
            try:
                date_obj = datetime(year, month_num, day)
                dates.append(date_obj.strftime('%Y-%m-%d'))
            except ValueError:
                # Invalid date (e.g., Feb 30), skip
                continue
    
    return dates

def parse_occupancy_row(row, dates):
    """Parse a row of occupancy data"""
    property_name = str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else ''
    accommodation_type = str(row.iloc[1]).strip() if pd.notna(row.iloc[1]) else ''
    
    # Skip if both are empty or if it's a header/metadata row
    if not property_name and not accommodation_type:
        return None
    
    # Skip metadata rows
    if property_name in ['Occupancy Report', 'Date Range', 'Property filter:', 
                         'Accommodation types:', 'Agents:', 'Include provisionals:', 
                         'Add agent allocations:', 'Show unit totals:', 'Available rooms limit:']:
        return None
    
    occupancy_data = []
    
    # Months to exclude: December (12), January (1), February (2)
    excluded_months = [1, 2, 12]
    
    # Start from column 2 (index 2) since 0 and 1 are property/accommodation
    for i, date in enumerate(dates):
        col_idx = i + 2  # Offset by 2 for property/accommodation columns
        if col_idx >= len(row):
            break
        
        # Check if this date should be excluded
        try:
            date_obj = datetime.strptime(date, '%Y-%m-%d')
            if date_obj.month in excluded_months:
                continue  # Skip this date
        except ValueError:
            continue
            
        value = str(row.iloc[col_idx]).strip() if pd.notna(row.iloc[col_idx]) else '0'
        
        # Check if it's provisional (has asterisk)
        is_provisional = '*' in value
        value = value.replace('*', '').strip()
        
        # Try to convert to number
        try:
            occupancy = int(value) if value else 0
        except ValueError:
            occupancy = 0
        
        occupancy_data.append({
            'date': date,
            'occupancy': occupancy,
            'is_provisional': is_provisional
        })
    
    return {
        'property': property_name,
        'accommodation_type': accommodation_type,
        'occupancy_data': occupancy_data
    }

def process_occupancy_report(csv_file_path):
    """Process the occupancy report CSV file"""
    print(f"Processing occupancy report: {csv_file_path}")
    
    # Read the CSV file using csv module directly for better control
    import csv
    rows = []
    with open(csv_file_path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        for row in reader:
            rows.append(row)
    
    df = pd.DataFrame(rows)
    
    print(f"CSV has {len(df)} rows")
    
    # Find the header row (row with month/year labels)
    # Look for row with many month/year patterns (like "Jan 2025", "Feb 2025", etc.)
    header_row_idx = None
    max_month_count = 0
    
    for idx in range(len(df)):
        row = df.iloc[idx]
        month_count = 0
        for cell in row:
            if pd.notna(cell):
                cell_str = str(cell).strip()
                # Check if it matches month/year pattern
                if re.match(r'[A-Za-z]+\s+\d{4}', cell_str):
                    month_count += 1
        
        # The header row should have many month/year entries
        if month_count > max_month_count and month_count > 10:
            max_month_count = month_count
            header_row_idx = idx
    
    if header_row_idx is None:
        # Fallback: assume row 11 (index 11) based on file structure
        header_row_idx = 11
        print(f"Warning: Could not find header row automatically, using index 11")
    
    print(f"Found header row at index {header_row_idx}")
    
    if header_row_idx >= len(df):
        raise ValueError(f"Header row index {header_row_idx} is out of bounds (file has {len(df)} rows)")
    
    header_row = df.iloc[header_row_idx]
    day_of_week_row = df.iloc[header_row_idx + 1] if header_row_idx + 1 < len(df) else None
    day_number_row = df.iloc[header_row_idx + 2] if header_row_idx + 2 < len(df) else None
    
    # Debug: print first few cells of header row
    print(f"First 10 cells of header row: {header_row.iloc[:10].tolist()}")
    
    # Parse dates from header
    dates = parse_date_from_header(header_row)
    print(f"Parsed {len(dates)} dates")
    if dates:
        print(f"Date range: {dates[0]} to {dates[-1]}")
    else:
        print("Warning: No dates parsed from header row")
    
    # Process data rows (starting after the day number row)
    data_start_idx = header_row_idx + 3
    occupancy_records = []
    
    # Filter out unwanted properties and accommodation types
    excluded_properties = ['MV - Matusadona']
    excluded_accommodation_types = [
        'Internal Account',
        'Internal Account ',
        'Exclusive Use',
        'Pilot/Guide Room',
        'Boardroom',
        'POS Outlet Sales'
    ]
    
    for idx in range(data_start_idx, len(df)):
        row = df.iloc[idx]
        parsed = parse_occupancy_row(row, dates)
        if parsed:
            # Filter out excluded properties
            if parsed['property'] in excluded_properties:
                print(f"Filtering out property: {parsed['property']}")
                continue
            
            # Filter out excluded accommodation types
            if parsed['accommodation_type'] in excluded_accommodation_types:
                print(f"Filtering out accommodation type: {parsed['accommodation_type']}")
                continue
            
            occupancy_records.append(parsed)
    
    print(f"Processed {len(occupancy_records)} accommodation types (after filtering)")
    
    # Aggregate data by different dimensions
    results = aggregate_occupancy_data(occupancy_records, dates)
    
    return results

def aggregate_occupancy_data(records, dates):
    """Aggregate occupancy data by various dimensions"""
    
    # Daily totals by property
    daily_by_property = defaultdict(lambda: defaultdict(int))
    daily_by_property_provisional = defaultdict(lambda: defaultdict(int))
    
    # Monthly totals by property
    monthly_by_property = defaultdict(lambda: defaultdict(lambda: {'total': 0, 'provisional': 0, 'days': 0}))
    
    # By accommodation type
    daily_by_accommodation = defaultdict(lambda: defaultdict(int))
    monthly_by_accommodation = defaultdict(lambda: defaultdict(lambda: {'total': 0, 'provisional': 0, 'days': 0}))
    
    # Overall daily totals
    daily_totals = defaultdict(lambda: {'total': 0, 'provisional': 0, 'confirmed': 0})
    
    # Process each record
    for record in records:
        property_name = record['property']
        accommodation_type = record['accommodation_type']
        
        for occ in record['occupancy_data']:
            date_str = occ['date']
            occupancy = occ['occupancy']
            is_provisional = occ['is_provisional']
            
            # Parse date
            date_obj = datetime.strptime(date_str, '%Y-%m-%d')
            year = date_obj.year
            month = date_obj.month
            month_key = f"{year}-{month:02d}"
            
            # Daily aggregations
            daily_by_property[property_name][date_str] += occupancy
            daily_by_accommodation[accommodation_type][date_str] += occupancy
            
            if is_provisional:
                daily_by_property_provisional[property_name][date_str] += occupancy
            
            daily_totals[date_str]['total'] += occupancy
            if is_provisional:
                daily_totals[date_str]['provisional'] += occupancy
            else:
                daily_totals[date_str]['confirmed'] += occupancy
            
            # Monthly aggregations
            monthly_by_property[property_name][month_key]['total'] += occupancy
            monthly_by_property[property_name][month_key]['days'] += 1
            if is_provisional:
                monthly_by_property[property_name][month_key]['provisional'] += occupancy
            
            monthly_by_accommodation[accommodation_type][month_key]['total'] += occupancy
            monthly_by_accommodation[accommodation_type][month_key]['days'] += 1
            if is_provisional:
                monthly_by_accommodation[accommodation_type][month_key]['provisional'] += occupancy
    
    # Convert to lists for JSON serialization
    daily_by_property_list = {}
    for prop, dates_dict in daily_by_property.items():
        daily_by_property_list[prop] = [
            {'date': date, 'occupancy': occ} 
            for date, occ in sorted(dates_dict.items())
        ]
    
    daily_by_accommodation_list = {}
    for acc, dates_dict in daily_by_accommodation.items():
        daily_by_accommodation_list[acc] = [
            {'date': date, 'occupancy': occ} 
            for date, occ in sorted(dates_dict.items())
        ]
    
    daily_totals_list = [
        {
            'date': date,
            'total': totals['total'],
            'confirmed': totals['confirmed'],
            'provisional': totals['provisional']
        }
        for date, totals in sorted(daily_totals.items())
    ]
    
    # Convert monthly data
    monthly_by_property_list = {}
    for prop, months_dict in monthly_by_property.items():
        monthly_by_property_list[prop] = {
            month: {
                'total': data['total'],
                'provisional': data['provisional'],
                'confirmed': data['total'] - data['provisional'],
                'average_daily': data['total'] / data['days'] if data['days'] > 0 else 0
            }
            for month, data in sorted(months_dict.items())
        }
    
    monthly_by_accommodation_list = {}
    for acc, months_dict in monthly_by_accommodation.items():
        monthly_by_accommodation_list[acc] = {
            month: {
                'total': data['total'],
                'provisional': data['provisional'],
                'confirmed': data['total'] - data['provisional'],
                'average_daily': data['total'] / data['days'] if data['days'] > 0 else 0
            }
            for month, data in sorted(months_dict.items())
        }
    
    # Calculate summary statistics
    total_occupancy = sum(totals['total'] for totals in daily_totals.values())
    total_provisional = sum(totals['provisional'] for totals in daily_totals.values())
    total_confirmed = sum(totals['confirmed'] for totals in daily_totals.values())
    
    # Find peak occupancy dates
    peak_dates = sorted(daily_totals.items(), key=lambda x: x[1]['total'], reverse=True)[:10]
    
    # Calculate average daily occupancy
    avg_daily = total_occupancy / len(daily_totals) if daily_totals else 0
    
    summary = {
        'total_occupancy': total_occupancy,
        'total_confirmed': total_confirmed,
        'total_provisional': total_provisional,
        'average_daily_occupancy': round(avg_daily, 2),
        'date_range': {
            'start': dates[0] if dates else None,
            'end': dates[-1] if dates else None,
            'total_days': len(dates)
        },
        'peak_dates': [
            {
                'date': date,
                'occupancy': totals['total'],
                'confirmed': totals['confirmed'],
                'provisional': totals['provisional']
            }
            for date, totals in peak_dates
        ],
        'properties': list(set(r['property'] for r in records)),
        'accommodation_types': list(set(r['accommodation_type'] for r in records))
    }
    
    return {
        'summary': summary,
        'daily_totals': daily_totals_list,
        'daily_by_property': daily_by_property_list,
        'daily_by_accommodation': daily_by_accommodation_list,
        'monthly_by_property': monthly_by_property_list,
        'monthly_by_accommodation': monthly_by_accommodation_list,
        'raw_records': [
            {
                'property': r['property'],
                'accommodation_type': r['accommodation_type'],
                'occupancy_data': r['occupancy_data']
            }
            for r in records
        ]
    }

def main():
    """Main processing function"""
    try:
        csv_file = 'occupancy_report_01_jan_2025_to_31_dec_2027.csv'
        
        print(f"\n{'='*60}")
        print("Processing Occupancy Report")
        print(f"{'='*60}\n")
        
        results = process_occupancy_report(csv_file)
        
        # Save to JSON file
        output_file = 'occupancy_data.json'
        with open(output_file, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        print(f"\n{'='*60}")
        print("Processing Complete!")
        print(f"{'='*60}")
        print(f"\nSaved to: {output_file}")
        print(f"\nSummary:")
        print(f"  Date Range: {results['summary']['date_range']['start']} to {results['summary']['date_range']['end']}")
        print(f"  Total Days: {results['summary']['date_range']['total_days']}")
        print(f"  Total Occupancy: {results['summary']['total_occupancy']:,}")
        print(f"  Confirmed: {results['summary']['total_confirmed']:,}")
        print(f"  Provisional: {results['summary']['total_provisional']:,}")
        print(f"  Average Daily: {results['summary']['average_daily_occupancy']:.2f}")
        print(f"  Properties: {', '.join(results['summary']['properties'])}")
        print(f"  Accommodation Types: {len(results['summary']['accommodation_types'])}")
        print(f"\nTop Peak Dates:")
        for i, peak in enumerate(results['summary']['peak_dates'][:5], 1):
            print(f"  {i}. {peak['date']}: {peak['occupancy']} (Confirmed: {peak['confirmed']}, Provisional: {peak['provisional']})")
        
    except Exception as e:
        print(f"\nError processing occupancy report: {e}")
        import traceback
        traceback.print_exc()
        raise

if __name__ == "__main__":
    main()

