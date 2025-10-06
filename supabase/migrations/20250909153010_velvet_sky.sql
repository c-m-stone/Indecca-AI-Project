/*
  # Fix notebook creation policies for authenticated users

  1. Policy Updates
    - Update notebook creation policy to allow any authenticated user to create notebooks
    - Ensure proper foreign key relationship with profiles table
    - Add policy to allow users to view all profiles for sharing functionality

  2. Security
    - Maintain RLS protection while allowing legitimate operations
    - Users can only create notebooks for themselves
    - Users can view other profiles for sharing purposes

  3. Changes
    - Fix "Users can create their own notebooks" policy
    - Add "Users can view all profiles" policy for sharing functionality
    - Ensure profiles table has proper policies for user lookup
*/

-- Fix the notebook creation policy
DROP POLICY IF EXISTS "Users can create their own notebooks" ON public.notebooks;
CREATE POLICY "Users can create their own notebooks"
    ON public.notebooks FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL AND 
        auth.uid() = user_id
    );

-- Add policy to allow users to view all profiles (needed for sharing functionality)
DROP POLICY IF EXISTS "Users can view all profiles for sharing" ON public.profiles;
CREATE POLICY "Users can view all profiles for sharing"
    ON public.profiles FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Ensure users can insert their own profile (this should already exist but let's make sure)
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Add policy to allow users to update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- Ensure RLS is enabled on both tables
ALTER TABLE public.notebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;