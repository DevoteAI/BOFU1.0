// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Define CORS headers inline since the import is causing issues
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', 
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, Authorization',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const AIROPS_API_KEY = "RupciXDLDcCZN3lemLVvxS3TYqtL-KJ5YVr_qubvTX0t9fiPlonZ54yxNYns";
const WORKFLOW_UUID = "a02357db-32c6-40f5-845a-615cee68bc56";

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS preflight request");
    return new Response(null, {
      status: 204, // No content
      headers: corsHeaders
    });
  }

  try {
    // Extract the request body
    const requestData = await req.json();
    console.log("Request data received:", requestData);
    
    // Make the call to AirOps
    const response = await fetch(
      `https://api.airops.com/public_api/airops_apps/${WORKFLOW_UUID}/execute`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AIROPS_API_KEY}`
        },
        body: JSON.stringify({
          inputs: {
            product_card_information: requestData.productData
          }
        })
      }
    );
    
    // Handle non-successful response
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AirOps API error: ${response.status} ${response.statusText}`, errorText);
      
      return new Response(
        JSON.stringify({ 
          error: `AirOps API error: ${response.status} ${response.statusText}`,
          details: errorText
        }),
        { 
          status: response.status,
          headers: { 
            ...corsHeaders,
            "Content-Type": "application/json" 
          } 
        }
      );
    }
    
    // Read response
    const responseData = await response.json();
    console.log("AirOps API response:", responseData);
    
    // Return response with CORS headers
    return new Response(
      JSON.stringify(responseData),
      { 
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json" 
        } 
      }
    );
  } catch (error) {
    console.error("Edge Function error:", error);
    
    // Return error with CORS headers
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString(),
        details: error.stack || "No stack trace available"
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json" 
        } 
      }
    );
  }
});

// To invoke:
// curl -i --location --request POST 'http://localhost:54321/functions/v1/airops-proxy' \
//   --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
//   --header 'Content-Type: application/json' \
//   --data '{"productData":{"productDetails":{"name":"Example Product"}}}' 