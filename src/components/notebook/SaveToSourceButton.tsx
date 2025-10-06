import React from 'react';
import { Button } from '@/components/ui/button';
import { Wand2 } from 'lucide-react';
import { useSources } from '@/hooks/useSources';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SaveToSourceButtonProps {
  content: string | { segments: any[]; citations: any[] };
  notebookId?: string;
  onSaved?: () => void;
}

const SaveToSourceButton = ({ content, notebookId, onSaved }: SaveToSourceButtonProps) => {
  const { addSourceAsync } = useSources(notebookId);
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSaveToSource = async () => {
    if (!notebookId) return;
    
    console.log('SaveToSourceButton: Saving content as source:', content);
    console.log('SaveToSourceButton: Content type:', typeof content);
    
    setIsSaving(true);
    
    try {
      // Handle both string content and enhanced content with citations
      let contentText: string;
      let title: string;
      
      // Check if this is an AI response with structured content (object with segments)
      const isAIResponse = typeof content === 'object' && content && 'segments' in content && Array.isArray(content.segments);
      
      if (isAIResponse) {
        console.log('SaveToSourceButton: Detected AI response with segments');
        // For AI responses with citations, extract text from segments
        contentText = content.segments.map((segment: any) => segment.text).join('\n\n');
        // Generate title from the first segment's text
        const firstSegmentText = content.segments[0]?.text || 'AI Response';
        title = firstSegmentText.length > 50 ? firstSegmentText.substring(0, 47) + '...' : firstSegmentText;
      } else {
        console.log('SaveToSourceButton: Detected simple text content');
        // For simple string content
        const contentString = typeof content === 'string' ? content : String(content);
        contentText = contentString;
        const firstLine = contentString.split('\n')[0];
        title = firstLine.length > 50 ? firstLine.substring(0, 47) + '...' : firstLine;
      }
      
      console.log('SaveToSourceButton: Final title:', title);
      console.log('SaveToSourceButton: Content length:', contentText.length);

      // Create source record first to get the ID (same as Add Copied Text)
      const createdSource = await addSourceAsync({
        notebookId,
        title: title,
        type: 'text',
        content: contentText,
        processing_status: 'processing',
        metadata: {
          characterCount: contentText.length,
          webhookProcessed: true,
          sourceOrigin: 'saved_chat_response'
        }
      });

      // Send to webhook endpoint with source ID (same as Add Copied Text)
      const { data, error } = await supabase.functions.invoke('process-additional-sources', {
        body: {
          type: 'copied-text',
          notebookId,
          title: title,
          content: contentText,
          sourceIds: [createdSource.id],
          timestamp: new Date().toISOString()
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Saved as Source",
        description: "Chat response has been converted to a source and is being processed."
      });

      onSaved?.();
      
    } catch (error) {
      console.error('Error saving chat response as source:', error);
      toast({
        title: "Error",
        description: "Failed to save as source. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!notebookId) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleSaveToSource}
      disabled={isSaving}
      className="flex items-center space-x-1 text-gray-600 hover:text-gray-800"
    >
      <Wand2 className="h-3 w-3" />
      <span className="text-xs">{isSaving ? 'Saving...' : 'Save to source'}</span>
    </Button>
  );
};

export default SaveToSourceButton;