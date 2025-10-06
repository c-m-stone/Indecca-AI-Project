import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, MessageCircle, NotebookPen, FileOutput } from 'lucide-react';
import SourcesSidebar from './SourcesSidebar';
import DocumentsSidebar from './DocumentsSidebar';
import ChatArea from './ChatArea';
import StudioSidebar from './StudioSidebar';
import { Citation } from '@/types/message';

interface MobileNotebookTabsProps {
  hasSource: boolean;
  notebookId?: string;
  notebook?: {
    id: string;
    title: string;
    description?: string;
    generation_status?: string;
    icon?: string;
    example_questions?: string[];
  } | null;
  selectedCitation?: Citation | null;
  onCitationClose?: () => void;
  setSelectedCitation?: (citation: Citation | null) => void;
  onCitationClick?: (citation: Citation) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const MobileNotebookTabs = ({
  hasSource,
  notebookId,
  notebook,
  selectedCitation,
  onCitationClose,
  setSelectedCitation,
  onCitationClick,
  activeTab,
  setActiveTab
}: MobileNotebookTabsProps) => {

  // Handle citation clicks by switching to attachments tab
  const handleCitationClick = (citation: Citation) => {
    setActiveTab('attachments');
    onCitationClick?.(citation);
  };
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="chat" className="flex-1 flex flex-col overflow-hidden">
      <TabsList className="grid w-full grid-cols-4 bg-gray-100 p-1 h-12 rounded-none border-b border-gray-200">
        <TabsTrigger
          value="chat"
          className="flex items-center space-x-2 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
        >
          <MessageCircle className="h-4 w-4" />
          <span className="hidden sm:inline">Chat</span>
        </TabsTrigger>
        <TabsTrigger
          value="attachments"
          className="flex items-center space-x-2 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
        >
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">Sources</span>
        </TabsTrigger>
        <TabsTrigger
          value="documents"
          className="flex items-center space-x-2 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
        >
          <FileOutput className="h-4 w-4" />
          <span className="hidden sm:inline">Documents</span>
        </TabsTrigger>
        <TabsTrigger
          value="studio"
          className="flex items-center space-x-2 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
        >
          <NotebookPen className="h-4 w-4" />
          <span className="hidden sm:inline">Notes</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="chat" className="flex-1 overflow-hidden mt-0">
        <ChatArea
          hasSource={hasSource}
          notebookId={notebookId}
          notebook={notebook}
          onCitationClick={handleCitationClick}
          setActiveTab={setActiveTab}
        />
      </TabsContent>

      <TabsContent value="attachments" className="flex-1 overflow-hidden mt-0">
        <SourcesSidebar
          hasSource={hasSource}
          notebookId={notebookId}
          selectedCitation={selectedCitation}
          onCitationClose={onCitationClose}
          setSelectedCitation={setSelectedCitation}
        />
      </TabsContent>

      <TabsContent value="documents" className="flex-1 overflow-hidden mt-0">
        <DocumentsSidebar
          notebookId={notebookId}
        />
      </TabsContent>

      <TabsContent value="studio" className="flex-1 overflow-hidden mt-0">
        <StudioSidebar
          notebookId={notebookId}
          onCitationClick={handleCitationClick}
          setActiveTab={setActiveTab}
        />
      </TabsContent>
    </Tabs>
  );
};

export default MobileNotebookTabs;