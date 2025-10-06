
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSelectedNotebook } from '@/contexts/SelectedNotebookContext';
import { useNavigate } from 'react-router-dom';

export const useNotebooks = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const { setSelectedNotebookId } = useSelectedNotebook();
  const navigate = useNavigate();

  const {
    data: notebooks = [],
    isLoading,
    error,
    isError,
  } = useQuery({
    queryKey: ['notebooks', user?.id],
    queryFn: async () => {
      if (!user) {
        console.log('No user found, returning empty notebooks array');
        return [];
      }
      
      console.log('Fetching notebooks for user:', user.id);
      
      // Get notebooks owned by the user
      const { data: notebooksData, error: notebooksError } = await supabase
        .from('notebooks')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (notebooksError) {
        console.error('Error fetching notebooks:', notebooksError);
        throw notebooksError;
      }

      // Get notebooks shared with the user
      const { data: sharedNotebooksData, error: sharedNotebooksError } = await supabase
        .from('notebook_shares')
        .select(`
          notebooks!inner (
            id,
            title,
            description,
            color,
            icon,
            generation_status,
            audio_overview_generation_status,
            audio_overview_url,
            audio_url_expires_at,
            example_questions,
            created_at,
            updated_at,
            user_id
          )
        `)
        .eq('user_id', user.id);

      if (sharedNotebooksError) {
        console.error('Error fetching shared notebooks:', sharedNotebooksError);
        // Don't throw here - continue with owned notebooks only
      }

      // Extract shared notebooks from the join result
      const sharedNotebooks = sharedNotebooksData?.map(share => share.notebooks).filter(Boolean) || [];
      
      // Combine owned and shared notebooks
      const allNotebooks = [...(notebooksData || []), ...sharedNotebooks];
      
      console.log('Found notebooks:', {
        owned: notebooksData?.length || 0,
        shared: sharedNotebooks.length,
        total: allNotebooks.length
      });

      // Get the most recent chat activity for all notebooks (owned + shared)
      const { data: chatData, error: chatError } = await supabase
        .from('n8n_chat_histories')
        .select('session_id, id')
        .in('session_id', allNotebooks.map(nb => nb.id))
        .order('id', { ascending: false });

      if (chatError) {
        console.error('Error fetching chat histories:', chatError);
        // Continue without chat data if there's an error
      }

      // Create a map of notebook_id to most recent chat id
      const lastChatMap = new Map<string, number>();
      if (chatData) {
        chatData.forEach(chat => {
          if (!lastChatMap.has(chat.session_id)) {
            // Since we ordered by id desc, the first occurrence is the most recent
            lastChatMap.set(chat.session_id, chat.id);
          }
        });
      }

      // Then get source counts separately for each notebook
      const notebooksWithCounts = await Promise.all(
        allNotebooks.map(async (notebook) => {
          const { count, error: countError } = await supabase
            .from('sources')
            .select('*', { count: 'exact', head: true })
            .eq('notebook_id', notebook.id);

          if (countError) {
            console.error('Error fetching source count for notebook:', notebook.id, countError);
            return { 
              ...notebook, 
              sources: [{ count: 0 }],
              last_chat_id: lastChatMap.get(notebook.id) || 0
            };
          }

          return { 
            ...notebook, 
            sources: [{ count: count || 0 }],
            last_chat_id: lastChatMap.get(notebook.id) || 0
          }
        })
      );
      
      const sortedNotebooks = notebooksWithCounts.sort((a, b) => {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });

      console.log('Fetched notebooks:', notebooksWithCounts?.length || 0);
      return sortedNotebooks || [];
    },
    enabled: isAuthenticated && !authLoading,
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      if (error?.message?.includes('JWT') || error?.message?.includes('auth')) {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Set up real-time subscription for notebooks updates
  useEffect(() => {
    if (!user?.id || !isAuthenticated) return;

    console.log('Setting up real-time subscription for notebooks');

    const channel = supabase
      .channel('notebooks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notebooks',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Real-time notebook update received:', payload);
          
          // Invalidate and refetch notebooks when any change occurs
          queryClient.invalidateQueries({ queryKey: ['notebooks', user.id] });
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [user?.id, isAuthenticated, queryClient]);

  const createNotebook = useMutation({
    mutationFn: async (notebookData: { title: string; description?: string }) => {
      console.log('Creating notebook with data:', notebookData);
      console.log('Current user:', user?.id);
      console.log('Is authenticated:', isAuthenticated);
      console.log('Auth loading:', authLoading);
      
      if (!user) {
        console.error('User not authenticated');
        throw new Error('User not authenticated');
      }

      if (!user.id) {
        console.error('User ID is missing');
        throw new Error('User ID is missing from session');
      }

      if (!isAuthenticated) {
        console.error('User session is not authenticated');
        throw new Error('User session is not authenticated');
      }

      // Verify the current session is valid before attempting to create
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session verification failed:', sessionError);
        throw new Error('Session verification failed: ' + sessionError.message);
      }
      
      if (!session || !session.user) {
        console.error('No valid session found');
        throw new Error('No valid session found. Please sign in again.');
      }
      
      console.log('Session verified, user ID:', session.user.id);

      const { data, error } = await supabase
        .from('notebooks')
        .insert({
          title: notebookData.title,
          description: notebookData.description,
          user_id: session.user.id,
          generation_status: 'pending',
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating notebook:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }
      
      console.log('Notebook created successfully:', data);
      return data;
    },
    onSuccess: (data) => {
      console.log('Mutation success, invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['notebooks', user?.id] });
      
      // Set the newly created notebook as selected and navigate to notebook page
      console.log('Navigating to newly created notebook:', data.id);
      setSelectedNotebookId(data.id);
      
      // Use setTimeout to ensure the context state has updated before navigation
      setTimeout(() => {
        navigate('/notebook');
      }, 100);
    },
    onError: (error) => {
      console.error('Mutation error:', error);
    },
  });

  return {
    notebooks,
    isLoading: authLoading || isLoading,
    error: error?.message || null,
    isError,
    createNotebook: createNotebook.mutate,
    isCreating: createNotebook.isPending,
  };
};
