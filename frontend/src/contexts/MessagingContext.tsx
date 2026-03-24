import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import * as messagingApi from '@/lib/api/messaging';

const getStoredAuthUser = (): { id?: string; _id?: string; email?: string; role?: string } | null => {
  const raw = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

interface MessagingContextType {
  conversations: messagingApi.Conversation[];
  selectedConversation: messagingApi.Conversation | null;
  messages: messagingApi.Message[];
  isLoading: boolean;
  error: Error | null;
  selectConversation: (conversationId: string) => void;
  sendMessage: (content: string, attachments?: any[]) => Promise<void>;
  createNewConversation: (participantIds: string[]) => Promise<void>;
  markAsRead: (messageIds: string[]) => void;
  refreshConversations: () => void;
}

const MessagingContext = createContext<MessagingContextType | undefined>(undefined);

export const MessagingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = getStoredAuthUser();
  const userId = user?.id || user?._id;
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState<messagingApi.Conversation | null>(null);
  
  // Fetch conversations
  const {
    data: conversations = [],
    isLoading: isLoadingConversations,
    error: conversationsError,
    refetch: refetchConversations,
  } = useQuery({
    queryKey: ['conversations'],
    queryFn: messagingApi.fetchConversations,
    enabled: !!userId,
  });

  // Fetch messages for selected conversation
  const {
    data: messages = [],
    isLoading: isLoadingMessages,
    error: messagesError,
  } = useQuery({
    queryKey: ['messages', selectedConversation?._id],
    queryFn: () => {
      if (!selectedConversation?._id) return [];
      return messagingApi.fetchMessages(selectedConversation._id);
    },
    enabled: !!selectedConversation?._id,
  });

  // Set the first conversation as selected when conversations are loaded
  useEffect(() => {
    if (conversations.length > 0 && !selectedConversation) {
      const firstValid = (Array.isArray(conversations) ? conversations : []).find((c: any) => c && c._id);
      if (firstValid) setSelectedConversation(firstValid);
    }
  }, [conversations, selectedConversation]);

  // Mutation for sending a message
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, attachments = [] }: { content: string; attachments?: any[] }) => {
      if (!selectedConversation) throw new Error('No conversation selected');
      return messagingApi.sendMessage(selectedConversation._id, content, attachments);
    },
    onSuccess: (newMessage) => {
      // Update the messages query cache
      queryClient.setQueryData(['messages', selectedConversation?._id], (old: any) => 
        [...(old || []), newMessage]
      );
      
      // Update the conversations list with the new last message
      queryClient.setQueryData(['conversations'], (old: any) =>
        (Array.isArray(old) ? old : []).map((conv: any) =>
          conv._id === selectedConversation?._id
            ? { ...conv, lastMessage: newMessage, updatedAt: new Date().toISOString() }
            : conv
        )
      );
    },
  });

  // Mutation for creating a new conversation
  const createConversationMutation = useMutation({
    mutationFn: messagingApi.createConversation,
    onSuccess: (newConversation) => {
      // Add the new conversation to the list
      queryClient.setQueryData(['conversations'], (old: any) => [newConversation, ...(Array.isArray(old) ? old : [])]);
      setSelectedConversation(newConversation);
    },
  });

  // Mutation for marking messages as read
  const markAsReadMutation = useMutation({
    mutationFn: messagingApi.markMessagesAsRead,
    onSuccess: (_, messageIds) => {
      // Update the messages in the current conversation
      queryClient.setQueryData(['messages', selectedConversation?._id], (old: any) =>
        (Array.isArray(old) ? old : []).map((msg: any) =>
          messageIds.includes(msg._id) 
            ? { ...msg, readBy: [...(msg.readBy || []), userId] }
            : msg
        )
      );
      
      // Update the unread count in the conversations list
      queryClient.setQueryData(['conversations'], (old: any) =>
        (Array.isArray(old) ? old : []).map((conv: any) =>
          conv._id === selectedConversation?._id
            ? { ...conv, unreadCount: 0 }
            : conv
        )
      );
    },
  });

  const selectConversation = useCallback((conversationId: string) => {
    if (!conversationId) {
      setSelectedConversation(null);
      return;
    }
    const conversation = (Array.isArray(conversations) ? conversations : []).find((c: any) => c && c._id === conversationId);
    if (conversation) {
      setSelectedConversation(conversation);
    }
  }, [conversations]);

  const handleSendMessage = useCallback(async (content: string, attachments: any[] = []) => {
    if (!content.trim() && attachments.length === 0) return;
    
    try {
      await sendMessageMutation.mutateAsync({ content, attachments });
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }, [sendMessageMutation]);

  const createNewConversation = useCallback(async (participantIds: string[]) => {
    try {
      await createConversationMutation.mutateAsync(participantIds);
    } catch (error) {
      console.error('Failed to create conversation:', error);
      throw error;
    }
  }, [createConversationMutation]);

  const markAsRead = useCallback((messageIds: string[]) => {
    if (messageIds.length === 0) return;
    markAsReadMutation.mutate(messageIds);
  }, [markAsReadMutation]);

  const refreshConversations = useCallback(() => {
    refetchConversations();
  }, [refetchConversations]);

  const value = {
    conversations,
    selectedConversation,
    messages,
    isLoading: isLoadingConversations || isLoadingMessages || sendMessageMutation.isPending,
    // Do not surface sendMessage mutation error as a page-level error; it's handled via toasts.
    error: conversationsError || messagesError,
    selectConversation,
    sendMessage: handleSendMessage,
    createNewConversation,
    markAsRead,
    refreshConversations,
  };

  return (
    <MessagingContext.Provider value={value}>
      {children}
    </MessagingContext.Provider>
  );
};

export const useMessaging = (): MessagingContextType => {
  const context = useContext(MessagingContext);
  if (context === undefined) {
    throw new Error('useMessaging must be used within a MessagingProvider');
  }
  return context;
};
