
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotebooks } from '@/hooks/useNotebooks';
import { useSources } from '@/hooks/useSources';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import { useSelectedNotebook } from '@/contexts/SelectedNotebookContext';
import NotebookHeader from '@/components/notebook/NotebookHeader';
import ChatArea from '@/components/notebook/ChatArea';
import RightSidebar from '@/components/notebook/RightSidebar';
import NotebooksList from '@/components/notebook/NotebooksList';
import MobileNotebookTabs from '@/components/notebook/MobileNotebookTabs';
import { Citation } from '@/types/message';
import { useEffect } from 'react';

const Notebook = () => {
  const { selectedNotebookId, setSelectedNotebookId } = useSelectedNotebook();
  const { notebooks } = useNotebooks();
  const { sources } = useSources(selectedNotebookId);
  const navigate = useNavigate();
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [activeTab, setActiveTab] = useState<string>('attachments');
  const isDesktop = useIsDesktop();

  // Auto-select first notebook if no notebook is selected or if current notebook doesn't exist
  useEffect(() => {
    if (notebooks && notebooks.length > 0) {
      if (!selectedNotebookId) {
        // No notebook selected, select first one
        console.log('No notebook selected, selecting first notebook:', notebooks[0].id);
        setSelectedNotebookId(notebooks[0].id);
      } else {
        // Check if current notebook exists in the list
        const currentNotebook = notebooks.find(n => n.id === selectedNotebookId);
        if (!currentNotebook) {
          // Current notebook doesn't exist (maybe deleted), select first one
          console.log('Current notebook not found, selecting first notebook:', notebooks[0].id);
          setSelectedNotebookId(notebooks[0].id);
        }
      }
    }
  }, [notebooks, selectedNotebookId, setSelectedNotebookId]);

  // Handle newly created notebooks - this runs when a new notebook is created
  useEffect(() => {
    if (notebooks && notebooks.length > 0) {
      const firstNotebook = notebooks[0];
      const isVeryNew = new Date(firstNotebook.updated_at).getTime() > (Date.now() - 10000); // Created within last 10 seconds
      const hasNoSources = (firstNotebook.sources?.[0]?.count || 0) === 0;
      const hasNoChatActivity = firstNotebook.last_chat_id === 0;
      
      // Auto-select if this is a very new notebook with no activity and no notebook is currently selected
      // OR if the very new notebook is different from the currently selected one
      if (isVeryNew && hasNoSources && hasNoChatActivity && 
          (!selectedNotebookId || selectedNotebookId !== firstNotebook.id)) {
        console.log('Detected newly created notebook, selecting it:', firstNotebook.id);
        setSelectedNotebookId(firstNotebook.id);
      }
    }
  }, [notebooks?.length, notebooks?.[0]?.id]); // Only depend on notebooks length and first notebook ID

  // Separate effect to handle newly created notebooks - only run once when notebooks first load
  useEffect(() => {
    if (notebooks && notebooks.length > 0 && !selectedNotebookId) {
      const firstNotebook = notebooks[0];
      const isVeryNew = new Date(firstNotebook.updated_at).getTime() > (Date.now() - 30000); // Created within last 30 seconds
      const hasNoSources = (firstNotebook.sources?.[0]?.count || 0) === 0;
      const hasNoChatActivity = firstNotebook.last_chat_id === 0;
      
      // Only auto-select if no notebook is currently selected and the first notebook is very new
      if (isVeryNew && hasNoSources && hasNoChatActivity) {
        console.log('Detected newly created notebook, selecting it:', firstNotebook.id);
        setSelectedNotebookId(firstNotebook.id);
      }
    }
  }, [notebooks?.length]); // Only depend on notebooks length, not the full notebooks array

  // Reset tab to chat when notebook changes
  useEffect(() => {
    setActiveTab('chat');
    setSelectedCitation(null);
  }, [selectedNotebookId]);
  
  const notebook = notebooks?.find(n => n.id === selectedNotebookId);
  const hasSource = sources && sources.length > 0;
  const isSourceDocumentOpen = !!selectedCitation;

  const handleCitationClick = (citation: Citation) => {
    setActiveTab('attachments');
    setSelectedCitation(citation);
  };

  const handleCitationClose = () => {
    setSelectedCitation(null);
  };

  // Dynamic width calculations for desktop - 3 column layout
  const notebooksWidth = 'w-[20%]';
  const chatWidth = 'w-[50%]';
  const rightSidebarWidth = 'w-[30%]';

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      <NotebookHeader 
        title={notebook?.title || 'Saving...'} 
        notebookId={selectedNotebookId} 
      />
      
      {isDesktop ? (
        // Desktop layout (3-column)
        <div className="flex-1 flex overflow-hidden">
          <div className={`${notebooksWidth} flex-shrink-0 border-r border-gray-200`}>
            <NotebooksList />
          </div>
          
          <div className={`${chatWidth} flex-shrink-0`}>
            <ChatArea 
              hasSource={hasSource || false} 
              notebookId={selectedNotebookId}
              notebook={notebook}
              onCitationClick={handleCitationClick}
              setActiveTab={setActiveTab}
            />
          </div>
          
          <div className={`${rightSidebarWidth} flex-shrink-0`}>
            <RightSidebar 
              hasSource={hasSource || false}
              notebookId={selectedNotebookId}
              selectedCitation={selectedCitation}
              onCitationClose={handleCitationClose}
              setSelectedCitation={setSelectedCitation}
              onCitationClick={handleCitationClick}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />
          </div>
        </div>
      ) : (
        // Mobile/Tablet layout (tabs)
        <MobileNotebookTabs
          hasSource={hasSource || false}
          notebookId={selectedNotebookId}
          notebook={notebook}
          selectedCitation={selectedCitation}
          onCitationClose={handleCitationClose}
          setSelectedCitation={setSelectedCitation}
          onCitationClick={handleCitationClick}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      )}
    </div>
  );
};

export default Notebook;
