/*
  # Fix Storage and Documents Policies for Notebook Sharing

  1. Storage Bucket Policies
    - Allow shared users to upload files to sources bucket
    - Allow shared users to read files from sources bucket
    - Allow shared users to delete files from sources bucket

  2. Documents Table Policies
    - Ensure shared users can create/read/update/delete documents
    - Fix metadata-based access control

  3. Helper Functions
    - Update helper functions to work with storage policies
*/

-- Step 1: Create helper function for storage bucket access
CREATE OR REPLACE FUNCTION has_storage_access(bucket_path text)
RETURNS boolean AS $$
DECLARE
  notebook_id_from_path uuid;
BEGIN
  -- Extract notebook_id from the storage path (format: notebook_id/file_name)
  notebook_id_from_path := split_part(bucket_path, '/', 1)::uuid;
  
  -- Check if user has access to this notebook
  RETURN has_notebook_access(notebook_id_from_path);
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Drop existing storage policies
DROP POLICY IF EXISTS "Users can upload files to their notebook folders" ON storage.objects;
DROP POLICY IF EXISTS "Users can view files from their notebook folders" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete files from their notebook folders" ON storage.objects;
DROP POLICY IF EXISTS "Users can update files in their notebook folders" ON storage.objects;

-- Step 3: Create new storage policies for sources bucket
CREATE POLICY "Users can upload files to accessible notebook folders"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'sources' AND
    has_storage_access(name)
  );

CREATE POLICY "Users can view files from accessible notebook folders"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'sources' AND
    has_storage_access(name)
  );

CREATE POLICY "Users can delete files from accessible notebook folders"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'sources' AND
    has_storage_access(name)
  );

CREATE POLICY "Users can update files in accessible notebook folders"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'sources' AND
    has_storage_access(name)
  );

-- Step 4: Create storage policies for audio bucket (for podcast generation)
CREATE POLICY "Users can upload audio files to accessible notebook folders"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'audio' AND
    has_storage_access(name)
  );

CREATE POLICY "Users can view audio files from accessible notebook folders"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'audio' AND
    has_storage_access(name)
  );

CREATE POLICY "Users can delete audio files from accessible notebook folders"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'audio' AND
    has_storage_access(name)
  );

-- Step 5: Ensure documents table policies are correct
-- (These should already be in place from the previous migration, but let's make sure)

-- Drop existing documents policies
DROP POLICY IF EXISTS "Users can view documents from their notebooks" ON documents;
DROP POLICY IF EXISTS "Users can create documents in their notebooks" ON documents;
DROP POLICY IF EXISTS "Users can update documents in their notebooks" ON documents;
DROP POLICY IF EXISTS "Users can delete documents from their notebooks" ON documents;

-- Create new documents policies
CREATE POLICY "Users can view documents from accessible notebooks"
  ON documents
  FOR SELECT
  TO authenticated
  USING (is_notebook_owner_for_document(metadata));

CREATE POLICY "Users can create documents in accessible notebooks"
  ON documents
  FOR INSERT
  TO authenticated
  WITH CHECK (is_notebook_owner_for_document(metadata));

CREATE POLICY "Users can update documents in accessible notebooks"
  ON documents
  FOR UPDATE
  TO authenticated
  USING (is_notebook_owner_for_document(metadata));

CREATE POLICY "Users can delete documents from accessible notebooks"
  ON documents
  FOR DELETE
  TO authenticated
  USING (is_notebook_owner_for_document(metadata));

-- Step 6: Verify the setup
SELECT 'Storage and documents policies updated for notebook sharing!' as status;

-- Check storage policies
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%accessible%'
ORDER BY policyname;

-- Check documents policies  
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'documents'
ORDER BY policyname;