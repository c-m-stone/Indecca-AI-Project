import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Upload, FileText, Loader2, RefreshCw, MoreVertical, Check, Share } from 'lucide-react';
import { Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useSources } from '@/hooks/useSources';
import MarkdownRenderer from '@/components/chat/MarkdownRenderer';
import SaveToNoteButton from './SaveToNoteButton';
import SaveToSourceButton from './SaveToSourceButton';
import AddSourcesDialog from './AddSourcesDialog';
import ShareDialog from './ShareDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useNotebookDelete } from '@/hooks/useNotebookDelete';
import { useNavigate } from 'react-router-dom';
import { Citation } from '@/types/message';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import { useNotebookSharing } from '@/hooks/useNotebookSharing';
import { useAuth } from '@/contexts/AuthContext';

interface ChatAreaProps {
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
  onCitationClick?: (citation: Citation) => void;
  setActiveTab?: (tab: string) => void;
}

const ChatArea = ({
  hasSource,
  notebookId,
  notebook,
  onCitationClick,
  setActiveTab
}: ChatAreaProps) => {
  const [message, setMessage] = useState('');
  const [chatMode, setChatMode] = useState('Chat');
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);
  const [showAiLoading, setShowAiLoading] = useState(false);
  const [showAddSourcesDialog, setShowAddSourcesDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  
  const isDesktop = useIsDesktop();
  const { user } = useAuth();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset component state when notebook changes
  useEffect(() => {
    setMessage('');
    setChatMode('Chat');
    setPendingUserMessage(null);
    setShowAiLoading(false);
    setLastMessageCount(0);
    setShowDeleteDialog(false);
    setShowShareDialog(false);
  }, [notebookId]);

  const isGenerating = notebook?.generation_status === 'generating';
  
  const {
    messages,
    sendMessage,
    isSending,
    deleteChatHistory,
    isDeletingChatHistory
  } = useChatMessages(notebookId);
  
  const {
    sources
  } = useSources(notebookId);
  
  const {
    deleteNotebook,
    isDeleting
  } = useNotebookDelete();
  
  const {
    sharedUsers
  } = useNotebookSharing(notebookId);
  
  const navigate = useNavigate();
  
  const sourceCount = sources?.length || 0;
  const sharedCount = sharedUsers?.length || 0;
  
  // Check if current user is the owner of the notebook
  const isNotebookOwner = notebook?.user_id === user?.id;

  // Chat is always enabled now - users can chat even without sources
  const isChatDisabled = false;

  // Track when we send a message to show loading state
  const [lastMessageCount, setLastMessageCount] = useState(0);

  // Ref for auto-scrolling to the most recent message
  const latestMessageRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // If we have new messages and we have a pending message, clear it
    if (messages.length > lastMessageCount && pendingUserMessage) {
      setPendingUserMessage(null);
      setShowAiLoading(false);
    }
    setLastMessageCount(messages.length);
  }, [messages.length, lastMessageCount, pendingUserMessage]);

  // Auto-scroll when pending message is set, when messages update, or when AI loading appears
  useEffect(() => {
    if (latestMessageRef.current && scrollAreaRef.current) {
      // Find the viewport within the ScrollArea
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        // Use a small delay to ensure the DOM has updated
        setTimeout(() => {
          latestMessageRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }, 50);
      }
    }
  }, [pendingUserMessage, messages.length, showAiLoading]);
  
  // Auto-focus textarea after AI response
  useEffect(() => {
    // Focus the textarea when AI loading stops (indicating AI response has arrived)
    if (!showAiLoading && !pendingUserMessage && textareaRef.current) {
      // Small delay to ensure the UI has updated
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [showAiLoading, pendingUserMessage]);

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || message.trim();
    if (textToSend && notebookId) {
      try {
        // Store the pending message to display immediately
        setPendingUserMessage(textToSend);
        await sendMessage({
          notebookId: notebookId,
          role: 'user',
          content: textToSend,
          chatMode: chatMode
        });
        setMessage('');
        
        // Reset textarea height after clearing message
        setTimeout(() => {
          const textarea = document.querySelector('textarea[placeholder*="Ask"]') as HTMLTextAreaElement;
          if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = '40px'; // Reset to minimum height
          }
        }, 0);

        // Show AI loading after user message is sent
        setShowAiLoading(true);
      } catch (error) {
        console.error('Failed to send message:', error);
        // Clear pending message on error
        setPendingUserMessage(null);
        setShowAiLoading(false);
      }
    }
  };

  const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const textarea = e.target as HTMLTextAreaElement;
    setMessage(textarea.value);
    
    // Auto-resize the textarea
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const handleRefreshChat = () => {
    if (notebookId) {
      console.log('Refresh button clicked for notebook:', notebookId);
      deleteChatHistory(notebookId);
    }
  };
  
  const handleDeleteNotebook = () => {
    if (notebookId) {
      console.log('Delete notebook button clicked for:', notebookId);
      deleteNotebook(notebookId);
    }
  };
  
  const handleCitationClick = (citation: Citation) => {
    setActiveTab?.('attachments');
    onCitationClick?.(citation);
  };

  // Helper function to determine if message is from user
  const isUserMessage = (msg: any) => {
    const messageType = msg.message?.type || msg.message?.role;
    return messageType === 'human' || messageType === 'user';
  };

  // Helper function to determine if message is from AI
  const isAiMessage = (msg: any) => {
    const messageType = msg.message?.type || msg.message?.role;
    return messageType === 'ai' || messageType === 'assistant';
  };

  // Get the index of the last message for auto-scrolling
  const shouldShowScrollTarget = () => {
    return messages.length > 0 || pendingUserMessage || showAiLoading;
  };

  // Show refresh button if there are any messages (including system messages)
  const hasMessages = messages.length > 0;

  // Update placeholder text based on processing status
  const getPlaceholderText = () => {
    if (sourceCount === 0) {
      return "Enter your prompt here...";
    }
    return "Enter your prompt here...";
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Chat</h2>
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowShareDialog(true)}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              <Share className="h-4 w-4" />
              <span className="hidden sm:inline">
                {sharedCount > 0 ? `Shared (${sharedCount})` : 'Share'}
              </span>
            </Button>
            
            {/* Only show Clear Chat and Delete options if user is the notebook owner */}
            {isNotebookOwner && (
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleRefreshChat} 
                  disabled={isDeletingChatHistory || isChatDisabled || !hasMessages} 
                  className={`flex items-center space-x-2 ${!hasMessages ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <RefreshCw className={`h-4 w-4 ${isDeletingChatHistory ? 'animate-spin' : ''}`} />
                  <span>
                    {isDeletingChatHistory 
                      ? 'Clearing...' 
                      : !hasMessages 
                        ? 'No chat to clear' 
                        : 'Clear Chat'
                    }
                  </span>
                </Button>
                
                <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete everything?</AlertDialogTitle>
                      <AlertDialogDescription>
                        You're about to delete this entire notebook including all chat history and attachments. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDeleteNotebook} 
                        className="bg-red-600 hover:bg-red-700" 
                        disabled={isDeleting}
                      >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 h-full" ref={scrollAreaRef}>
        <div className="p-8">
          <div className="max-w-4xl mx-auto">
            {/* Chat Messages */}
            {(messages.length > 0 || pendingUserMessage || showAiLoading) && (
              <div className="space-y-4">
                {messages.map((msg, index) => (
                  <div key={msg.id} className={`flex ${isUserMessage(msg) ? 'justify-end' : 'justify-start'}`}>
                    <div className={`${isUserMessage(msg) ? 'max-w-xs lg:max-w-md px-4 py-2 bg-blue-500 text-white rounded-lg' : 'w-full'}`}>
                      <div className={isUserMessage(msg) ? '' : 'prose prose-gray max-w-none text-gray-800'}>
                        <MarkdownRenderer 
                          content={msg.message.content} 
                          className={isUserMessage(msg) ? '' : ''} 
                          onCitationClick={handleCitationClick} 
                          isUserMessage={isUserMessage(msg)} 
                          setActiveTab={setActiveTab}
                        />
                      </div>
                      {isAiMessage(msg) && (
                        <div className="mt-2 flex justify-start">
                          <div className="flex space-x-2">
                            <SaveToNoteButton content={msg.message.content} notebookId={notebookId} />
                            <SaveToSourceButton content={msg.message.content} notebookId={notebookId} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Pending user message */}
                {pendingUserMessage && (
                  <div className="flex justify-end">
                    <div className="max-w-xs lg:max-w-md px-4 py-2 bg-blue-500 text-white rounded-lg">
                      <MarkdownRenderer content={pendingUserMessage} className="" isUserMessage={true} />
                    </div>
                  </div>
                )}
                
                {/* AI Loading Indicator */}
                {showAiLoading && (
                  <div className="flex justify-start" ref={latestMessageRef}>
                    <div className="flex items-center space-x-2 px-4 py-3 bg-gray-100 rounded-lg">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{
                        animationDelay: '0.1s'
                      }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{
                        animationDelay: '0.2s'
                      }}></div>
                    </div>
                  </div>
                )}
                
                {/* Scroll target for when no AI loading is shown */}
                {!showAiLoading && shouldShowScrollTarget() && <div ref={latestMessageRef} />}
              </div>
            )}
            
            {/* Empty state when no messages */}
            {messages.length === 0 && !pendingUserMessage && !showAiLoading && (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl">{notebook?.icon || '💬'}</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Start a conversation</h3>
                <p className="text-gray-600">
                  {sourceCount === 0 
                    ? "Ask me anything to get started, or add attachments for more specific help."
                    : "Ask questions about your sources to get started."
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Chat Input - Fixed at bottom */}
      <div className="p-6 border-t border-gray-200 flex-shrink-0">
        <div className="max-w-4xl mx-auto">
          <div className="flex space-x-4">
            <div className="flex-1 relative">
              <Textarea 
                ref={textareaRef}
                placeholder={getPlaceholderText()} 
                value={message} 
                onInput={handleTextareaInput}
                onKeyDown={handleKeyDown}
                rows={1}
                className="min-h-[40px] max-h-[200px] resize-none overflow-y-auto"
                disabled={isChatDisabled || isSending || !!pendingUserMessage} 
              />
            </div>
            {isDesktop ? (
              <Select value={chatMode} onValueChange={setChatMode}>
                <SelectTrigger className="w-32 h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Chat">Chat</SelectItem>
                  <SelectItem value="Meeting Agenda">Meeting Agenda</SelectItem>
                  <SelectItem value="Project Scope" disabled className="text-gray-400">
                    Project Scope (coming soon)
                  </SelectItem>
                  <SelectItem value="Marketing" disabled className="text-gray-400">
                    Marketing (coming soon)
                  </SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-10 w-10">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setChatMode('Chat')}>
                    <div className="flex items-center justify-between w-full">
                      <span>Chat</span>
                      {chatMode === 'Chat' && <Check className="h-4 w-4" />}
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setChatMode('Meeting Agenda')}>
                    <div className="flex items-center justify-between w-full">
                      <span>Meeting Agenda</span>
                      {chatMode === 'Meeting Agenda' && <Check className="h-4 w-4" />}
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled className="text-gray-400 cursor-not-allowed">
                    <div className="flex items-center justify-between w-full">
                      <span>Project Scope (coming soon)</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled className="text-gray-400 cursor-not-allowed">
                    <div className="flex items-center justify-between w-full">
                      <span>Marketing (coming soon)</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button 
              onClick={() => handleSendMessage()} 
              disabled={!message.trim() || isChatDisabled || isSending || !!pendingUserMessage}
            >
              {isSending || pendingUserMessage ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Add Sources Dialog */}
      <AddSourcesDialog 
        open={showAddSourcesDialog} 
        onOpenChange={setShowAddSourcesDialog} 
        notebookId={notebookId} 
      />
      
      {/* Share Dialog */}
      <ShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        notebookId={notebookId}
        notebookTitle={notebook?.title}
      />
      
      {/* Footer */}
      <div className="p-4 border-t border-gray-200 flex-shrink-0">
        <p className="text-center text-sm text-gray-500">IndeccaAI can be inaccurate; please double-check its responses.</p>
      </div>
    </div>
  );
};

export default ChatArea;