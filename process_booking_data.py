import pandas as pd
import numpy as np
import json
from datetime import datetime

def load_and_clean_data():
    """Load and clean the booking data from CSV file"""
    print("Loading booking data...")
    
    # Read the fixed CSV file
    df = pd.read_csv('bookingData_fixed.csv')
    
    # Clean column names
    df.columns = df.columns.str.strip()
    
    # Convert date columns
    df['Arrival date'] = pd.to_datetime(df['Arrival date'], errors='coerce')
    df['Departure date'] = pd.to_datetime(df['Departure date'], errors='coerce')
    
    # Extract year and month
    df['Year'] = df['Arrival date'].dt.year
    df['Month'] = df['Arrival date'].dt.month
    
    # Convert numeric columns
    numeric_columns = ['Bed nights', 'PAX', 'Accommodation', 'Revenue Total', 'Total amount outstanding']
    for col in numeric_columns:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
    
    print(f"Loaded {len(df)} bookings")
    return df

def apply_business_rules(df):
    """Apply all business rules to filter and categorize data"""
    print("Applying business rules...")
    
    # Rule 1: Remove MV-Matusadona bookings
    print("Applying Rule 1: Filtering out MV-Matusadona bookings...")
    initial_count = len(df)
    df = df[df['Property'] != 'MV - Matusadona'].copy()
    filtered_count = initial_count - len(df)
    print(f"  Removed {filtered_count} MV-Matusadona bookings")
    
    # Rule 2: Remove bookings containing specific names EXCEPT specific booking numbers AND "Return Guests" source
    print("Applying Rule 2: Filtering out staff/management bookings...")
    keywords = ['Scott', 'Brown', 'Craig', 'Featherby', 'TWF', 'Staff']
    exceptions = ['WB3703', 'WB4118', 'WB2748', 'WB4001', 'WB3556', 'WB4121']
    
    mask_to_remove = False
    for keyword in keywords:
        keyword_mask = df['Reservation name'].str.contains(keyword, case=False, na=False)
        # Keep exceptions
        exception_mask = df['Reservation #'].isin(exceptions)
        # Keep "Return Guests" source
        return_guests_mask = df['Source'].str.contains('Return Guests', case=False, na=False)
        # Remove those matching keyword but not in exceptions AND not "Return Guests"
        mask_to_remove = mask_to_remove | (keyword_mask & ~exception_mask & ~return_guests_mask)
    
    initial_count = len(df)
    df = df[~mask_to_remove].copy()
    filtered_count = initial_count - len(df)
    print(f"  Removed {filtered_count} staff/management bookings")
    
    # Rules 3 & 4: Create booking classes
    print("Applying Rules 3 & 4: Categorizing bookings...")
    df['Booking Class'] = 'Income Generating'  # Default
    
    # Mark bookings with 0 accommodation as Non-Income Generating (with exceptions)
    zero_accommodation_exceptions = ['WB3964', 'Wb3762', 'WB4193', 'WB4242']
    zero_accommodation_mask = (df['Accommodation'] == 0) & (~df['Reservation #'].isin(zero_accommodation_exceptions))
    df.loc[zero_accommodation_mask, 'Booking Class'] = 'Non-Income Generating'
    
    income_generating = len(df[df['Booking Class'] == 'Income Generating'])
    non_income_generating = len(df[df['Booking Class'] == 'Non-Income Generating'])
    print(f"  Income Generating: {income_generating}")
    print(f"  Non-Income Generating: {non_income_generating}")
    
    return df

def calculate_income_and_disbursements(df):
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
    df['Disbursements'] = df['Revenue Total'] - df['Income']
    
    total_income = df['Income'].sum()
    total_disbursements = df['Disbursements'].sum()
    total_revenue = df['Revenue Total'].sum()
    
    print(f"Calculating Income and Disbursements columns...")
    print(f"  Total Income: ${total_income:,.2f}")
    print(f"  Total Disbursements: ${total_disbursements:,.2f}")
    print(f"  Total Revenue: ${total_revenue:,.2f}")
    
    return df

def process_revenue_and_booking_metrics(df):
    """Process revenue trends and booking metrics"""
    print("Processing revenue and booking metrics...")
    
    # Revenue trends by month
    revenue_trends = {}
    for _, row in df.iterrows():
        if pd.notna(row['Arrival date']):
            year = int(row['Year'])
            month = int(row['Month'])
            key = f"{year}-{month:02d}"
            
            if key not in revenue_trends:
                revenue_trends[key] = {
                    'revenue': 0,
                    'bookings': 0,
                    'bed_nights': 0
                }
            
            revenue_trends[key]['revenue'] += row['Revenue Total']
            revenue_trends[key]['bookings'] += 1
            revenue_trends[key]['bed_nights'] += row['Bed nights']
    
    return revenue_trends

def create_breakdowns(df):
    """Create various breakdowns for the dashboard"""
    print("Creating breakdowns...")
    
    # Summary statistics
    summary = {
        'total_bookings': len(df),
        'total_revenue': float(df['Revenue Total'].sum()),
        'total_bed_nights': int(df['Bed nights'].sum()),
        'income_generating': len(df[df['Booking Class'] == 'Income Generating']),
        'non_income_generating': len(df[df['Booking Class'] == 'Non-Income Generating'])
    }
    
    # Breakdown by status
    by_status = {}
    for status, group in df.groupby('Status'):
        by_status[status] = {
            'bookings': len(group),
            'revenue': float(group['Revenue Total'].sum()),
            'bed_nights': int(group['Bed nights'].sum())
        }
    
    # Breakdown by booking class
    by_booking_class = {}
    for booking_class, group in df.groupby('Booking Class'):
        by_booking_class[booking_class] = {
            'bookings': len(group),
            'revenue': float(group['Revenue Total'].sum()),
            'bed_nights': int(group['Bed nights'].sum())
        }
    
    # Breakdown by source
    by_source = {}
    for source, group in df.groupby('Source'):
        by_source[source] = {
            'bookings': len(group),
            'revenue': float(group['Revenue Total'].sum()),
            'bed_nights': int(group['Bed nights'].sum())
        }
    
    # Breakdown by agent
    by_agent = {}
    for agent, group in df.groupby('Agent'):
        by_agent[agent] = {
            'bookings': len(group),
            'revenue': float(group['Revenue Total'].sum()),
            'bed_nights': int(group['Bed nights'].sum())
        }
    
    # Yearly breakdown
    yearly_breakdown = {}
    for year, year_group in df.groupby('Year'):
        year_str = str(int(year))
        yearly_breakdown[year_str] = {}
        for status, status_group in year_group.groupby('Status'):
            yearly_breakdown[year_str][status] = {
                'bed_nights': int(status_group['Bed nights'].sum()),
                'accommodation': float(status_group['Accommodation'].sum()),
                'income': float(status_group['Income'].sum()),
                'disbursements': float(status_group['Disbursements'].sum()),
                'revenue_total': float(status_group['Revenue Total'].sum()),
                'outstanding': float(status_group['Total amount outstanding'].sum())
            }
    
    # Monthly breakdown
    monthly_breakdown = {}
    for year, year_group in df.groupby('Year'):
        year_str = str(int(year))
        monthly_breakdown[year_str] = {}
        for month, month_group in year_group.groupby('Month'):
            monthly_breakdown[year_str][month] = {}
            for status, status_group in month_group.groupby('Status'):
                monthly_breakdown[year_str][month][status] = {
                    'bed_nights': int(status_group['Bed nights'].sum()),
                    'accommodation': float(status_group['Accommodation'].sum()),
                    'income': float(status_group['Income'].sum()),
                    'disbursements': float(status_group['Disbursements'].sum()),
                    'revenue_total': float(status_group['Revenue Total'].sum()),
                    'outstanding': float(status_group['Total amount outstanding'].sum())
                }
    
    # Yearly breakdown by booking class
    yearly_breakdown_by_class = {}
    for year, year_group in df.groupby('Year'):
        year_str = str(int(year))
        yearly_breakdown_by_class[year_str] = {}
        for booking_class, class_group in year_group.groupby('Booking Class'):
            yearly_breakdown_by_class[year_str][booking_class] = {
                'bed_nights': int(class_group['Bed nights'].sum()),
                'accommodation': float(class_group['Accommodation'].sum()),
                'income': float(class_group['Income'].sum()),
                'disbursements': float(class_group['Disbursements'].sum()),
                'revenue_total': float(class_group['Revenue Total'].sum()),
                'outstanding': float(class_group['Total amount outstanding'].sum())
            }
    
    # Monthly breakdown by booking class
    monthly_breakdown_by_class = {}
    for year, year_group in df.groupby('Year'):
        year_str = str(int(year))
        monthly_breakdown_by_class[year_str] = {}
        for month, month_group in year_group.groupby('Month'):
            monthly_breakdown_by_class[year_str][month] = {}
            for booking_class, class_group in month_group.groupby('Booking Class'):
                monthly_breakdown_by_class[year_str][month][booking_class] = {
                    'bed_nights': int(class_group['Bed nights'].sum()),
                    'accommodation': float(class_group['Accommodation'].sum()),
                    'income': float(class_group['Income'].sum()),
                    'disbursements': float(class_group['Disbursements'].sum()),
                    'revenue_total': float(class_group['Revenue Total'].sum()),
                    'outstanding': float(class_group['Total amount outstanding'].sum())
                }
    
    # Combined breakdown by Year, Class, and Status
    yearly_breakdown_combined = {}
    for year, year_group in df.groupby('Year'):
        year_str = str(int(year))
        yearly_breakdown_combined[year_str] = {}
        for booking_class, class_group in year_group.groupby('Booking Class'):
            yearly_breakdown_combined[year_str][booking_class] = {}
            for status, status_group in class_group.groupby('Status'):
                yearly_breakdown_combined[year_str][booking_class][status] = {
                    'count': len(status_group),
                    'pax': int(status_group['PAX'].sum()),
                    'bed_nights': int(status_group['Bed nights'].sum()),
                    'accommodation': float(status_group['Accommodation'].sum()),
                    'income': float(status_group['Income'].sum()),
                    'disbursements': float(status_group['Disbursements'].sum()),
                    'revenue_total': float(status_group['Revenue Total'].sum()),
                    'outstanding': float(status_group['Total amount outstanding'].sum())
                }
    
    # Combined breakdown by Year, Month, Class, and Status
    monthly_breakdown_combined = {}
    for year, year_group in df.groupby('Year'):
        year_str = str(int(year))
        monthly_breakdown_combined[year_str] = {}
        for month, month_group in year_group.groupby('Month'):
            monthly_breakdown_combined[year_str][month] = {}
            for booking_class, class_group in month_group.groupby('Booking Class'):
                monthly_breakdown_combined[year_str][month][booking_class] = {}
                for status, status_group in class_group.groupby('Status'):
                    monthly_breakdown_combined[year_str][month][booking_class][status] = {
                        'count': len(status_group),
                        'pax': int(status_group['PAX'].sum()),
                        'bed_nights': int(status_group['Bed nights'].sum()),
                        'accommodation': float(status_group['Accommodation'].sum()),
                        'income': float(status_group['Income'].sum()),
                        'disbursements': float(status_group['Disbursements'].sum()),
                        'revenue_total': float(status_group['Revenue Total'].sum()),
                        'outstanding': float(status_group['Total amount outstanding'].sum())
                    }
    
    # Monthly bookings for detailed view
    monthly_bookings = {}
    for year, year_group in df.groupby('Year'):
        year_str = str(int(year))
        monthly_bookings[year_str] = {}
        for month, month_group in year_group.groupby('Month'):
            monthly_bookings[year_str][month] = month_group.to_dict('records')
    
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
        'monthly_bookings': monthly_bookings
    }

def main():
    """Main processing function"""
    try:
        # Load and clean data
        df = load_and_clean_data()
        
        # Apply business rules
        df = apply_business_rules(df)
        
        # Calculate income and disbursements
        df = calculate_income_and_disbursements(df)
        
        # Process revenue trends
        revenue_trends = process_revenue_and_booking_metrics(df)
        
        # Create breakdowns
        breakdowns = create_breakdowns(df)
        
        # Combine all results
        results = {
            **breakdowns,
            'revenue_trends': revenue_trends
        }
        
        # Save to JSON file
        with open('dashboard_data.json', 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        print("\nProcessed data saved to dashboard_data.json")
        print(f"  - Total bookings: {results['summary']['total_bookings']}")
        print(f"  - Total revenue: ${results['summary']['total_revenue']:,.2f}")
        print(f"  - Total bed nights: {results['summary']['total_bed_nights']}")
        print(f"  - Income Generating: {results['summary']['income_generating']}")
        print(f"  - Non-Income Generating: {results['summary']['non_income_generating']}")
        
    except Exception as e:
        print(f"Error processing data: {e}")
        raise

if __name__ == "__main__":
    main()