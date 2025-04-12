#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Deploying Supabase Edge Functions ===${NC}"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null
then
    echo -e "${RED}Supabase CLI is not installed. Please install it first:${NC}"
    echo -e "${YELLOW}npm install -g supabase${NC}"
    exit 1
fi

# Check login status
echo -e "${GREEN}Checking Supabase login status...${NC}"
SUPABASE_LOGIN_STATUS=$(supabase login)

if [[ $SUPABASE_LOGIN_STATUS == *"Error"* ]]; then
    echo -e "${RED}You need to login to Supabase first.${NC}"
    echo -e "${YELLOW}Run: supabase login${NC}"
    exit 1
fi

# Deploy the edge functions
echo -e "${GREEN}Deploying Edge Functions...${NC}"
supabase functions deploy airops-proxy --no-verify-jwt

echo -e "${GREEN}Deployment complete!${NC}"
echo -e "${YELLOW}You can test your function using:${NC}"
echo -e "supabase functions serve --no-verify-jwt"

exit 0 