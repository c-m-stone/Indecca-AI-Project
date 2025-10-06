import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Users, UserPlus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNotebookSharing } from '@/hooks/useNotebookSharing';

interface User {
  id: string;
  email: string;
  full_name?: string;
}

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notebookId?: string;
  notebookTitle?: string;
}

const ShareDialog = ({ open, onOpenChange, notebookId, notebookTitle }: ShareDialogProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  
  const {
    sharedUsers: sharedUsersData,
    isLoadingShares,
    notebookOwner,
    shareNotebook,
    isSharing,
    removeShare,
    isRemovingShare
  } = useNotebookSharing(notebookId);

  // Convert shared users data to Set for easier lookup
  const sharedUsers = new Set(sharedUsersData.map(share => share.user_id));

  // Fetch all users from profiles table
  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open, notebookId]);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      console.log('Fetching users from auth.users via Edge Function, excluding current user:', currentUser?.id);
      
      // Call the Edge Function to get users from auth.users table
      const { data, error } = await supabase.functions.invoke('get-users');

      if (error) throw error;
      
      console.log('Fetched users:', data?.users?.length || 0);
      // Combine the users list with current user info for complete user lookup
      const allUsers = [...(data?.users || [])];
      if (data?.currentUser) {
        allUsers.push(data.currentUser);
      }
      setUsers(allUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to load users. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingUsers(false);
    }
  };


  const handleUserToggle = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleShare = () => {
    if (!notebookId || selectedUsers.size === 0) return;

    shareNotebook({ userIds: Array.from(selectedUsers) }, {
      onSuccess: () => {
        setSelectedUsers(new Set());
        onOpenChange(false);
      }
    });
  };

  const handleRemoveSharedUser = (userId: string) => {
    const shareToRemove = sharedUsersData.find(share => share.user_id === userId);
    if (shareToRemove) {
      removeShare(shareToRemove.id);
    }
  };

  // Reset selected users when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedUsers(new Set());
      setSearchQuery('');
    }
  }, [open]);

  const handleClose = () => {
    setSelectedUsers(new Set());
    setSearchQuery('');
    onOpenChange(false);
  };

  // Filter users based on search query
  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.full_name && user.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Get notebook owner details for display
  const getNotebookOwnerDetails = () => {
    if (!notebookOwner) return null;
    
    // Try to find owner in the users list first
    const ownerFromList = users.find(u => u.id === notebookOwner.user_id);
    if (ownerFromList) {
      return ownerFromList;
    }
    
    // If not found in users list (which excludes current user), check if current user is owner
    if (currentUser?.id === notebookOwner.user_id) {
      return {
        id: currentUser.id,
        email: currentUser.email || '',
        full_name: currentUser.user_metadata?.full_name || null
      };
    }
    
    return null;
  };

  const ownerDetails = getNotebookOwnerDetails();

  // Get user details for display
  const getUserDetails = (userId: string) => {
    return users.find(u => u.id === userId);
  };

  const getInitials = (email: string, fullName?: string) => {
    if (fullName) {
      return fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-600" />
            <span>Share Notebook</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Notebook Info */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-900 truncate">{notebookTitle}</p>
            <p className="text-xs text-gray-500">Full access will be granted to selected users</p>
          </div>

          {/* Currently Shared Users */}
          {sharedUsers.size > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Currently Shared With</Label>
              <div className="space-y-2">
                {sharedUsersData.map(share => {
                  return (
                    <div key={share.id} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                            {getInitials(share.user_email || '', share.user_full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{share.user_full_name || share.user_email}</p>
                          {share.user_full_name && (
                            <p className="text-xs text-gray-500">{share.user_email}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveSharedUser(share.user_id)}
                        disabled={isRemovingShare}
                        className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Search Users */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Add People</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* User List */}
          <div className="space-y-2">
            {isLoadingUsers ? (
              <div className="text-center py-4">
                <p className="text-sm text-gray-600">Loading users...</p>
              </div>
            ) : filteredUsers.length > 0 ? (
              <ScrollArea className="max-h-60">
                <div className="space-y-1">
                  {/* Show notebook owner first, greyed out */}
                  {ownerDetails && (
                    <div className="flex items-center space-x-3 p-2 rounded-lg bg-gray-100 opacity-75">
                      <div className="w-4 h-4 flex items-center justify-center">
                        {/* Empty space where checkbox would be */}
                      </div>
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-sm bg-gray-200 text-gray-600">
                          {getInitials(ownerDetails.email, ownerDetails.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-600 truncate">
                          {ownerDetails.full_name || ownerDetails.email}
                        </p>
                        {ownerDetails.full_name && (
                          <p className="text-xs text-gray-500 truncate">{ownerDetails.email}</p>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                        Owner
                      </Badge>
                    </div>
                  )}
                  
                  {/* Show other users */}
                  {filteredUsers.map(user => {
                    const isSelected = selectedUsers.has(user.id);
                    const isAlreadyShared = sharedUsers.has(user.id);
                    const isOwner = user.id === notebookOwner?.user_id;
                    
                    // Don't show the owner in the regular user list since we show them separately
                    if (isOwner) return null;
                    
                    return (
                      <div
                        key={user.id}
                        className={`flex items-center space-x-3 p-2 rounded-lg cursor-pointer transition-colors ${
                          isAlreadyShared 
                            ? 'bg-gray-100 opacity-50 cursor-not-allowed' 
                            : isSelected 
                              ? 'bg-blue-50 border border-blue-200' 
                              : 'hover:bg-gray-50'
                        }`}
                        onClick={() => !isAlreadyShared && handleUserToggle(user.id)}
                      >
                        <Checkbox
                          checked={isSelected}
                          disabled={isAlreadyShared}
                          onChange={() => !isAlreadyShared && handleUserToggle(user.id)}
                        />
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-sm">
                            {getInitials(user.email, user.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {user.full_name || user.email}
                          </p>
                          {user.full_name && (
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                          )}
                        </div>
                        {isAlreadyShared && (
                          <Badge variant="secondary" className="text-xs">
                            Shared
                          </Badge>
                        )}
                      </div>
                    );
                  }).filter(Boolean)}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-600">
                  {searchQuery ? 'No users found matching your search' : 'No other users available'}
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleShare}
              disabled={selectedUsers.size === 0 || isSharing}
            >
              {isSharing ? (
                <>
                  <UserPlus className="h-4 w-4 mr-2 animate-pulse" />
                  Sharing...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Share ({selectedUsers.size})
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareDialog;