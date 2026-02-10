from firebase_functions import https_fn
from firebase_functions.options import set_global_options
import json
import io
import csv as csv_module
from datetime import datetime, timedelta
from collections import defaultdict
import re

# For cost control, you can set the maximum number of containers that can be
# running at the same time. This helps mitigate the impact of unexpected
# traffic spikes by instead downgrading performance. This limit is a per-function
# limit. You can override the limit for each function using the max_instances
# parameter in the decorator, e.g. @https_fn.on_request(max_instances=5).
# Set options lazily to avoid blocking during code analysis
try:
    set_global_options(max_instances=10)
except Exception:
    pass  # Ignore errors during code analysis

# Initialize Firebase Admin lazily to avoid blocking during code analysis
_firebase_app = None
_firestore_client = None

def _get_firebase_app():
    """Lazy initialization of Firebase Admin"""
    global _firebase_app
    if _firebase_app is None:
        from firebase_admin import initialize_app, get_app
        try:
            _firebase_app = get_app()
        except ValueError:
            _firebase_app = initialize_app()
    return _firebase_app

# Initialize Firestore client only when needed
def get_firestore_client():
    """Get Firestore client, handling local vs production environments"""
    global _firestore_client
    if _firestore_client is None:
        try:
            from google.cloud import firestore
            _get_firebase_app()  # Ensure Firebase is initialized
            _firestore_client = firestore.Client()
        except Exception as e:
            print(f"Warning: Could not initialize Firestore client: {e}")
            return None
    return _firestore_client

def load_and_clean_data(csv_content: str):
    """Load and clean the booking data from CSV string with multi-row header"""
    # Lazy import to speed up module load time during deployment analysis
    import pandas as pd

    print("Loading booking data from CSV...")
    
    # Split into lines to handle multi-row header
    lines = csv_content.split('\n')
    print(f"Total lines in CSV: {len(lines)}")
    
    # The CSV has:
    # Rows 1-11 (indices 0-10): Metadata rows
    # Row 12 (index 11): Main column headers
    # Row 13 (index 12): Revenue category headers
    # Row 14+ (index 13+): Actual data
    
    # Parse row 12 (index 11) - main headers
    row12 = list(csv_module.reader([lines[11]]))[0] if len(lines) > 11 else []
    print(f"Row 12 has {len([c for c in row12 if c.strip()])} non-empty columns")
    
    # Parse row 13 (index 12) - revenue headers
    row13 = list(csv_module.reader([lines[12]]))[0] if len(lines) > 12 else []
    print(f"Row 13 has {len([c for c in row13 if c.strip()])} non-empty columns")
    
    # Combine headers: use row13 values where they exist and are meaningful
    combined_headers = list(row12)
    for i in range(len(combined_headers)):
        if i < len(row13):
            row13_val = row13[i].strip().strip('"')
            if row13_val and row13_val != '' and 'Unnamed' not in row13_val:
                combined_headers[i] = row13_val
    
    # Add any additional columns from row13 if it's longer
    if len(row13) > len(combined_headers):
        for i in range(len(combined_headers), len(row13)):
            row13_val = row13[i].strip().strip('"')
            if row13_val and row13_val != '' and 'Unnamed' not in row13_val:
                combined_headers.append(row13_val)
            else:
                combined_headers.append(f"Column_{i+1}")
    
    print(f"Combined header has {len(combined_headers)} columns")
    
    # Create a new CSV string with the fixed header
    fixed_lines = []
    # Add metadata rows 1-10
    for i in range(min(10, len(lines))):
        fixed_lines.append(lines[i])
    
    # Add empty row (skip grouping row)
    fixed_lines.append('')
    
    # Add combined header
    fixed_lines.append(','.join(['"' + str(h).replace('"', '""') + '"' for h in combined_headers]))
    
    # Add data rows starting from index 13 (original row 14)
    for i in range(13, len(lines)):
        if lines[i].strip():  # Only add non-empty lines
            fixed_lines.append(lines[i])
    
    # Join back into CSV string
    fixed_csv = '\n'.join(fixed_lines)
    
    # Read CSV with skiprows to skip metadata rows (first 11 rows + empty row = 12 rows to skip)
    df = pd.read_csv(io.StringIO(fixed_csv), skiprows=11, nrows=None)
    
    # Clean column names - normalize whitespace
    df.columns = df.columns.str.strip()
    
    # Helper function to get column name (case-insensitive, whitespace-tolerant)
    def get_column_name(desired_name):
        desired_normalized = desired_name.strip().lower()
        # Try exact match first
        if desired_name in df.columns:
            return desired_name
        # Try case-insensitive match
        for col in df.columns:
            if col.strip().lower() == desired_normalized:
                return col
        return None
    
    # Convert date columns
    arrival_col = get_column_name('Arrival date')
    if arrival_col:
        df['Arrival date'] = pd.to_datetime(df[arrival_col], errors='coerce')
    departure_col = get_column_name('Departure date')
    if departure_col:
        df['Departure date'] = pd.to_datetime(df[departure_col], errors='coerce')
    
    # Extract year and month
    if 'Arrival date' in df.columns:
        df['Year'] = df['Arrival date'].dt.year
        df['Month'] = df['Arrival date'].dt.month
    
    # Convert numeric columns - use flexible column lookup
    # Note: "Accommodation" is a sub-column under "Revenue Accommodation" in the CSV
    # "Revenue Total" is the total revenue column
    numeric_columns = ['Bed nights', 'PAX', 'Accommodation', 'Revenue Total', 'Total amount outstanding', 'Payments']
    for desired_col in numeric_columns:
        actual_col = get_column_name(desired_col)
        if actual_col:
            df[actual_col] = pd.to_numeric(df[actual_col], errors='coerce').fillna(0)
            # Also set the standard name if different (for backward compatibility)
            if actual_col != desired_col:
                df[desired_col] = df[actual_col]
    
    # Debug: Print available columns to help diagnose issues
    print(f"Available columns (first 30): {list(df.columns)[:30]}")
    print(f"Looking for key columns:")
    print(f"  - 'Accommodation': {get_column_name('Accommodation')}")
    print(f"  - 'Revenue Total': {get_column_name('Revenue Total')}")
    print(f"  - 'Arrival date': {get_column_name('Arrival date')}")
    print(f"  - 'Status': {get_column_name('Status')}")
    print(f"  - 'Reservation #': {get_column_name('Reservation #')}")
    print(f"  - 'Reservation name': {get_column_name('Reservation name')}")
    print(f"  - 'Source': {get_column_name('Source')}")
    
    print(f"Loaded {len(df)} bookings")
    return df

def apply_business_rules(df):
    # Lazy import
    import pandas as pd

    """Apply all business rules to filter and categorize data"""
    print("Applying business rules...")
    
    # Helper function to get column name (case-insensitive, whitespace-tolerant)
    def get_column_name(df, desired_name):
        desired_normalized = desired_name.strip().lower()
        # Try exact match first
        if desired_name in df.columns:
            return desired_name
        # Try case-insensitive match
        for col in df.columns:
            if col.strip().lower() == desired_normalized:
                return col
        return None
    
    # Rule 1: Remove MV-Matusadona bookings
    print("Applying Rule 1: Filtering out MV-Matusadona bookings...")
    initial_count = len(df)
    property_col = get_column_name(df, 'Property')
    if property_col:
        df = df[df[property_col] != 'MV - Matusadona'].copy()
        filtered_count = initial_count - len(df)
        print(f"  Removed {filtered_count} MV-Matusadona bookings")
    else:
        print(f"  Warning: 'Property' column not found. Available columns: {list(df.columns)[:10]}")
        print(f"  Skipping MV-Matusadona filter")
    
    # Rule 2: Remove bookings containing specific names EXCEPT specific booking numbers AND "Return Guests" source
    print("Applying Rule 2: Filtering out staff/management bookings...")
    keywords = ['Scott', 'Brown', 'Craig', 'Featherby', 'TWF', 'Staff']
    exceptions = ['WB3703', 'WB4118', 'WB2748', 'WB4001', 'WB3556', 'WB4121', 'WB4194', 'WB4362']
    
    reservation_name_col = get_column_name(df, 'Reservation name')
    reservation_num_col = get_column_name(df, 'Reservation #')
    source_col = get_column_name(df, 'Source')
    
    if reservation_name_col and reservation_num_col and source_col:
        mask_to_remove = pd.Series([False] * len(df), index=df.index)
        for keyword in keywords:
            keyword_mask = df[reservation_name_col].str.contains(keyword, case=False, na=False)
            # Keep exceptions
            exception_mask = df[reservation_num_col].isin(exceptions)
            # Keep "Return Guests" source
            return_guests_mask = df[source_col].str.contains('Return Guests', case=False, na=False)
            # Remove those matching keyword but not in exceptions AND not "Return Guests"
            mask_to_remove = mask_to_remove | (keyword_mask & ~exception_mask & ~return_guests_mask)
        
        initial_count = len(df)
        df = df[~mask_to_remove].copy()
        filtered_count = initial_count - len(df)
        print(f"  Removed {filtered_count} staff/management bookings")
    else:
        missing_cols = []
        if not reservation_name_col:
            missing_cols.append('Reservation name')
        if not reservation_num_col:
            missing_cols.append('Reservation #')
        if not source_col:
            missing_cols.append('Source')
        print(f"  Warning: Missing columns {missing_cols}. Skipping staff/management filter.")
        print(f"  Available columns: {list(df.columns)[:15]}")
    
    # Rules 3 & 4: Create booking classes
    print("Applying Rules 3 & 4: Categorizing bookings...")
    df['Booking Class'] = 'Income Generating'  # Default
    
    # Mark bookings with 0 accommodation as Non-Income Generating (with exceptions)
    accommodation_col = get_column_name(df, 'Accommodation')
    reservation_num_col = get_column_name(df, 'Reservation #')
    
    if accommodation_col and reservation_num_col:
        zero_accommodation_exceptions = ['WB3964', 'WB3762', 'WB4193', 'WB4242']
        zero_accommodation_mask = (df[accommodation_col] == 0) & (~df[reservation_num_col].isin(zero_accommodation_exceptions))
        df.loc[zero_accommodation_mask, 'Booking Class'] = 'Non-Income Generating'
    else:
        print(f"  Warning: Missing 'Accommodation' or 'Reservation #' column. Skipping booking class categorization.")
    
    income_generating = len(df[df['Booking Class'] == 'Income Generating'])
    non_income_generating = len(df[df['Booking Class'] == 'Non-Income Generating'])
    print(f"  Income Generating: {income_generating}")
    print(f"  Non-Income Generating: {non_income_generating}")
    
    return df

def calculate_income_and_disbursements(df):
    # Lazy import
    import pandas as pd

    """Calculate Income and Disbursements columns"""
    print("Calculating Income and Disbursements...")
    
    # Income columns (sum of all revenue-related columns)
    income_columns = [
        'WOMEN JEWELRY', 'Shop Purchases', 'Service Fee', 'Private guide and vehicle',
        'Private guide and boat', 'POS Misc', 'Operational', 'Miscellaneous', 'MEN JEWELRY',
        'Luxury Family Suite', 'Luxury Double Suite', 'Lunch ', 'Gratuity', 'Generator Fees',
        'Game Drive National Park', 'Game Drive GMA', 'Fuel', 'Fishing National Park full-day 26',
        'Fishing National Park', 'Fishing GMA', 'F&B', 'F & B', 'Extra Activity in the GMA',
        'Early Check-In / Late Check-Out', 'Dual Property Booking - Baines\' and Matusadona - T',
        'Drinks Tab', 'Curio: VR Prints', 'Curio: Short Sleeve', 'Curio: Luggage',
        'Curio: Long Sleeve', 'Curio: Jacket', 'Curio: Head & Waist Wear', 'Curio: Golfers',
        'Curio: Dress', 'Curio Shop', 'CURIO', 'COVID TEST - BRC', 'Booking Fee',
        'Boat Cruises GMA', 'Barter Agreement', 'Bar: White Wine', 'Bar: White House',
        'Bar: Whisky', 'Bar: Vodka', 'Bar: Soft Drinks', 'Bar: Single Malt', 'Bar: Rum',
        'Bar: Rose House', 'Bar: Red Wine', 'Bar: Red House', 'Bar: Liqueurs', 'Bar: Gin',
        'Bar: Cordials', 'Bar: Comp/Kitchen', 'Bar: Cider', 'Bar: Champagne / Sparkling',
        'Bar: Brandy', 'Bar: Beer', 'Bar: Aperitif', 'Baines\' River Camp',
        'BAR: ISLAND SUNDOWNERS', 'BAR: CORKAGE', 'Accommodation at Baine\'s',
        'Accommodation'
    ]
    
    # Calculate Income (sum of all income columns, minus discounts)
    df['Income'] = 0
    for col in income_columns:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
            df['Income'] += df[col]
    
    # Subtract discounts
    if '10% Discount' in df.columns:
        df['10% Discount'] = pd.to_numeric(df['10% Discount'], errors='coerce').fillna(0)
        df['Income'] -= df['10% Discount']
    
    # Calculate Disbursements
    # Helper function to get column name (case-insensitive, whitespace-tolerant)
    def get_column_name(df, desired_name):
        desired_normalized = desired_name.strip().lower()
        # Try exact match first
        if desired_name in df.columns:
            return desired_name
        # Try case-insensitive match
        for col in df.columns:
            if col.strip().lower() == desired_normalized:
                return col
        return None
    
    revenue_total_col = get_column_name(df, 'Revenue Total')
    if revenue_total_col:
        df['Disbursements'] = df[revenue_total_col] - df['Income']
        total_income = df['Income'].sum()
        total_disbursements = df['Disbursements'].sum()
        total_revenue = df[revenue_total_col].sum()
        print(f"  Total Income: ${total_income:,.2f}")
        print(f"  Total Disbursements: ${total_disbursements:,.2f}")
        print(f"  Total Revenue: ${total_revenue:,.2f}")
    else:
        print(f"  Warning: 'Revenue Total' column not found. Cannot calculate Disbursements.")
        print(f"  Available columns: {list(df.columns)[:20]}")
        df['Disbursements'] = 0
    
    return df

def process_revenue_and_booking_metrics(df):
    # Lazy import
    import pandas as pd
    """Process revenue trends and booking metrics"""
    print("Processing revenue and booking metrics...")
    
    # Helper function to get column name (case-insensitive, whitespace-tolerant)
    def get_column_name(desired_name):
        desired_normalized = desired_name.strip().lower()
        # Try exact match first
        if desired_name in df.columns:
            return desired_name
        # Try case-insensitive match
        for col in df.columns:
            if col.strip().lower() == desired_normalized:
                return col
        return None
    
    arrival_col = get_column_name('Arrival date')
    year_col = get_column_name('Year')
    month_col = get_column_name('Month')
    revenue_col = get_column_name('Revenue Total')
    bed_nights_col = get_column_name('Bed nights')
    
    if not arrival_col or not year_col or not month_col:
        print(f"  Warning: Missing required columns for revenue trends. Available: {list(df.columns)[:15]}")
        return {}
    
    # Revenue trends by month
    revenue_trends = {}
    for _, row in df.iterrows():
        if pd.notna(row[arrival_col]):
            year = int(row[year_col]) if year_col else None
            month = int(row[month_col]) if month_col else None
            
            if year and month:
                key = f"{year}-{month:02d}"
                
                if key not in revenue_trends:
                    revenue_trends[key] = {
                        'revenue': 0,
                        'bookings': 0,
                        'bed_nights': 0
                    }
                
                if revenue_col:
                    revenue_trends[key]['revenue'] += float(row[revenue_col]) if pd.notna(row[revenue_col]) else 0
                revenue_trends[key]['bookings'] += 1
                if bed_nights_col:
                    revenue_trends[key]['bed_nights'] += int(row[bed_nights_col]) if pd.notna(row[bed_nights_col]) else 0
    
    return revenue_trends

def create_breakdowns(df):
    # Lazy imports
    import pandas as pd
    import numpy as np

    """Create various breakdowns for the dashboard"""
    print("Creating breakdowns...")
    
    # Helper function to get column name (case-insensitive, whitespace-tolerant)
    def get_column_name(desired_name):
        desired_normalized = desired_name.strip().lower()
        # Try exact match first
        if desired_name in df.columns:
            return desired_name
        # Try case-insensitive match
        for col in df.columns:
            if col.strip().lower() == desired_normalized:
                return col
        return None
    
    # Get column names with fallbacks
    revenue_col = get_column_name('Revenue Total')
    bed_nights_col = get_column_name('Bed nights')
    pax_col = get_column_name('PAX')
    outstanding_col = get_column_name('Total amount outstanding')
    booking_class_col = get_column_name('Booking Class')
    
    # Summary statistics
    total_revenue = float(df[revenue_col].sum()) if revenue_col else 0.0
    total_bed_nights = int(df[bed_nights_col].sum()) if bed_nights_col else 0
    total_pax = int(df[pax_col].sum()) if pax_col else 0
    total_outstanding_val = float(df[outstanding_col].sum()) if outstanding_col else 0.0
    
    summary = {
        'total_bookings': len(df),
        'total_revenue': total_revenue,
        'total_bed_nights': total_bed_nights,
        'total_pax': total_pax,
        'total_payments': total_revenue - total_outstanding_val,
        'total_outstanding': total_outstanding_val,
        'report_generated': datetime.now().isoformat(),
        'income_generating': len(df[df[booking_class_col] == 'Income Generating']) if booking_class_col else 0,
        'non_income_generating': len(df[df[booking_class_col] == 'Non-Income Generating']) if booking_class_col else 0
    }
    
    # Get additional column names needed for breakdowns
    status_col = get_column_name('Status')
    source_col = get_column_name('Source')
    agent_col = get_column_name('Agent')
    year_col = get_column_name('Year')
    month_col = get_column_name('Month')
    accommodation_col = get_column_name('Accommodation')
    income_col = get_column_name('Income')
    disbursements_col = get_column_name('Disbursements')
    
    # Breakdown by status
    by_status = {}
    if status_col:
        for status, group in df.groupby(status_col):
            by_status[status] = {
                'bookings': len(group),
                'revenue': float(group[revenue_col].sum()) if revenue_col else 0.0,
                'bed_nights': int(group[bed_nights_col].sum()) if bed_nights_col else 0
            }
    
    # Breakdown by booking class
    by_booking_class = {}
    if booking_class_col:
        for booking_class, group in df.groupby(booking_class_col):
            by_booking_class[booking_class] = {
                'bookings': len(group),
                'revenue': float(group[revenue_col].sum()) if revenue_col else 0.0,
                'bed_nights': int(group[bed_nights_col].sum()) if bed_nights_col else 0
            }
    
    # Breakdown by source
    by_source = {}
    if source_col:
        for source, group in df.groupby(source_col):
            by_source[source] = {
                'bookings': len(group),
                'revenue': float(group[revenue_col].sum()) if revenue_col else 0.0,
                'bed_nights': int(group[bed_nights_col].sum()) if bed_nights_col else 0
            }
    
    # Breakdown by agent
    by_agent = {}
    if agent_col:
        for agent, group in df.groupby(agent_col):
            by_agent[agent] = {
                'bookings': len(group),
                'revenue': float(group[revenue_col].sum()) if revenue_col else 0.0,
                'bed_nights': int(group[bed_nights_col].sum()) if bed_nights_col else 0
            }
    
    # Yearly breakdown
    yearly_breakdown = {}
    if year_col and status_col:
        for year, year_group in df.groupby(year_col):
            year_str = str(int(year))
            yearly_breakdown[year_str] = {}
            for status, status_group in year_group.groupby(status_col):
                yearly_breakdown[year_str][status] = {
                    'bed_nights': int(status_group[bed_nights_col].sum()) if bed_nights_col else 0,
                    'accommodation': float(status_group[accommodation_col].sum()) if accommodation_col else 0.0,
                    'income': float(status_group[income_col].sum()) if income_col else 0.0,
                    'disbursements': float(status_group[disbursements_col].sum()) if disbursements_col else 0.0,
                    'revenue_total': float(status_group[revenue_col].sum()) if revenue_col else 0.0,
                    'outstanding': float(status_group[outstanding_col].sum()) if outstanding_col else 0.0
                }
    elif year_col:
        # If no status column, create breakdown by year only
        for year, year_group in df.groupby(year_col):
            year_str = str(int(year))
            yearly_breakdown[year_str] = {
                'All': {
                    'bed_nights': int(year_group[bed_nights_col].sum()) if bed_nights_col else 0,
                    'accommodation': float(year_group[accommodation_col].sum()) if accommodation_col else 0.0,
                    'income': float(year_group[income_col].sum()) if income_col else 0.0,
                    'disbursements': float(year_group[disbursements_col].sum()) if disbursements_col else 0.0,
                    'revenue_total': float(year_group[revenue_col].sum()) if revenue_col else 0.0,
                    'outstanding': float(year_group[outstanding_col].sum()) if outstanding_col else 0.0
                }
            }
    
    # Monthly breakdown
    monthly_breakdown = {}
    if year_col and month_col and status_col:
        for year, year_group in df.groupby(year_col):
            year_str = str(int(year))
            monthly_breakdown[year_str] = {}
            for month, month_group in year_group.groupby(month_col):
                monthly_breakdown[year_str][month] = {}
                for status, status_group in month_group.groupby(status_col):
                    monthly_breakdown[year_str][month][status] = {
                        'bed_nights': int(status_group[bed_nights_col].sum()) if bed_nights_col else 0,
                        'accommodation': float(status_group[accommodation_col].sum()) if accommodation_col else 0.0,
                        'income': float(status_group[income_col].sum()) if income_col else 0.0,
                        'disbursements': float(status_group[disbursements_col].sum()) if disbursements_col else 0.0,
                        'revenue_total': float(status_group[revenue_col].sum()) if revenue_col else 0.0,
                        'outstanding': float(status_group[outstanding_col].sum()) if outstanding_col else 0.0
                    }
    
    # Yearly breakdown by booking class
    yearly_breakdown_by_class = {}
    if year_col and booking_class_col:
        for year, year_group in df.groupby(year_col):
            year_str = str(int(year))
            yearly_breakdown_by_class[year_str] = {}
            for booking_class, class_group in year_group.groupby(booking_class_col):
                yearly_breakdown_by_class[year_str][booking_class] = {
                    'bed_nights': int(class_group[bed_nights_col].sum()) if bed_nights_col else 0,
                    'accommodation': float(class_group[accommodation_col].sum()) if accommodation_col else 0.0,
                    'income': float(class_group[income_col].sum()) if income_col else 0.0,
                    'disbursements': float(class_group[disbursements_col].sum()) if disbursements_col else 0.0,
                    'revenue_total': float(class_group[revenue_col].sum()) if revenue_col else 0.0,
                    'outstanding': float(class_group[outstanding_col].sum()) if outstanding_col else 0.0
                }
    
    # Monthly breakdown by booking class
    monthly_breakdown_by_class = {}
    if year_col and month_col and booking_class_col:
        for year, year_group in df.groupby(year_col):
            year_str = str(int(year))
            monthly_breakdown_by_class[year_str] = {}
            for month, month_group in year_group.groupby(month_col):
                monthly_breakdown_by_class[year_str][month] = {}
                for booking_class, class_group in month_group.groupby(booking_class_col):
                    monthly_breakdown_by_class[year_str][month][booking_class] = {
                        'bed_nights': int(class_group[bed_nights_col].sum()) if bed_nights_col else 0,
                        'accommodation': float(class_group[accommodation_col].sum()) if accommodation_col else 0.0,
                        'income': float(class_group[income_col].sum()) if income_col else 0.0,
                        'disbursements': float(class_group[disbursements_col].sum()) if disbursements_col else 0.0,
                        'revenue_total': float(class_group[revenue_col].sum()) if revenue_col else 0.0,
                        'outstanding': float(class_group[outstanding_col].sum()) if outstanding_col else 0.0
                    }
    
    # Combined breakdown by Year, Class, and Status
    yearly_breakdown_combined = {}
    if year_col and booking_class_col and status_col:
        for year, year_group in df.groupby(year_col):
            year_str = str(int(year))
            yearly_breakdown_combined[year_str] = {}
            for booking_class, class_group in year_group.groupby(booking_class_col):
                yearly_breakdown_combined[year_str][booking_class] = {}
                for status, status_group in class_group.groupby(status_col):
                    yearly_breakdown_combined[year_str][booking_class][status] = {
                        'count': len(status_group),
                        'pax': int(status_group[pax_col].sum()) if pax_col else 0,
                        'bed_nights': int(status_group[bed_nights_col].sum()) if bed_nights_col else 0,
                        'accommodation': float(status_group[accommodation_col].sum()) if accommodation_col else 0.0,
                        'income': float(status_group[income_col].sum()) if income_col else 0.0,
                        'disbursements': float(status_group[disbursements_col].sum()) if disbursements_col else 0.0,
                        'revenue_total': float(status_group[revenue_col].sum()) if revenue_col else 0.0,
                        'outstanding': float(status_group[outstanding_col].sum()) if outstanding_col else 0.0
                    }
    
    # Combined breakdown by Year, Month, Class, and Status
    monthly_breakdown_combined = {}
    if year_col and month_col and booking_class_col and status_col:
        for year, year_group in df.groupby(year_col):
            year_str = str(int(year))
            monthly_breakdown_combined[year_str] = {}
            for month, month_group in year_group.groupby(month_col):
                monthly_breakdown_combined[year_str][month] = {}
                for booking_class, class_group in month_group.groupby(booking_class_col):
                    monthly_breakdown_combined[year_str][month][booking_class] = {}
                    for status, status_group in class_group.groupby(status_col):
                        monthly_breakdown_combined[year_str][month][booking_class][status] = {
                            'count': len(status_group),
                            'pax': int(status_group[pax_col].sum()) if pax_col else 0,
                            'bed_nights': int(status_group[bed_nights_col].sum()) if bed_nights_col else 0,
                            'accommodation': float(status_group[accommodation_col].sum()) if accommodation_col else 0.0,
                            'income': float(status_group[income_col].sum()) if income_col else 0.0,
                            'disbursements': float(status_group[disbursements_col].sum()) if disbursements_col else 0.0,
                            'revenue_total': float(status_group[revenue_col].sum()) if revenue_col else 0.0,
                            'outstanding': float(status_group[outstanding_col].sum()) if outstanding_col else 0.0
                        }
    
    # Monthly bookings for detailed view
    monthly_bookings = {}
    if year_col and month_col:
        for year, year_group in df.groupby(year_col):
            # Skip NaN years
            if pd.isna(year):
                continue
            year_str = str(int(year))
            monthly_bookings[year_str] = {}
            for month, month_group in year_group.groupby(month_col):
                # Skip NaN months and convert to integer string
                if pd.isna(month):
                    continue
                month_str = str(int(month))  # Convert float to int, then to string ("3" not "3.0")
                # Convert DataFrame to records, handling NaN values
                records = []
                for _, row in month_group.iterrows():
                    record = {}
                    for col in month_group.columns:
                        val = row[col]
                        if pd.isna(val):
                            record[col] = None
                        elif isinstance(val, (int, float)):
                            record[col] = float(val)
                        elif hasattr(val, 'isoformat'):
                            try:
                                record[col] = val.isoformat()
                            except Exception:
                                record[col] = str(val)
                        else:
                            record[col] = str(val)
                    records.append(record)
                monthly_bookings[year_str][month_str] = records
    
    # Top revenue extras
    top_extras = {}
    extra_columns = [col for col in df.columns if any(extra in col for extra in ['Bar:', 'Curio:', 'F&B', 'Game Drive', 'Fishing', 'Private guide'])]
    for col in extra_columns:
        if col in df.columns:
            total = float(df[col].sum())
            if total > 0:
                top_extras[col] = total
    
    # Sort by revenue and get top 10
    top_extras = dict(sorted(top_extras.items(), key=lambda x: x[1], reverse=True)[:10])
    
    # Payment status breakdown
    payment_status = {
        'fully_paid': 0,
        'partially_paid': 0,
        'unpaid': 0,
        'overpaid': 0
    }
    
    if outstanding_col and revenue_col:
        for _, row in df.iterrows():
            outstanding = float(row[outstanding_col]) if pd.notna(row[outstanding_col]) else 0
            revenue = float(row[revenue_col]) if pd.notna(row[revenue_col]) else 0
            
            if outstanding <= 0 and revenue > 0:
                payment_status['fully_paid'] += 1
            elif outstanding > 0 and outstanding < revenue:
                payment_status['partially_paid'] += 1
            elif outstanding > 0 and outstanding >= revenue:
                payment_status['unpaid'] += 1
            elif outstanding < 0:
                payment_status['overpaid'] += 1
    
    return {
        'summary': summary,
        'by_status': by_status,
        'by_booking_class': by_booking_class,
        'by_source': by_source,
        'by_agent': by_agent,
        'yearly_breakdown': yearly_breakdown,
        'monthly_breakdown': monthly_breakdown,
        'yearly_breakdown_by_class': yearly_breakdown_by_class,
        'monthly_breakdown_by_class': monthly_breakdown_by_class,
        'yearly_breakdown_combined': yearly_breakdown_combined,
        'monthly_breakdown_combined': monthly_breakdown_combined,
        'monthly_bookings': monthly_bookings,
        'top_extras': top_extras,
        'payment_status': payment_status
    }

@https_fn.on_request()
def process_booking_data(req: https_fn.Request) -> https_fn.Response:
    """Cloud Function to process booking data"""
    if req.method != 'POST':
        return https_fn.Response(
            json.dumps({'error': 'Method not allowed'}),
            status=405,
            headers={'Content-Type': 'application/json'}
        )
    
    try:
        # Get CSV content from request
        csv_content = req.get_data(as_text=True)
        
        if not csv_content:
            return https_fn.Response(
                json.dumps({'error': 'No CSV data provided'}),
                status=400,
                headers={'Content-Type': 'application/json'}
            )
        
        print(f"Processing CSV data ({len(csv_content)} characters)...")
        
        # Load and clean data
        df = load_and_clean_data(csv_content)
        
        # Apply business rules
        df = apply_business_rules(df)
        
        # Calculate income and disbursements
        df = calculate_income_and_disbursements(df)
        
        # Process revenue trends
        revenue_trends = process_revenue_and_booking_metrics(df)
        
        # Create breakdowns
        breakdowns = create_breakdowns(df)
        
        # Combine all results
        dashboard_data = {
            **breakdowns,
            'revenue_trends': revenue_trends
        }
        
        # Prepare response
        response_data = {
            'message': 'Data processing completed successfully',
            'timestamp': datetime.now().isoformat(),
            'summary': breakdowns['summary'],
            'dashboard_data': dashboard_data
        }
        
        print(f"Processing completed: {breakdowns['summary']['total_bookings']} bookings processed")
        
        return https_fn.Response(
            json.dumps(response_data, default=str),
            status=200,
            headers={'Content-Type': 'application/json'}
        )
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error processing data: {error_details}")
        return https_fn.Response(
            json.dumps({'error': f'Processing failed: {str(e)}', 'details': error_details}),
            status=500,
            headers={'Content-Type': 'application/json'}
        )

# Occupancy Report Processing Functions
def parse_occupancy_date_from_header(header_row):
    """Parse dates from the header row"""
    import pandas as pd
    dates = []
    month_counts = {}
    
    # Skip first two columns (empty or property/accommodation headers)
    for i in range(2, len(header_row)):
        if hasattr(header_row, 'iloc'):
            # Pandas Series
            cell = header_row.iloc[i] if i < len(header_row) else None
            if pd.isna(cell):
                continue
        elif isinstance(header_row, list):
            # Python list
            cell = header_row[i] if i < len(header_row) else None
        else:
            cell = header_row[i] if i < len(header_row) else None
        
        if not cell or str(cell).strip() == '':
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

def parse_occupancy_row_data(row, dates):
    """Parse a row of occupancy data"""
    property_name = str(row[0]).strip() if len(row) > 0 and row[0] else ''
    accommodation_type = str(row[1]).strip() if len(row) > 1 and row[1] else ''
    
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
            
        value = str(row[col_idx]).strip() if col_idx < len(row) and row[col_idx] else '0'
        
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

def aggregate_occupancy_data_cloud(records, dates):
    """Aggregate occupancy data by various dimensions"""
    
    # Daily totals by property
    daily_by_property = defaultdict(lambda: defaultdict(int))
    
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

def process_occupancy_report_cloud(csv_content: str):
    """Process the occupancy report CSV content"""
    import pandas as pd
    
    # Read the CSV file using csv module directly for better control
    rows = []
    for line in csv_content.split('\n'):
        if line.strip():
            reader = csv_module.reader([line])
            rows.append(list(reader)[0])
    
    df = pd.DataFrame(rows)
    
    # Find the header row (row with month/year labels)
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
        header_row_idx = 11
    
    header_row = df.iloc[header_row_idx]
    
    # Parse dates from header
    dates = parse_occupancy_date_from_header(header_row)
    
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
        row = df.iloc[idx].tolist()
        parsed = parse_occupancy_row_data(row, dates)
        if parsed:
            # Filter out excluded properties
            if parsed['property'] in excluded_properties:
                continue
            
            # Filter out excluded accommodation types
            if parsed['accommodation_type'] in excluded_accommodation_types:
                continue
            
            occupancy_records.append(parsed)
    
    # Aggregate data by different dimensions
    results = aggregate_occupancy_data_cloud(occupancy_records, dates)
    
    return results

@https_fn.on_request()
def process_occupancy_report(req: https_fn.Request) -> https_fn.Response:
    """Cloud Function to process occupancy report data"""
    if req.method != 'POST':
        return https_fn.Response(
            json.dumps({'error': 'Method not allowed'}),
            status=405,
            headers={'Content-Type': 'application/json'}
        )
    
    try:
        # Get CSV content from request
        csv_content = req.get_data(as_text=True)
        
        if not csv_content:
            return https_fn.Response(
                json.dumps({'error': 'No CSV data provided'}),
                status=400,
                headers={'Content-Type': 'application/json'}
            )
        
        print(f"Processing occupancy report CSV data ({len(csv_content)} characters)...")
        
        # Process occupancy report
        occupancy_data = process_occupancy_report_cloud(csv_content)
        
        # Prepare response
        response_data = {
            'message': 'Occupancy report processing completed successfully',
            'timestamp': datetime.now().isoformat(),
            'summary': occupancy_data['summary'],
            'occupancy_data': occupancy_data
        }
        
        print(f"Processing completed: {occupancy_data['summary']['total_occupancy']} total occupancy")
        
        return https_fn.Response(
            json.dumps(response_data, default=str),
            status=200,
            headers={'Content-Type': 'application/json'}
        )
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error processing occupancy report: {error_details}")
        return https_fn.Response(
            json.dumps({'error': f'Processing failed: {str(e)}', 'details': error_details}),
            status=500,
            headers={'Content-Type': 'application/json'}
        )
