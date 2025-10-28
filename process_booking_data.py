#!/usr/bin/env python3
"""
Baines River Camp - Booking Data Processing Script
Processes CSV booking reports and generates JSON data for React dashboard
"""

import pandas as pd
import json
from datetime import datetime
from collections import defaultdict
import numpy as np


def load_and_clean_data(csv_file='bookingData_fixed.csv'):
    """Load and clean the booking data CSV with fixed headers"""
    # The fixed CSV has a clean single header row
    # Skip the 11 metadata rows (rows 1-11, indices 0-10)
    df = pd.read_csv(csv_file, skiprows=11)
    
    # Clean column names
    df.columns = df.columns.str.strip().str.replace('"', '').str.strip()
    
    return df


def apply_business_rules(df):
    """Apply business rules to filter and categorize bookings"""
    
    # Rule 1: Remove all bookings for Property "MV - Matusadona"
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
        # Remove those matching keyword but not in exceptions
        mask_to_remove = mask_to_remove | (keyword_mask & ~exception_mask & ~return_guests_mask)
    
    initial_count = len(df)
    df = df[~mask_to_remove].copy()
    filtered_count = initial_count - len(df)
    print(f"  Removed {filtered_count} staff/management bookings")
    
    # Rule 4 & 3: Categorize as Income/Non-Income Generating
    print("Applying Rules 3 & 4: Categorizing bookings...")
    
    # Get Accommodation column value
    if 'Accommodation' in df.columns:
        df['Accommodation'] = pd.to_numeric(df['Accommodation'], errors='coerce').fillna(0)
    else:
        df['Accommodation'] = 0
        print("  Warning: Accommodation column not found")
    
    # Accommodation exception booking numbers
    accomm_exceptions = ['WB3964', 'WB3762', 'WB4193', 'WB4242']
    
    # Rule 4: Mark bookings with Accommodation = 0 as Non-Income Generating (except specific bookings)
    non_income_mask = (df['Accommodation'] == 0) & (~df['Reservation #'].isin(accomm_exceptions))
    
    # Initialize all as Income Generating
    df['Booking Class'] = 'Income Generating'
    
    # Mark Non-Income Generating
    df.loc[non_income_mask, 'Booking Class'] = 'Non-Income Generating'
    
    income_count = len(df[df['Booking Class'] == 'Income Generating'])
    non_income_count = len(df[df['Booking Class'] == 'Non-Income Generating'])
    print(f"  Income Generating: {income_count}")
    print(f"  Non-Income Generating: {non_income_count}")
    
    return df


def calculate_income_and_disbursements(df):
    """Calculate Income and Disbursements columns"""
    print("Calculating Income and Disbursements columns...")
    
    # Rule 5: Create Income column from sum of specific columns
    income_columns = [
        'WOMEN JEWELRY', 'Shop Purchases', 'Service Fee', 'Private guide and vehicle',
        'Private guide and boat', 'POS Misc', 'Operational', 'Miscellaneous', 'MEN JEWELRY',
        'Luxury Family Suite', 'Luxury Double Suite', 'Lunch ', 'Gratuity', 'Generator Fees',
        'Game Drive National Park', 'Game Drive GMA', 'Fuel', 'Fishing National Park full-day 26',
        'Fishing National Park', 'Fishing GMA', 'F & B', 'F&B', 'Extra Activity in the GMA',
        'Early Check-In / Late Check-Out', "Dual Property Booking - Baines' and Matusadona - T",
        'Drinks Tab', 'Curio: VR Prints', 'Curio: Short Sleeve', 'Curio: Luggage',
        'Curio: Long Sleeve', 'Curio: Jacket', 'Curio: Head & Waist Wear', 'Curio: Golfers',
        'Curio: Dress', 'Curio Shop', 'CURIO', 'COVID TEST - BRC', 'Booking Fee',
        'Boat Cruises GMA', 'Barter Agreement', 'Bar: White Wine', 'Bar: White House',
        'Bar: Whisky', 'Bar: Vodka', 'Bar: Soft Drinks', 'Bar: Single Malt', 'Bar: Rum',
        'Bar: Rose House', 'Bar: Red Wine', 'Bar: Red House', 'Bar: Liqueurs', 'Bar: Gin',
        'Bar: Cordials', 'Bar: Comp/Kitchen', 'Bar: Cider', 'Bar: Champagne / Sparkling',
        'Bar: Brandy', 'Bar: Beer', 'Bar: Aperitif', "Baines' River Camp",
        'BAR: ISLAND SUNDOWNERS', 'BAR: CORKAGE', "Accommodation at Baine's"
    ]
    
    # Also include base columns
    if 'Accommodation' in df.columns:
        income_columns.append('Accommodation')
    if 'Levies' in df.columns:
        income_columns.append('Levies')
    
    # Add discount to subtract
    discount_col = '10% Discount'
    
    # Initialize Income column
    df['Income'] = 0.0
    df['Disbursements'] = 0.0
    
    # Calculate Income for each row
    for idx, row in df.iterrows():
        income = 0.0
        
        # Sum all income columns
        for col in income_columns:
            if col in df.columns:
                try:
                    val = pd.to_numeric(row[col], errors='coerce')
                    if pd.notna(val):
                        income += val
                except:
                    pass
        
        # Subtract 10% Discount if it exists
        if discount_col in df.columns:
            try:
                discount = pd.to_numeric(row[discount_col], errors='coerce')
                if pd.notna(discount):
                    income -= discount
            except:
                pass
        
        df.at[idx, 'Income'] = income
    
    # Rule 6: Calculate Disbursements = Revenue Total - Income
    df['Revenue Total'] = pd.to_numeric(df['Revenue Total'], errors='coerce').fillna(0)
    df['Disbursements'] = df['Revenue Total'] - df['Income']
    
    total_income = df['Income'].sum()
    total_disbursements = df['Disbursements'].sum()
    total_revenue = df['Revenue Total'].sum()
    
    print(f"  Total Income: ${total_income:,.2f}")
    print(f"  Total Disbursements: ${total_disbursements:,.2f}")
    print(f"  Total Revenue: ${total_revenue:,.2f}")
    
    return df


def parse_date(date_str):
    """Parse date string to datetime"""
    if pd.isna(date_str) or date_str == '':
        return None
    try:
        return pd.to_datetime(date_str, format='%d %b %Y')
    except:
        return None


def process_revenue_data(df):
    """Process revenue and booking data into aggregated metrics"""
    
    # Parse dates
    df['Status confirm date'] = df['Status confirm date'].apply(parse_date)
    df['Status provisional date'] = df['Status provisional date'].apply(parse_date)
    df['Arrival date'] = df['Arrival date'].apply(parse_date)
    df['Departure date'] = df['Departure date'].apply(parse_date)
    
    # Convert numeric columns
    numeric_cols = ['Bed nights', 'PAX', 'Revenue Total', 'Payments', 'Total amount outstanding']
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
    
    # Calculate totals
    results = {
        'summary': {
            'total_bookings': len(df),
            'total_revenue': float(df['Revenue Total'].sum()),
            'total_payments': float(df['Payments'].sum()),
            'total_outstanding': float(df['Total amount outstanding'].sum()),
            'total_bed_nights': int(df['Bed nights'].sum()),
            'total_pax': int(df['PAX'].sum()),
            'total_income': float(df['Income'].sum()),
            'total_disbursements': float(df['Disbursements'].sum()),
            'income_generating': int(len(df[df['Booking Class'] == 'Income Generating'])),
            'non_income_generating': int(len(df[df['Booking Class'] == 'Non-Income Generating'])),
            'report_generated': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        },
        'by_status': {},
        'by_source': {},
        'by_agent': {},
        'by_consultant': {},
        'revenue_trends': {},
        'top_extras': {},
        'payment_status': {
            'fully_paid': 0,
            'partially_paid': 0,
            'unpaid': 0,
            'overpaid': 0
        },
        'by_booking_class': {},
        'yearly_breakdown': {},
        'monthly_breakdown': {},
        'yearly_breakdown_by_class': {},
        'monthly_breakdown_by_class': {},
        'yearly_breakdown_combined': {},  # Both class and status
        'monthly_breakdown_combined': {},  # Both class and status
        'monthly_bookings': {}  # Raw booking data for each month
    }
    
    # Group by status
    for status, group in df.groupby('Status'):
        results['by_status'][status] = {
            'count': len(group),
            'revenue': float(group['Revenue Total'].sum()),
            'bed_nights': int(group['Bed nights'].sum()),
            'pax': int(group['PAX'].sum()),
            'income': float(group['Income'].sum()),
            'disbursements': float(group['Disbursements'].sum()),
            'outstanding': float(group['Total amount outstanding'].sum())
        }
    
    # Group by booking class
    for booking_class, group in df.groupby('Booking Class'):
        results['by_booking_class'][booking_class] = {
            'count': len(group),
            'revenue': float(group['Revenue Total'].sum()),
            'bed_nights': int(group['Bed nights'].sum()),
            'pax': int(group['PAX'].sum()),
            'income': float(group['Income'].sum()),
            'disbursements': float(group['Disbursements'].sum()),
            'outstanding': float(group['Total amount outstanding'].sum())
        }
    
    # Group by source
    for source, group in df.groupby('Source'):
        results['by_source'][source] = {
            'count': len(group),
            'revenue': float(group['Revenue Total'].sum()),
            'bed_nights': int(group['Bed nights'].sum())
        }
    
    # Group by agent
    for agent, group in df.groupby('Agent'):
        results['by_agent'][agent] = {
            'count': len(group),
            'revenue': float(group['Revenue Total'].sum()),
            'bed_nights': int(group['Bed nights'].sum())
        }
    
    # Group by consultant
    for consultant, group in df.groupby('Consultant'):
        results['by_consultant'][consultant] = {
            'count': len(group),
            'revenue': float(group['Revenue Total'].sum()),
            'bed_nights': int(group['Bed nights'].sum())
        }
    
    # Revenue trends by month
    df['Month'] = df['Arrival date'].dt.to_period('M')
    for month, group in df.groupby('Month'):
        results['revenue_trends'][str(month)] = {
            'revenue': float(group['Revenue Total'].sum()),
            'bookings': len(group),
            'bed_nights': int(group['Bed nights'].sum())
        }
    
    # Rule 7: Yearly and Monthly breakdown
    df['Year'] = df['Arrival date'].dt.year
    df['Month'] = df['Arrival date'].dt.month_name()
    
    # Yearly breakdown by Status
    for year, year_group in df.groupby('Year'):
        year_data = {}
        for status, status_group in year_group.groupby('Status'):
            year_data[status] = {
                'bed_nights': int(status_group['Bed nights'].sum()),
                'accommodation': float(status_group['Accommodation'].sum()),
                'income': float(status_group['Income'].sum()),
                'disbursements': float(status_group['Disbursements'].sum()),
                'revenue_total': float(status_group['Revenue Total'].sum()),
                'outstanding': float(status_group['Total amount outstanding'].sum())
            }
        results['yearly_breakdown'][str(int(year))] = year_data
    
    # Yearly breakdown by Booking Class
    for year, year_group in df.groupby('Year'):
        year_data = {}
        for booking_class, class_group in year_group.groupby('Booking Class'):
            year_data[booking_class] = {
                'bed_nights': int(class_group['Bed nights'].sum()),
                'accommodation': float(class_group['Accommodation'].sum()),
                'income': float(class_group['Income'].sum()),
                'disbursements': float(class_group['Disbursements'].sum()),
                'revenue_total': float(class_group['Revenue Total'].sum()),
                'outstanding': float(class_group['Total amount outstanding'].sum())
            }
        results['yearly_breakdown_by_class'][str(int(year))] = year_data
    
    # Monthly breakdown by Year and Status
    monthly_data = {}
    for year, year_group in df.groupby('Year'):
        year_str = str(int(year))
        monthly_data[year_str] = {}
        for month, month_group in year_group.groupby('Month'):
            month_data = {}
            for status, status_group in month_group.groupby('Status'):
                month_data[status] = {
                    'bed_nights': int(status_group['Bed nights'].sum()),
                    'accommodation': float(status_group['Accommodation'].sum()),
                    'income': float(status_group['Income'].sum()),
                    'disbursements': float(status_group['Disbursements'].sum()),
                    'revenue_total': float(status_group['Revenue Total'].sum()),
                    'outstanding': float(status_group['Total amount outstanding'].sum())
                }
            monthly_data[year_str][month] = month_data
    results['monthly_breakdown'] = monthly_data
    
    # Monthly breakdown by Year and Booking Class
    monthly_data_by_class = {}
    for year, year_group in df.groupby('Year'):
        year_str = str(int(year))
        monthly_data_by_class[year_str] = {}
        for month, month_group in year_group.groupby('Month'):
            month_data = {}
            for booking_class, class_group in month_group.groupby('Booking Class'):
                month_data[booking_class] = {
                    'bed_nights': int(class_group['Bed nights'].sum()),
                    'accommodation': float(class_group['Accommodation'].sum()),
                    'income': float(class_group['Income'].sum()),
                    'disbursements': float(class_group['Disbursements'].sum()),
                    'revenue_total': float(class_group['Revenue Total'].sum()),
                    'outstanding': float(class_group['Total amount outstanding'].sum())
                }
            monthly_data_by_class[year_str][month] = month_data
    results['monthly_breakdown_by_class'] = monthly_data_by_class
    
    # Export monthly booking details
    monthly_bookings_data = {}
    for year, year_group in df.groupby('Year'):
        year_str = str(int(year))
        monthly_bookings_data[year_str] = {}
        for month, month_group in year_group.groupby('Month'):
            bookings = []
            for idx, booking in month_group.iterrows():
                booking_info = {
                    'reservation_number': str(booking.get('Reservation #', '')),
                    'name': str(booking.get('Reservation name', '')),
                    'status': str(booking.get('Status', '')),
                    'booking_class': str(booking.get('Booking Class', '')),
                    'arrival_date': str(booking.get('Arrival date', '')),
                    'departure_date': str(booking.get('Departure date', '')),
                    'bed_nights': int(booking.get('Bed nights', 0)),
                    'pax': int(booking.get('PAX', 0)),
                    'accommodation': float(booking.get('Accommodation', 0)),
                    'income': float(booking.get('Income', 0)),
                    'disbursements': float(booking.get('Disbursements', 0)),
                    'revenue_total': float(booking.get('Revenue Total', 0)),
                    'outstanding': float(booking.get('Total amount outstanding', 0)),
                    'agent': str(booking.get('Agent', '')),
                    'source': str(booking.get('Source', ''))
                }
                bookings.append(booking_info)
            monthly_bookings_data[year_str][month] = bookings
    results['monthly_bookings'] = monthly_bookings_data
    
    # Combined breakdown by Year, Class, and Status
    yearly_combined = {}
    for year, year_group in df.groupby('Year'):
        year_str = str(int(year))
        yearly_combined[year_str] = {}
        for booking_class, class_group in year_group.groupby('Booking Class'):
            yearly_combined[year_str][booking_class] = {}
            for status, status_group in class_group.groupby('Status'):
                yearly_combined[year_str][booking_class][status] = {
                    'count': len(status_group),
                    'pax': int(status_group['PAX'].sum()),
                    'bed_nights': int(status_group['Bed nights'].sum()),
                    'accommodation': float(status_group['Accommodation'].sum()),
                    'income': float(status_group['Income'].sum()),
                    'disbursements': float(status_group['Disbursements'].sum()),
                    'revenue_total': float(status_group['Revenue Total'].sum()),
                    'outstanding': float(status_group['Total amount outstanding'].sum())
                }
    results['yearly_breakdown_combined'] = yearly_combined
    
    # Combined breakdown by Year, Month, Class, and Status
    monthly_combined = {}
    for year, year_group in df.groupby('Year'):
        year_str = str(int(year))
        monthly_combined[year_str] = {}
        for month, month_group in year_group.groupby('Month'):
            monthly_combined[year_str][month] = {}
            for booking_class, class_group in month_group.groupby('Booking Class'):
                monthly_combined[year_str][month][booking_class] = {}
                for status, status_group in class_group.groupby('Status'):
                    monthly_combined[year_str][month][booking_class][status] = {
                        'count': len(status_group),
                        'pax': int(status_group['PAX'].sum()),
                        'bed_nights': int(status_group['Bed nights'].sum()),
                        'accommodation': float(status_group['Accommodation'].sum()),
                        'income': float(status_group['Income'].sum()),
                        'disbursements': float(status_group['Disbursements'].sum()),
                        'revenue_total': float(status_group['Revenue Total'].sum()),
                        'outstanding': float(status_group['Total amount outstanding'].sum())
                    }
    results['monthly_breakdown_combined'] = monthly_combined
    
    # Top revenue extra categories - exclude the income columns we already calculated
    income_column_names = [
        'WOMEN JEWELRY', 'Shop Purchases', 'Service Fee', 'Private guide and vehicle',
        'Private guide and boat', 'POS Misc', 'Operational', 'Miscellaneous', 'MEN JEWELRY',
        'Luxury Family Suite', 'Luxury Double Suite', 'Lunch ', 'Gratuity', 'Generator Fees',
        'Game Drive National Park', 'Game Drive GMA', 'Fuel', 'Fishing National Park full-day 26',
        'Fishing National Park', 'Fishing GMA', 'F & B', 'F&B', 'Extra Activity in the GMA',
        'Early Check-In / Late Check-Out', "Dual Property Booking - Baines' and Matusadona - T",
        'Drinks Tab', 'Curio: VR Prints', 'Curio: Short Sleeve', 'Curio: Luggage',
        'Curio: Long Sleeve', 'Curio: Jacket', 'Curio: Head & Waist Wear', 'Curio: Golfers',
        'Curio: Dress', 'Curio Shop', 'CURIO', 'COVID TEST - BRC', 'Booking Fee',
        'Boat Cruises GMA', 'Barter Agreement', 'Bar: White Wine', 'Bar: White House',
        'Bar: Whisky', 'Bar: Vodka', 'Bar: Soft Drinks', 'Bar: Single Malt', 'Bar: Rum',
        'Bar: Rose House', 'Bar: Red Wine', 'Bar: Red House', 'Bar: Liqueurs', 'Bar: Gin',
        'Bar: Cordials', 'Bar: Comp/Kitchen', 'Bar: Cider', 'Bar: Champagne / Sparkling',
        'Bar: Brandy', 'Bar: Beer', 'Bar: Aperitif', "Baines' River Camp",
        'BAR: ISLAND SUNDOWNERS', 'BAR: CORKAGE', "Accommodation at Baine's", 'Accommodation', 'Levies'
    ]
    
    extra_revenue = defaultdict(float)
    for col in df.columns:
        if col not in ['Property', 'Reservation #', 'Reservation name', 'Status', 'Status confirm date',
                       'Status provisional date', 'Status cancel date', 'Status quote date', 'Agent',
                       'Source', 'Consultant', 'Arrival date', 'Departure date', 'Bed nights', 'PAX',
                       'Revenue Accommodation', 'Revenue Total', 'Payments', 'Total amount outstanding',
                       'Booking Class', 'Income', 'Disbursements', 'Year', 'Month', 'Accommodation',
                       'Revenue Extras', 'Grouping'] + income_column_names:
            try:
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
                total = float(df[col].sum())
                if total > 0 and 'Unnamed' not in col:
                    extra_revenue[col] = total
            except:
                pass
    
    # Sort and get top 15 extras by revenue
    sorted_extras = sorted(extra_revenue.items(), key=lambda x: x[1], reverse=True)[:15]
    results['top_extras'] = {item[0]: item[1] for item in sorted_extras}
    
    # Payment status analysis
    for idx, row in df.iterrows():
        outstanding = row['Total amount outstanding']
        if outstanding == 0:
            results['payment_status']['fully_paid'] += 1
        elif outstanding < 0:
            results['payment_status']['overpaid'] += 1
        elif outstanding == row['Revenue Total']:
            results['payment_status']['unpaid'] += 1
        else:
            results['payment_status']['partially_paid'] += 1
    
    return results


def process_booking_data():
    """Main processing function"""
    print("Loading booking data...")
    df = load_and_clean_data()
    
    print("Applying business rules...")
    df = apply_business_rules(df)
    
    print("Calculating Income and Disbursements...")
    df = calculate_income_and_disbursements(df)
    
    print("Processing revenue and booking metrics...")
    results = process_revenue_data(df)
    
    # Save processed data to JSON
    output_file = 'dashboard_data.json'
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\nProcessed data saved to {output_file}")
    print(f"  - Total bookings: {results['summary']['total_bookings']}")
    print(f"  - Total revenue: ${results['summary']['total_revenue']:,.2f}")
    print(f"  - Total bed nights: {results['summary']['total_bed_nights']}")
    print(f"  - Income Generating: {results['summary']['income_generating']}")
    print(f"  - Non-Income Generating: {results['summary']['non_income_generating']}")
    
    return results


if __name__ == '__main__':
    process_booking_data()
