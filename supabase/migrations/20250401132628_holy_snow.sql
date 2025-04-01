/*
  # Update profiles table to use company_name

  1. Changes
    - Add company_name column to profiles table
    - Drop full_name column from profiles table
    - Update RLS policies to reflect the change
*/

-- Add company_name column
ALTER TABLE public.profiles
ADD COLUMN company_name text;

-- Copy existing full_name data to company_name
UPDATE public.profiles
SET company_name = full_name
WHERE full_name IS NOT NULL;

-- Drop full_name column
ALTER TABLE public.profiles
DROP COLUMN full_name;