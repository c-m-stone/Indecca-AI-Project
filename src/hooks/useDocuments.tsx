import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export const useDocuments = (notebookId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: documents = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['created_documents', notebookId],
    queryFn: async () => {
      if (!notebookId) return [];

      const { data, error } = await supabase
        .from('created_documents')
        .select('*')
        .eq('notebook_id', notebookId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Expose the Supabase `created_documents` rows as `documents` to the UI.
      // The sidebar consumes this hook and treats the result as a list of documents,
      // so we keep the consumer-friendly naming even though the table is `created_documents`.
      return data;
    },
    enabled: !!notebookId,
  });

  useEffect(() => {
    if (!notebookId || !user) return;

    console.log('Setting up Realtime subscription for created_documents table, notebook:', notebookId);

    const channel = supabase
      .channel('created-documents-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'created_documents',
          filter: `notebook_id=eq.${notebookId}`
        },
        (payload: any) => {
          console.log('Realtime: Created documents change received:', payload);

          queryClient.setQueryData(['created_documents', notebookId], (oldDocuments: any[] = []) => {
            switch (payload.eventType) {
              case 'INSERT': {
                const newDocument = payload.new as any;
                const existsInsert = oldDocuments.some(doc => doc.id === newDocument?.id);
                if (existsInsert) {
                  console.log('Document already exists, skipping INSERT:', newDocument?.id);
                  return oldDocuments;
                }
                console.log('Adding new document to cache:', newDocument);
                return [newDocument, ...oldDocuments];
              }

              case 'UPDATE': {
                const updatedDocument = payload.new as any;
                console.log('Updating document in cache:', updatedDocument?.id);
                return oldDocuments.map(doc =>
                  doc.id === updatedDocument?.id ? updatedDocument : doc
                );
              }

              case 'DELETE': {
                const deletedDocument = payload.old as any;
                console.log('Removing document from cache:', deletedDocument?.id);
                return oldDocuments.filter(doc => doc.id !== deletedDocument?.id);
              }

              default: {
                console.log('Unknown event type:', payload.eventType);
                return oldDocuments;
              }
            }
          });
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status for created_documents:', status);
      });

    return () => {
      console.log('Cleaning up Realtime subscription for created_documents');
      supabase.removeChannel(channel);
    };
  }, [notebookId, user, queryClient]);

  const deleteDocument = useMutation({
    mutationFn: async ({ documentId, documentName }: { documentId: string; documentName: string }) => {
      if (!notebookId) {
        throw new Error('Cannot delete document without a notebook id');
      }

      const response = await fetch('https://gctehpfm.rpcl.app/webhook/2130ba17-dcee-4ed1-a881-fcf4f34215a3', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: documentId,
          name: documentName,
          notebookId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      return { documentId, documentName };
    },
    onSuccess: ({ documentId, documentName }) => {
      console.log('Document deleted successfully:', { documentId, documentName });
      queryClient.invalidateQueries({ queryKey: ['created_documents', notebookId] });
    },
  });

  return {
    documents,
    isLoading,
    error,
    deleteDocument: deleteDocument.mutate,
    isDeleting: deleteDocument.isPending,
  };
};
