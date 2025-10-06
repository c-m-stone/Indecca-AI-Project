```sql
-- Clear all existing RLS policies for the 'notebooks' table
DROP POLICY IF EXISTS "Users can view their own notebooks" ON public.notebooks;
DROP POLICY IF EXISTS "Users can create their own notebooks" ON public.notebooks;
DROP POLICY IF EXISTS "Users can update their own notebooks" ON public.notebooks;
DROP POLICY IF EXISTS "Users can delete their own notebooks" ON public.notebooks;

-- Recreate RLS policies for the 'notebooks' table

-- Policy for SELECT: Any authenticated user can view notebooks
CREATE POLICY "Any authenticated user can view notebooks"
    ON public.notebooks FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Policy for INSERT: Any authenticated user can create notebooks for themselves
CREATE POLICY "Authenticated users can create their own notebooks"
    ON public.notebooks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy for UPDATE: Only the owner can update their notebooks
CREATE POLICY "Owners can update their notebooks"
    ON public.notebooks FOR UPDATE
    USING (auth.uid() = user_id);

-- Policy for DELETE: Only the owner can delete their notebooks
CREATE POLICY "Owners can delete their notebooks"
    ON public.notebooks FOR DELETE
    USING (auth.uid() = user_id);

-- Ensure RLS is enabled for the 'notebooks' table
ALTER TABLE public.notebooks ENABLE ROW LEVEL SECURITY;
```