/*
  # Create RLS policies for notebooks and notebook_shares tables

  1. Notebooks Table Policies
    - Any authenticated user can create notebooks for themselves
    - Only owners and shared users can view notebooks
    - Only owners can update their notebooks
    - Only owners can delete their notebooks

  2. Notebook Shares Table Policies
    - Users can view shares they initiated or where they are recipients
    - Users can create shares for notebooks they own
    - Users can delete shares they initiated or remove themselves from shares

  3. Security
    - Enable RLS on both tables
    - Ensure proper access control based on ownership and sharing relationships
*/

-- ============================================================================
-- CLEAR EXISTING POLICIES FOR NOTEBOOKS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Any authenticated user can view notebooks" ON public.notebooks;
DROP POLICY IF EXISTS "Users can view their own notebooks" ON public.notebooks;
DROP POLICY IF EXISTS "Users can create their own notebooks" ON public.notebooks;
DROP POLICY IF EXISTS "Users can update their own notebooks" ON public.notebooks;
DROP POLICY IF EXISTS "Users can delete their own notebooks" ON public.notebooks;
DROP POLICY IF EXISTS "Authenticated users can create their own notebooks" ON public.notebooks;
DROP POLICY IF EXISTS "Owners can update their notebooks" ON public.notebooks;
DROP POLICY IF EXISTS "Owners can delete their notebooks" ON public.notebooks;
DROP POLICY IF EXISTS "Owners and shared users can view notebooks" ON public.notebooks;

-- ============================================================================
-- CREATE NEW POLICIES FOR NOTEBOOKS TABLE
-- ============================================================================

-- Policy for SELECT: Owners or users shared to the notebook can view it
CREATE POLICY "Owners and shared users can view notebooks"
    ON public.notebooks FOR SELECT
    USING (
        auth.uid() = user_id -- User is the owner
        OR EXISTS (
            SELECT 1
            FROM public.notebook_shares
            WHERE notebook_id = notebooks.id
            AND user_id = auth.uid()
        ) -- Notebook is shared with the user
    );

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

-- ============================================================================
-- CLEAR EXISTING POLICIES FOR NOTEBOOK_SHARES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own notebook shares" ON public.notebook_shares;
DROP POLICY IF EXISTS "Users can create notebook shares" ON public.notebook_shares;
DROP POLICY IF EXISTS "Users can delete their own notebook shares" ON public.notebook_shares;
DROP POLICY IF EXISTS "Users can delete shares where they are the recipient" ON public.notebook_shares;

-- ============================================================================
-- CREATE NEW POLICIES FOR NOTEBOOK_SHARES TABLE
-- ============================================================================

-- Policy for SELECT: Users can view shares where they are the sharer or the recipient
CREATE POLICY "Users can view their own notebook shares"
    ON public.notebook_shares FOR SELECT
    USING (
        auth.uid() = shared_by
        OR auth.uid() = user_id
    );

-- Policy for INSERT: Users can create notebook shares for notebooks they own
CREATE POLICY "Users can create notebook shares"
    ON public.notebook_shares FOR INSERT
    WITH CHECK (
        auth.uid() = shared_by
        AND EXISTS (
            SELECT 1
            FROM public.notebooks
            WHERE id = notebook_id
            AND user_id = auth.uid()
        )
    );

-- Policy for DELETE: Users can delete shares they initiated or remove themselves from shares
CREATE POLICY "Users can delete their own notebook shares"
    ON public.notebook_shares FOR DELETE
    USING (
        auth.uid() = shared_by
        OR auth.uid() = user_id
    );

-- ============================================================================
-- ENSURE RLS IS ENABLED
-- ============================================================================

-- Ensure Row Level Security is enabled for both tables
ALTER TABLE public.notebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notebook_shares ENABLE ROW LEVEL SECURITY;