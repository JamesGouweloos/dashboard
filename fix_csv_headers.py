#!/usr/bin/env python3
"""
Fix multi-row headers in bookingData.csv by combining rows 12 and 13
"""

import pandas as pd
import csv

def fix_csv_headers(input_file='bookingData.csv', output_file='bookingData_fixed.csv'):
    """Combine rows 12 and 13 into a single header row"""
    
    print(f"Reading {input_file}...")
    
    # Read the file line by line
    with open(input_file, 'r', encoding='utf-8-sig') as f:
        lines = f.readlines()
    
    # Row 11 (index 10): "Grouping" row
    # Row 12 (index 11): Main column headers (Property, Reservation #, etc.)
    # Row 13 (index 12): Revenue category headers (Accommodation, Levies, etc.)
    # Row 14 onwards (index 13+): Actual data
    
    print(f"Total lines: {len(lines)}")
    
    # Parse row 12 (index 11) - main headers
    row12 = next(csv.reader([lines[11]]))
    print(f"Row 12 (main headers) has {len([c for c in row12 if c.strip()])} non-empty columns")
    
    # Parse row 13 (index 12) - revenue headers
    row13 = next(csv.reader([lines[12]]))
    print(f"Row 13 (revenue headers) has {len([c for c in row13 if c.strip()])} non-empty columns")
    
    # Combine: use row12 for first ~15 columns (main fields), then replace the rest with row13 content
    # Get all of row12 first
    combined_headers = list(row12)
    
    # Replace with row13 values where row13 has meaningful content (starting from col 15)
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
    
    # Write the fixed CSV
    print(f"Writing to {output_file}...")
    print(f"Combined header has {len(combined_headers)} columns")
    print(f"Sample headers (first 20): {combined_headers[:20]}")
    
    with open(output_file, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        
        # Write metadata rows 1-10 (indices 0-9)
        for i in range(10):
            writer.writerow(next(csv.reader([lines[i]])))
        
        # Write empty row (skip the grouping row)
        writer.writerow([''] * len(combined_headers))
        
        # Write the combined header
        writer.writerow(combined_headers)
        
        # Write data rows starting from index 13 (original row 14)
        for i in range(13, len(lines)):
            writer.writerow(next(csv.reader([lines[i]])))
    
    print(f"Successfully created {output_file} with single header row")
    
    # Read a sample to verify
    print("\nVerifying the fixed file...")
    df_sample = pd.read_csv(output_file, skiprows=11, nrows=5)
    print(f"First 10 columns: {list(df_sample.columns[:10])}")
    print(f"Sample columns (10-20): {list(df_sample.columns[10:20])}")
    print(f"Shape: {df_sample.shape}")

if __name__ == '__main__':
    fix_csv_headers()
