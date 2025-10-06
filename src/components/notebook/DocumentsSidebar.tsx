import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Trash2, Loader as Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useDocuments } from '@/hooks/useDocuments';

interface DocumentsSidebarProps {
  notebookId?: string;
}

const DocumentsSidebar = ({ notebookId }: DocumentsSidebarProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);

  const {
    documents,
    isLoading,
    deleteDocument,
    isDeleting
  } = useDocuments(notebookId);

  const handleRemoveDocument = (document: any) => {
    setSelectedDocument(document);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (selectedDocument) {
      deleteDocument(selectedDocument.id);
      setShowDeleteDialog(false);
      setSelectedDocument(null);
    }
  };

  const handleDownload = (document: any) => {
    if (document.url) {
      window.open(document.url, '_blank');
    }
  };

  return (
    <div className="w-full flex flex-col h-full overflow-hidden">
      <ScrollArea className="flex-1 h-full">
        <div className="p-4">
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-600">Loading documents...</p>
            </div>
          ) : documents && documents.length > 0 ? (
            <div className="space-y-4">
              {documents.map((document) => (
                <Card key={document.id} className="p-3 border border-gray-200">
                  <div className="flex items-start justify-between space-x-3">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <div className="w-6 h-6 bg-white rounded border border-gray-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-gray-400 text-sm">📄</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-gray-900 truncate block">{document.name}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(document)}
                        className="h-8 w-8 p-0"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveDocument(document)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-200 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <span className="text-gray-400 text-2xl">📄</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">AI Created Documents will appear here</h3>
            </div>
          )}
        </div>
      </ScrollArea>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedDocument?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              You're about to delete this document. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DocumentsSidebar;
