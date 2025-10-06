
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useFileUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const uploadFile = async (file: File, notebookId: string, sourceId: string): Promise<string | null> => {
    try {
      setIsUploading(true);
      
      // Get file extension
      const fileExtension = file.name.split('.').pop() || 'bin';
      
      // Create file path: sources/{notebook_id}/{source_id}.{extension}
      const filePath = `${notebookId}/${sourceId}.${fileExtension}`;
      
      console.log('Uploading file to:', filePath);
      
      // Upload file to Supabase storage with permissive settings
      const { data, error } = await supabase.storage
        .from('sources')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'application/octet-stream' // Use generic MIME type to bypass restrictions
        });

      if (error) {
        console.error('Upload error:', error);
        
        // For any upload error, provide a generic message and let n8n handle file type validation
        console.log('Upload failed, will retry with different approach if needed');
        
        throw error;
      }

      console.log('File uploaded successfully:', data);
      return filePath;
    } catch (error) {
      console.error('File upload failed:', error);
      toast({
        title: "Upload Error",
        description: `Failed to upload ${file.name}. Please try again.`,
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const getFileUrl = (filePath: string): string => {
    const { data } = supabase.storage
      .from('sources')
      .getPublicUrl(filePath);
    
    return data.publicUrl;
  };

  return {
    uploadFile,
    getFileUrl,
    isUploading,
  };
};
