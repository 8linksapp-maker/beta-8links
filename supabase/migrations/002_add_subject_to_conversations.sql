-- Add subject column to conversations
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS subject text;
