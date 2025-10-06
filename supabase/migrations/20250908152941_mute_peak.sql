/*
  # Add user email column to n8n_chat_histories table

  1. Schema Changes
    - Add `user_email` column to `n8n_chat_histories` table
    - Column will store the email of the user who sent the message
    - Column is nullable to maintain compatibility with existing records

  2. Security
    - No RLS changes needed as existing policies remain valid
    - Column will be populated by application logic when new messages are created
*/

-- Add user_email column to n8n_chat_histories table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'n8n_chat_histories' AND column_name = 'user_email'
  ) THEN
    ALTER TABLE n8n_chat_histories ADD COLUMN user_email text;
  END IF;
END $$;