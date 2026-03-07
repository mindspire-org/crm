import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, UserPlus, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMessaging } from '@/contexts/MessagingContext';
import { useQuery } from '@tanstack/react-query';
import { getAuthHeaders } from '@/lib/api/messaging';
import { API_BASE } from '@/lib/api/base';
import { useToast } from '@/components/ui/use-toast';

interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
}

export const NewConversation: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ open, onOpenChange }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const { createNewConversation } = useMessaging();
  const { toast } = useToast();

  // Fetch users for the search
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users', searchQuery],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE}/api/users?search=${encodeURIComponent(searchQuery)}&limit=50`,
        { headers: getAuthHeaders() }
      );
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
    enabled: open,
  });

  const handleSelectUser = (user: User) => {
    if (!selectedUsers.some(u => u._id === user._id)) {
      setSelectedUsers([...selectedUsers, user]);
    }
    setSearchQuery('');
  };

  const removeSelectedUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter(user => user._id !== userId));
  };

  const handleCreateConversation = async () => {
    if (selectedUsers.length === 0) return;
    
    setIsCreating(true);
    try {
      await createNewConversation(selectedUsers.map(user => user._id));
      toast({ title: 'Conversation created successfully' });
      onOpenChange(false);
      setSelectedUsers([]);
    } catch (error: any) {
      console.error('Failed to create conversation:', error);
      toast({ 
        title: 'Failed to create conversation', 
        description: error?.message || 'Please try again',
        variant: 'destructive'
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Selected users */}
          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2 p-2 border rounded-md">
              {selectedUsers.map((user) => (
                <div
                  key={user._id}
                  className="flex items-center gap-2 bg-muted px-2 py-1 rounded-full text-sm"
                >
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span>{user.name}</span>
                  <button
                    onClick={() => removeSelectedUser(user._id)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* User search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search users..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Search results */}
          {open && (
            <div className="border rounded-md max-h-60 overflow-auto">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground">
                  Searching...
                </div>
              ) : users.length > 0 ? (
                <ScrollArea className="h-60">
                  {users.map((user: User) => (
                    <button
                      key={user._id}
                      className="w-full text-left p-3 hover:bg-muted flex items-center gap-3"
                      onClick={() => handleSelectUser(user)}
                      disabled={selectedUsers.some(u => u._id === user._id)}
                    >
                      <Avatar>
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{user.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                      </div>
                      {selectedUsers.some(u => u._id === user._id) ? (
                        <div className="text-primary">
                          <UserPlus className="h-4 w-4" />
                        </div>
                      ) : null}
                    </button>
                  ))}
                </ScrollArea>
              ) : (
                <div className="p-4 text-center text-muted-foreground">
                  No users found
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setSelectedUsers([]);
              setSearchQuery('');
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateConversation}
            disabled={selectedUsers.length === 0 || isCreating}
          >
            {isCreating ? 'Creating...' : 'Start Conversation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewConversation;
