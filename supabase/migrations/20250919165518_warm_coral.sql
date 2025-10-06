/*
  # Update notebook timestamp when chat messages are added

  1. Database Functions
    - Create function to update notebook updated_at when chat messages are added
    - This ensures notebooks with recent chat activity appear at the top

  2. Triggers
    - Add trigger on n8n_chat_histories table to update parent notebook
    - Trigger fires on INSERT to update the notebook's updated_at timestamp

  3. Changes
    - Notebooks will now be properly sorted by most recent activity
    - Chat activity will move notebooks to the top of the list
*/

-- Function to update notebook timestamp when chat message is added
CREATE OR REPLACE FUNCTION public.update_notebook_on_chat()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update the notebook's updated_at timestamp when a new chat message is added
    UPDATE public.notebooks 
    SET updated_at = timezone('utc'::text, now())
    WHERE id = NEW.session_id::uuid;
    
    RETURN NEW;
END;
$$;

-- Create trigger to automatically update notebook timestamp on new chat messages
DROP TRIGGER IF EXISTS update_notebook_on_chat_insert ON public.n8n_chat_histories;
CREATE TRIGGER update_notebook_on_chat_insert
    AFTER INSERT ON public.n8n_chat_histories
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_notebook_on_chat();