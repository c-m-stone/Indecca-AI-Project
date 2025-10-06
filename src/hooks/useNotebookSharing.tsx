import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNotebooks } from '@/hooks/useNotebooks';

interface SharedUser {
  id: string;
  user_id: string;
  user_email: string;
  user_full_name?: string;
  shared_at: string;
}

export const useNotebookSharing = (notebookId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { notebooks } = useNotebooks();

  // Fetch shared users for the notebook
  const {
    data: sharedUsers = [],
    isLoading: isLoadingShares,
    error,
  } = useQuery({
    queryKey: ['notebook-shares', notebookId],
    queryFn: async () => {
      if (!notebookId) return [];
      
      console.log('Fetching shared users for notebook:', notebookId);
      
      // First, get the notebook_shares records
      const { data, error } = await supabase
        .from('notebook_shares')
        .select('*')
        .eq('notebook_id', notebookId);

      if (error) {
        console.error('Error fetching shared users:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.log('No shared users found for notebook:', notebookId);
        return [];
      }

      console.log('Found shared users:', data.length);
      console.log('Shared users data:', data);

      // Get unique user IDs to fetch profile information
      const userIds = data.map(share => share.user_id);
      console.log('User IDs to fetch profiles for:', userIds);
      
      // Use the admin function to get user details from auth.users
      const { data: usersData, error: usersError } = await supabase.functions.invoke('get-users');
      
      if (usersError) {
        console.error('Error fetching users from auth.users:', usersError);
        // Fallback to profiles table
        console.log('Falling back to profiles table...');
      }
      
      // Create user map from auth.users data
      let userMap = new Map();
      if (usersData?.users) {
        usersData.users.forEach((user: any) => {
          userMap.set(user.id, {
            email: user.email,
            full_name: user.full_name
          });
        });
      }
      
      // If we don't have users from auth.users, try profiles table
      if (userMap.size === 0) {
        console.log('Fetching from profiles table as fallback...');
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
          // Continue with empty profiles rather than throwing
          console.log('Continuing with empty profiles...');
        } else if (profiles) {
          profiles.forEach(profile => {
            userMap.set(profile.id, {
              email: profile.email,
              full_name: profile.full_name
            });
          });
      }
      }

      console.log('Final user map:', userMap);


      // Transform the data to match the expected interface
      const transformedData = data.map(share => {
        const userInfo = userMap.get(share.user_id);
        
        // If userInfo is not found and this is the current user, use current user's info
        let finalUserInfo = userInfo;
        if (!finalUserInfo && share.user_id === user?.id) {
          finalUserInfo = {
            email: user.email || 'Current User',
            full_name: user.user_metadata?.full_name || null
          };
        }
        
        const result = {
          id: share.id,
          user_id: share.user_id,
          user_email: finalUserInfo?.email || 'Unknown User',
          user_full_name: finalUserInfo?.full_name || null,
          shared_at: share.created_at
        };
        
        console.log('Transformed share record:', result);
        return result;
      });

      console.log('Transformed shared users:', transformedData);
      return transformedData;
    },
    enabled: !!notebookId && !!user,
  });

  // Get notebook owner information
  const notebookOwner = notebooks?.find(n => n.id === notebookId);

  // Share notebook with users
  const shareNotebook = useMutation({
    mutationFn: async ({ userIds }: { userIds: string[] }) => {
      if (!notebookId) throw new Error('Notebook ID is required');
      if (!user) throw new Error('User not authenticated');
      
      console.log('Sharing notebook', notebookId, 'with users:', userIds);
      console.log('Current user ID:', user.id);
      
      // Create share records for each user
      const shareRecords = userIds.map(userId => ({
        notebook_id: notebookId,
        user_id: userId,
        shared_by: user.id
      }));

      console.log('Share records to insert:', shareRecords);

      const { data, error } = await supabase
        .from('notebook_shares')
        .insert(shareRecords)
        .select();

      if (error) {
        console.error('Error creating shares:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      console.log('Shares created successfully:', data);
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Notebook Shared",
        description: "The notebook has been shared successfully.",
      });
      
      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['notebook-shares', notebookId] });
    },
    onError: (error) => {
      console.error('Failed to share notebook:', error);
      toast({
        title: "Sharing Failed",
        description: "Failed to share the notebook. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Remove share access
  const removeShare = useMutation({
    mutationFn: async (shareId: string) => {
      console.log('Removing share:', shareId);
      console.log('Current user ID:', user?.id);
      
      const { error } = await supabase
        .from('notebook_shares')
        .delete()
        .eq('id', shareId);

      if (error) {
        console.error('Error removing share:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      console.log('Share removed successfully');
      return shareId;
    },
    onSuccess: () => {
      toast({
        title: "Access Removed",
        description: "User access has been removed successfully.",
      });
      
      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['notebook-shares', notebookId] });
    },
    onError: (error) => {
      console.error('Failed to remove share:', error);
      toast({
        title: "Removal Failed",
        description: "Failed to remove user access. Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    sharedUsers,
    isLoadingShares,
    notebookOwner,
    shareNotebook: shareNotebook.mutate,
    isSharing: shareNotebook.isPending,
    removeShare: removeShare.mutate,
    isRemovingShare: removeShare.isPending,
  };
};