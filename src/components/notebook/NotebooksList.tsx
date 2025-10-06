import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useNotebooks } from '@/hooks/useNotebooks';
import { useNavigate } from 'react-router-dom';
import { useSelectedNotebook } from '@/contexts/SelectedNotebookContext';
import { Loader2, Plus, Search } from 'lucide-react';
import CreateNotebookDialog from './CreateNotebookDialog';
import { useState, useMemo } from 'react';

const NotebooksList = () => {
  const { notebooks, isLoading, createNotebook, isCreating } = useNotebooks();
  const navigate = useNavigate();
  const { selectedNotebookId, setSelectedNotebookId } = useSelectedNotebook();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const handleNotebookClick = (notebookId: string) => {
    console.log('Notebook clicked:', notebookId, 'Currently selected:', selectedNotebookId);
    console.log('Force selecting notebook:', notebookId);
    setSelectedNotebookId(notebookId);
    // Ensure we're on the notebook page
    if (window.location.pathname !== '/notebook') {
      navigate('/notebook');
    }
  };

  const handleCreateNotebook = () => {
    setShowCreateDialog(true);
  };

  const handleSubmitNotebook = (title: string) => {
    setShowCreateDialog(false);
    createNotebook({
      title,
      description: ''
    });
  };

  // Filter notebooks based on search query
  const filteredNotebooks = useMemo(() => {
    if (!notebooks) return [];
    
    if (!searchQuery.trim()) {
      return notebooks;
    }
    
    const query = searchQuery.toLowerCase().trim();
    return notebooks.filter(notebook => 
      notebook.title.toLowerCase().includes(query)
    );
  }, [notebooks, searchQuery]);

  const getSourceIcon = (type: string) => {
    const iconMap: Record<string, string> = {
      'pdf': '/file-types/PDF.svg',
      'text': '/file-types/TXT.png',
      'website': '/file-types/WEB.svg',
      'youtube': '/file-types/MP3.png',
      'audio': '/file-types/MP3.png',
      'doc': '/file-types/DOC.png',
      'multiple-websites': '/file-types/WEB.svg',
      'copied-text': '/file-types/TXT.png'
    };

    const iconUrl = iconMap[type] || iconMap['text'];
    
    return (
      <img 
        src={iconUrl} 
        alt={`${type} icon`} 
        className="w-full h-full object-contain"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          target.parentElement!.innerHTML = '📄';
        }}
      />
    );
  };

  return (
    <div className="w-full flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <div className="space-y-3">
          <h2 className="text-lg font-medium text-gray-900">Chats</h2>
          
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9 text-sm"
            />
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full" 
            onClick={handleCreateNotebook}
            disabled={isCreating}
          >
            <Plus className="h-4 w-4 mr-2" />
            {isCreating ? 'Creating...' : 'Create new'}
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 h-full">
        <div className="p-4">
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-600">Loading notebooks...</p>
            </div>
          ) : notebooks && notebooks.length > 0 ? (
            <>
              {searchQuery.trim() && (
                <div className="mb-3 text-xs text-gray-500">
                  {filteredNotebooks.length} of {notebooks.length} chat{notebooks.length !== 1 ? 's' : ''}
                </div>
              )}
              
              {filteredNotebooks.length > 0 ? (
                <div className="space-y-3">
                  {filteredNotebooks.map((notebook) => {
                    const isCurrentNotebook = notebook.id === selectedNotebookId;
                    const sourceCount = notebook.sources?.[0]?.count || 0;
                    
                    return (
                      <Card 
                        key={notebook.id} 
                        className={`p-3 cursor-pointer transition-colors ${
                          isCurrentNotebook 
                            ? 'bg-blue-50 border-blue-200' 
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => handleNotebookClick(notebook.id)}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                            <span className="text-xl">{notebook.icon || '📝'}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className={`text-sm font-medium truncate ${
                              isCurrentNotebook ? 'text-blue-900' : 'text-gray-900'
                            }`}>
                              {notebook.title}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">
                              {sourceCount} source{sourceCount !== 1 ? 's' : ''} • {new Date(notebook.updated_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg mx-auto mb-4 flex items-center justify-center">
                    <Search className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-600 mb-2">No chats found</p>
                  <p className="text-xs text-gray-500">Try adjusting your search terms</p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-gray-200 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <span className="text-gray-400 text-xl">📚</span>
              </div>
              <p className="text-sm text-gray-600">No notebooks found</p>
            </div>
          )}
        </div>
      </ScrollArea>

      <CreateNotebookDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleSubmitNotebook}
        isCreating={isCreating}
      />
    </div>
  );
};

export default NotebooksList;