
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import NotebookCard from './NotebookCard';
import { Check, Grid3X3, List, ChevronDown } from 'lucide-react';
import { useNotebooks } from '@/hooks/useNotebooks';
import { useNavigate } from 'react-router-dom';
import { useSelectedNotebook } from '@/contexts/SelectedNotebookContext';
import CreateNotebookDialog from '@/components/notebook/CreateNotebookDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const NotebookGrid = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('Most recent');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const {
    notebooks,
    isLoading,
    createNotebook,
    isCreating
  } = useNotebooks();
  const navigate = useNavigate();
  const { setSelectedNotebookId } = useSelectedNotebook();

  const sortedNotebooks = useMemo(() => {
    if (!notebooks) return [];
    
    if (sortBy === 'Most recent') {
      // Notebooks are already sorted by most recent chat activity from the hook
      return notebooks;
    } else if (sortBy === 'Title') {
      // Sort alphabetically by title
      return [...notebooks].sort((a, b) => a.title.localeCompare(b.title));
    }
    
    return notebooks;
  }, [notebooks, sortBy]);

  const handleCreateNotebook = () => {
    setShowCreateDialog(true);
  };

  const handleSubmitNotebook = (title: string) => {
    setShowCreateDialog(false);
    createNotebook({
      title,
      description: '',
    });
  };

  const handleNotebookClick = (notebookId: string, e: React.MouseEvent) => {
    // Check if the click is coming from a delete action or other interactive element
    const target = e.target as HTMLElement;
    const isDeleteAction = target.closest('[data-delete-action="true"]') || target.closest('.delete-button') || target.closest('[role="dialog"]');
    if (isDeleteAction) {
      console.log('Click prevented due to delete action');
      return;
    }
    setSelectedNotebookId(notebookId);
    navigate('/notebook');
  };

  if (isLoading) {
    return <div className="text-center py-16">
        <p className="text-gray-600">Loading notebooks...</p>
      </div>;
  }

  return <div>
      <div className="flex items-center justify-between mb-8">
        <Button className="bg-black hover:bg-gray-800 text-white rounded-full px-6" onClick={handleCreateNotebook} disabled={isCreating}>
          {isCreating ? 'Creating...' : '+ Create new'}
        </Button>
        
        <div className="flex items-center space-x-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center space-x-2 bg-white rounded-lg border px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors">
                <span className="text-sm text-gray-600">{sortBy}</span>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setSortBy('Most recent')} className="flex items-center justify-between">
                Most recent
                {sortBy === 'Most recent' && <Check className="h-4 w-4" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('Title')} className="flex items-center justify-between">
                Title
                {sortBy === 'Title' && <Check className="h-4 w-4" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {sortedNotebooks.map(notebook => <div key={notebook.id} onClick={e => handleNotebookClick(notebook.id, e)}>
            <NotebookCard notebook={{
          id: notebook.id,
          title: notebook.title,
          date: new Date(notebook.updated_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          }),
          sources: notebook.sources?.[0]?.count || 0,
          icon: notebook.icon || '📝',
          color: notebook.color || 'bg-gray-100'
        }} />
          </div>)}
      </div>

      <CreateNotebookDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleSubmitNotebook}
        isCreating={isCreating}
      />
    </div>;
};

export default NotebookGrid;
