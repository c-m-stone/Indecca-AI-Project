/*
  # Fix Sources Bucket Policies for Sharing

  1. Storage Policies
    - Enable shared users to upload files to accessible notebook folders
    - Allow shared users to view, update, and delete files from accessible notebooks
    - Use helper function to check notebook access via sharing

  2. Helper Functions
    - Create storage access helper function that checks both ownership and sharing
    - Extract notebook ID from storage path for access control
*/

-- Create helper function to check notebook access from storage path
CREATE OR REPLACE FUNCTION storage_has_notebook_access(bucket_id text, object_name text, user_id uuid)
RETURNS boolean AS $$
DECLARE
  notebook_id_from_path uuid;
BEGIN
  -- Extract notebook_id from the file path (format: notebook_id/source_id.extension)
  BEGIN
    notebook_id_from_path := split_part(object_name, '/', 1)::uuid;
  EXCEPTION WHEN OTHERS THEN
    -- If path doesn't contain a valid UUID, deny access
    RETURN false;
  END;
  
  -- Check if user has access to this notebook (owner or shared)
  RETURN EXISTS (
    SELECT 1 FROM notebooks 
    WHERE id = notebook_id_from_path AND notebooks.user_id = storage_has_notebook_access.user_id
  ) OR EXISTS (
    SELECT 1 FROM notebook_shares 
    WHERE notebook_shares.notebook_id = notebook_id_from_path 
    AND notebook_shares.user_id = storage_has_notebook_access.user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies for sources bucket to avoid conflicts
DROP POLICY IF EXISTS "Users can upload to accessible notebook folders in sources" ON storage.objects;
DROP POLICY IF EXISTS "Users can view files from accessible notebooks in sources" ON storage.objects;
DROP POLICY IF EXISTS "Users can update files in accessible notebooks in sources" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete files from accessible notebooks in sources" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload files to their notebooks" ON storage.objects;
DROP POLICY IF EXISTS "Users can view files from their notebooks" ON storage.objects;
DROP POLICY IF EXISTS "Users can update files in their notebooks" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete files from their notebooks" ON storage.objects;

-- Create new comprehensive policies for sources bucket
CREATE POLICY "Sources bucket - Users can upload to accessible notebooks"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'sources' AND
    storage_has_notebook_access(bucket_id, name, auth.uid())
  );

CREATE POLICY "Sources bucket - Users can view files from accessible notebooks"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'sources' AND
    storage_has_notebook_access(bucket_id, name, auth.uid())
  );

CREATE POLICY "Sources bucket - Users can update files in accessible notebooks"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'sources' AND
    storage_has_notebook_access(bucket_id, name, auth.uid())
  );

CREATE POLICY "Sources bucket - Users can delete files from accessible notebooks"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'sources' AND
    storage_has_notebook_access(bucket_id, name, auth.uid())
  );

-- Also create policies for audio bucket (for podcast generation)
CREATE POLICY "Audio bucket - Users can upload to accessible notebooks"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'audio' AND
    storage_has_notebook_access(bucket_id, name, auth.uid())
  );

CREATE POLICY "Audio bucket - Users can view files from accessible notebooks"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'audio' AND
    storage_has_notebook_access(bucket_id, name, auth.uid())
  );

CREATE POLICY "Audio bucket - Users can update files in accessible notebooks"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'audio' AND
    storage_has_notebook_access(bucket_id, name, auth.uid())
  );

CREATE POLICY "Audio bucket - Users can delete files from accessible notebooks"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'audio' AND
    storage_has_notebook_access(bucket_id, name, auth.uid())
  );

-- Verify the policies were created
SELECT 'Storage bucket policies updated successfully!' as status;

-- Show the created policies for verification
SELECT 
  policyname, 
  cmd as operation,
  CASE 
    WHEN policyname LIKE '%sources%' THEN 'sources bucket'
    WHEN policyname LIKE '%audio%' THEN 'audio bucket'
    ELSE 'other'
  END as bucket_type
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects' 
  AND (policyname LIKE '%Sources bucket%' OR policyname LIKE '%Audio bucket%')
ORDER BY bucket_type, cmd;