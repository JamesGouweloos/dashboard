import pandas as pd
import numpy as np
import json
import sys
import requests
from io import StringIO

def process_booking_data(file_url):
    try:
        # Download the file from the URL
        response = requests.get(file_url)
        response.raise_for_status()  # Raise an exception for bad status codes

        # Use StringIO to treat the string data as a file
        csv_data = StringIO(response.text)

        # Read the CSV data
        df = pd.read_csv(csv_data)

        # The rest of your processing logic remains the same
        # ...

    except requests.exceptions.RequestException as e:
        print(f"Error downloading file: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"An error occurred: {e}")
        sys.exit(1)

if __name__ == '__main__':
    if len(sys.argv) > 1:
        file_url = sys.argv[1]
        process_booking_data(file_url)
    else:
        print("Please provide the file URL as a command-line argument.")
