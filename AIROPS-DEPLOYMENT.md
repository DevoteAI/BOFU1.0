# AirOps Integration Deployment Guide

This guide explains how to deploy and test the AirOps integration for your BOFU-AI project.

## Overview

The AirOps integration allows sending product card information to AirOps workflows. We've implemented this with two approaches:

1. **Primary Method**: Supabase Edge Function proxy (server-side, avoids CORS issues)
2. **Fallback Method**: Direct API call (used if the Edge Function is unavailable)

## Prerequisites

- Node.js installed
- Supabase CLI installed (`npm install -g supabase`)
- Supabase account with access to your project

## Deploying the Supabase Edge Function

### Option 1: Using the Deployment Script

1. Make sure the script is executable:
   ```bash
   chmod +x deploy-edge-functions.sh
   ```

2. Run the deployment script:
   ```bash
   ./deploy-edge-functions.sh
   ```

### Option 2: Manual Deployment

1. Login to Supabase CLI (if not already logged in):
   ```bash
   supabase login
   ```

2. Deploy the Edge Function:
   ```bash
   supabase functions deploy airops-proxy --no-verify-jwt
   ```

## Testing the Integration

### Option 1: Use the Test Script

We've created a standalone test script to verify the AirOps API works:

1. Make sure the script is executable:
   ```bash
   chmod +x test-airops-api.js
   ```

2. Run the test script:
   ```bash
   node test-airops-api.js
   ```

### Option 2: Test in the Application

1. Start your application:
   ```bash
   npm run dev
   ```

2. Navigate to the Admin Dashboard
3. Find a product card and click the "Send to AirOps" button
4. Check the browser console for logs and results

## Troubleshooting

### CORS Issues

If you see CORS errors in the console:

1. Verify the Edge Function is deployed
2. Check that the Edge Function has the correct CORS headers
3. Ensure the Edge Function URL matches what's in your application

### Authentication Issues

If you see authentication errors:

1. Verify your AirOps API key is correct
2. Check that the user is logged in (required for Supabase Functions)
3. Make sure you're passing the API key properly in the requests

### Edge Function Errors

If the Edge Function is failing:

1. Check the Supabase Functions logs in the Supabase dashboard
2. Try running the function locally for testing:
   ```bash
   supabase functions serve --no-verify-jwt
   ```
3. Make a test request to the local function:
   ```bash
   curl -X POST http://localhost:54321/functions/v1/airops-proxy \
     -H "Content-Type: application/json" \
     -d '{"productData":{"productDetails":{"name":"Test"}}}'
   ```

## Need More Help?

Contact our support team or refer to the AirOps documentation at [https://docs.airops.com/](https://docs.airops.com/) for more information. 