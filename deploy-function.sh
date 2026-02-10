#!/bin/bash

echo "Deploying Cloud Function for data processing..."

# Deploy the Cloud Function
firebase deploy --only functions

echo "Cloud Function deployed successfully!"
echo "Function URL: https://us-central1-dashboard-baines.cloudfunctions.net/process_booking_data"
