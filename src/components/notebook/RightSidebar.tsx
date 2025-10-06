import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, NotebookPen, FileOutput } from 'lucide-react';
import SourcesSidebar from './SourcesSidebar';
import StudioSidebar from './StudioSidebar';
import DocumentsSidebar from './DocumentsSidebar';
import { Citation } from '@/types/message';

interface RightSidebarProps {
  hasSource: boolean;
  notebookId?: string;
  selectedCitation?: Citation | null;
  onCitationClose?: () => void;
  setSelectedCitation?: (citation: Citation | null) => void;
  onCitationClick?: (citation: Citation) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const RightSidebar = ({
  hasSource,
  notebookId,
  selectedCitation,
  onCitationClose,
  setSelectedCitation,
  onCitationClick,
  activeTab,
  setActiveTab
}: RightSidebarProps) => {
  return (
    <div className="w-full bg-gray-50 border-l border-gray-200 flex flex-col h-full overflow-hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
          <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1 h-10">
            <TabsTrigger
              value="attachments"
              className="flex items-center space-x-2 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <FileText className="h-4 w-4" />
              <span>Sources</span>
            </TabsTrigger>
            <TabsTrigger
              value="documents"
              className="flex items-center space-x-2 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <FileOutput className="h-4 w-4" />
              <span>Documents</span>
            </TabsTrigger>
            <TabsTrigger
              value="notes"
              className="flex items-center space-x-2 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <NotebookPen className="h-4 w-4" />
              <span>Notes</span>
            </TabsTrigger>
          </TabsList>
        </div>

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

        <TabsContent value="notes" className="flex-1 overflow-hidden mt-0">
          <StudioSidebar
            notebookId={notebookId}
            onCitationClick={onCitationClick}
            setActiveTab={setActiveTab}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RightSidebar;