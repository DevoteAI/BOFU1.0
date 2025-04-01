/*
  # Add Research Results Storage

  1. New Tables
    - `research_results`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `title` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `data` (jsonb) - Stores the full research result data
      - `is_draft` (boolean) - Indicates if this is a draft version

  2. Security
    - Enable RLS on research_results table
    - Add policies for CRUD operations
*/

-- Create research_results table
CREATE TABLE IF NOT EXISTS public.research_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  data jsonb NOT NULL,
  is_draft boolean DEFAULT false,
  CONSTRAINT valid_data CHECK (jsonb_typeof(data) = 'array')
);

-- Enable RLS
ALTER TABLE public.research_results ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can create their own research results"
  ON public.research_results
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own research results"
  ON public.research_results
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own research results"
  ON public.research_results
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own research results"
  ON public.research_results
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_research_results_updated_at
  BEFORE UPDATE
  ON public.research_results
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();