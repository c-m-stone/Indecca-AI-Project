import React from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Globe, Video, Mic } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotebooks } from '@/hooks/useNotebooks';
import { useSelectedNotebook } from '@/contexts/SelectedNotebookContext';
import CreateNotebookDialog from '@/components/notebook/CreateNotebookDialog';

const EmptyDashboard = () => {
  const navigate = useNavigate();
  const [showCreateDialog, setShowCreateDialog] = React.useState(false);
  const { setSelectedNotebookId } = useSelectedNotebook();
  const {
    createNotebook,
    isCreating
  } = useNotebooks();

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

  return <div className="text-center py-16">
      <div className="mb-12">
        <h2 className="text-3xl font-medium text-gray-900 mb-4">Start your first chat</h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">CMS AI Assistant is an AI-powered efficiency tool that allows you to interact with AI in different ways, including project documents and online research.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
            <FileText className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">PDFs</h3>
          <p className="text-gray-600">Upload project plans, reports, and documents</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
            <Globe className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Websites</h3>
          <p className="text-gray-600">Add web pages and online articles as sources</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
          <div className="w-12 h-12 bg-purple-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
            <Video className="h-6 w-6 text-purple-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Audio</h3>
          <p className="text-gray-600">Include multimedia content in your research</p>
        </div>
      </div>

      <Button onClick={handleCreateNotebook} size="lg" className="bg-blue-600 hover:bg-blue-700" disabled={isCreating}>
        <Upload className="h-5 w-5 mr-2" />
        {isCreating ? 'Creating...' : 'Create New Chat'}
      </Button>

      <CreateNotebookDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleSubmitNotebook}
        isCreating={isCreating}
      />
    </div>;
};
export default EmptyDashboard;