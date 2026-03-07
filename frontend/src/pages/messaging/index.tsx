import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, MessageSquare, Users, Send, Paperclip, Smile, MoreVertical, Plus, Phone, Video, Info, Mic, Edit3, Trash2, Settings, Palette, Link as LinkIcon, StopCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useMessaging } from '@/contexts/MessagingContext';
import { NewConversation } from './components/NewConversation';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import EmojiPicker from 'emoji-picker-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { uploadAttachment, editMessage as apiEditMessage, deleteMessage as apiDeleteMessage, deleteConversation as apiDeleteConversation } from '@/lib/api/messaging';
import { API_BASE } from '@/lib/api/base';

const getStoredAuthUser = (): { id?: string; _id?: string; email?: string; role?: string } | null => {
  const raw = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export default function Messaging() {
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [isNewConversationOpen, setIsNewConversationOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [chatTheme, setChatTheme] = useState<'whatsapp' | 'midnight' | 'purple'>(() => {
    try {
      const v = localStorage.getItem('chat_theme');
      return (v === 'whatsapp' || v === 'midnight' || v === 'purple') ? (v as any) : 'whatsapp';
    } catch {
      return 'whatsapp';
    }
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingMs, setRecordingMs] = useState(0);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [voicePreviewUrl, setVoicePreviewUrl] = useState<string>('');
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recorderChunksRef = useRef<BlobPart[]>([]);
  const recordStartRef = useRef<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const user = getStoredAuthUser();
  const userId = user?.id || user?._id;
  const role = user?.role || 'admin';
  const navigate = useNavigate();
  const location = useLocation();

  const stopVoicePreview = useCallback(() => {
    if (voicePreviewUrl) URL.revokeObjectURL(voicePreviewUrl);
    setVoicePreviewUrl('');
    setVoiceBlob(null);
  }, [voicePreviewUrl]);

  useEffect(() => {
    return () => {
      try {
        if (voicePreviewUrl) URL.revokeObjectURL(voicePreviewUrl);
      } catch {}
    };
  }, [voicePreviewUrl]);

  useEffect(() => {
    try { localStorage.setItem('chat_theme', chatTheme); } catch {}
  }, [chatTheme]);
  
  const {
    conversations,
    selectedConversation,
    messages,
    isLoading,
    error,
    selectConversation,
    sendMessage,
    refreshConversations,
  } = useMessaging();

  const safeConversations = useMemo(() => {
    return (Array.isArray(conversations) ? conversations : []).filter(
      (c: any) => c && typeof c === 'object' && c._id
    );
  }, [conversations]);

  const safeMessages = useMemo(() => {
    return (Array.isArray(messages) ? messages : []).filter(
      (m: any) => m && typeof m === 'object' && m._id
    );
  }, [messages]);

  const conversationIdFromUrl = useMemo(() => {
    const sp = new URLSearchParams(location.search || '');
    const v = sp.get('conversationId');
    return v ? String(v) : '';
  }, [location.search]);

  useEffect(() => {
    if (!conversationIdFromUrl) return;
    const target = safeConversations.find((c) => c._id === conversationIdFromUrl);
    if (target && (!selectedConversation || selectedConversation?._id !== target._id)) {
      selectConversation(target._id);
    }
  }, [conversationIdFromUrl, safeConversations, selectedConversation, selectConversation]);

  // Handle sending a new message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && !selectedFile && !voiceBlob) return;

    try {
      const attachments: any[] = [];
      if (selectedFile) {
        const uploaded = await uploadAttachment(selectedFile);
        attachments.push({
          url: uploaded.url,
          name: selectedFile.name,
          type: selectedFile.type,
          size: selectedFile.size,
        });
      }

      if (voiceBlob) {
        const voiceFile = new File([voiceBlob], `voice-${Date.now()}.webm`, { type: voiceBlob.type || 'audio/webm' });
        const uploaded = await uploadAttachment(voiceFile);
        attachments.push({
          url: uploaded.url,
          name: uploaded.name || voiceFile.name,
          type: uploaded.type || voiceFile.type,
          size: uploaded.size || voiceFile.size,
        });
      }

      await sendMessage(newMessage, attachments);
      setNewMessage('');
      setSelectedFile(null);
      stopVoicePreview();
      setShowEmojiPicker(false);
      scrollToBottom();
      toast({ title: 'Message sent' });
    } catch (error) {
      // Fallback: some servers expect attachments as string[] and content required
      const msg = String((error as any)?.message || '');
      if (selectedFile && (msg.includes('Cast to [string]') || msg.toLowerCase().includes('content is required'))) {
        try {
          const attachmentsAsStrings: any[] = [];
          // Use the already uploaded file URL from previous attempt if possible
          // If upload failed earlier, try fresh upload now
          if (!attachmentsAsStrings.length) {
            const uploaded = await uploadAttachment(selectedFile);
            attachmentsAsStrings.push(uploaded.url);
          }
          await sendMessage(newMessage || ' ', attachmentsAsStrings);
          setNewMessage('');
          setSelectedFile(null);
          setShowEmojiPicker(false);
          scrollToBottom();
          return;
        } catch (e2: any) {
          toast({ title: 'Error', description: e2.message || 'Failed to send message', variant: 'destructive' });
          return;
        }
      }
      toast({ title: 'Error', description: msg || 'Failed to send message', variant: 'destructive' });
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      toast({
        title: 'File selected',
        description: `${file.name} attached`,
      });
    }
  };

  const startRecording = useCallback(async () => {
    if (!selectedConversation) {
      toast({ title: 'Select a conversation first', variant: 'destructive' });
      return;
    }
    if (isRecording) return;
    try {
      stopVoicePreview();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const mimeCandidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
      const mimeType = mimeCandidates.find((m) => (window as any).MediaRecorder?.isTypeSupported?.(m)) || '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      recorderChunksRef.current = [];
      recordStartRef.current = Date.now();
      setRecordingMs(0);

      recorder.ondataavailable = (ev: BlobEvent) => {
        if (ev.data && ev.data.size > 0) recorderChunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        try {
          stream.getTracks().forEach((t) => t.stop());
        } catch {}
        const blob = new Blob(recorderChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size > 0) {
          setVoiceBlob(blob);
          const url = URL.createObjectURL(blob);
          setVoicePreviewUrl(url);
        }
      };

      recorder.start();
      setIsRecording(true);
    } catch (e: any) {
      toast({ title: 'Microphone permission denied', description: e?.message || 'Unable to access microphone', variant: 'destructive' });
    }
  }, [isRecording, selectedConversation, stopVoicePreview, toast]);

  const stopRecording = useCallback(() => {
    if (!isRecording) return;
    setIsRecording(false);
    try {
      recorderRef.current?.stop();
    } catch {}
  }, [isRecording]);

  useEffect(() => {
    if (!isRecording) return;
    const t = window.setInterval(() => {
      setRecordingMs(Date.now() - (recordStartRef.current || Date.now()));
    }, 200);
    return () => window.clearInterval(t);
  }, [isRecording]);

  const meetingRoomId = useMemo(() => {
    if (!selectedConversation?._id) return '';
    return `healthspire-${selectedConversation._id}`;
  }, [selectedConversation?._id]);

  const createMeetingLink = useCallback(
    (type: 'audio' | 'video') => {
      if (!meetingRoomId) return '';
      const base = `https://meet.jit.si/${encodeURIComponent(meetingRoomId)}`;
      const params = new URLSearchParams();
      if (type === 'audio') params.set('config.startWithVideoMuted', 'true');
      return params.toString() ? `${base}#${params.toString()}` : base;
    },
    [meetingRoomId]
  );

  const openMeeting = useCallback(
    (type: 'audio' | 'video') => {
      if (!selectedConversation) {
        toast({ title: 'Select a conversation first', variant: 'destructive' });
        return;
      }
      const url = createMeetingLink(type);
      if (!url) return;
      window.open(url, '_blank', 'noopener,noreferrer');
    },
    [createMeetingLink, selectedConversation, toast]
  );

  const shareMeeting = useCallback(async () => {
    if (!selectedConversation) {
      toast({ title: 'Select a conversation first', variant: 'destructive' });
      return;
    }
    const url = createMeetingLink('video');
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Meeting link copied' });
    } catch {
      toast({ title: 'Meeting link', description: url });
    }
    try {
      await sendMessage(`Meeting link: ${url}`, []);
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to send meeting link', variant: 'destructive' });
    }
  }, [createMeetingLink, selectedConversation, sendMessage, toast]);

  // Handle emoji selection
  const handleEmojiSelect = (emoji: any) => {
    setNewMessage((prev) => prev + emoji.emoji);
    setShowEmojiPicker(false);
  };

  const handleStartEdit = (message: any) => {
    setEditingMessageId(message._id);
    setEditText(message.content || '');
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditText('');
  };

  const handleSaveEdit = async () => {
    if (!editingMessageId) return;
    try {
      const updated = await apiEditMessage(editingMessageId, editText);
      queryClient.setQueryData(['messages', selectedConversation?._id], (old: any) =>
        Array.isArray(old)
          ? old.map((m) => (m._id === updated._id ? updated : m))
          : old
      );
      setEditingMessageId(null);
      setEditText('');
      toast({ title: 'Message updated' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to update message', variant: 'destructive' });
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await apiDeleteMessage(messageId);
      queryClient.setQueryData(['messages', selectedConversation?._id], (old: any) =>
        Array.isArray(old)
          ? old.map((m) => (m._id === messageId ? { ...m, isDeleted: true, content: '' } : m))
          : old
      );
      toast({ title: 'Message deleted' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to delete message', variant: 'destructive' });
    }
  };

  // Handle delete conversation with confirmation
  const handleDeleteConversation = async () => {
    if (!selectedConversation?._id) return;
    
    // Show confirmation dialog
    if (!window.confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
      return;
    }

    try {
      await apiDeleteConversation(selectedConversation._id);
      // Immediately remove deleted conversation from cache so it disappears from sidebar
      queryClient.setQueryData(['conversations'], (old: any) =>
        Array.isArray(old) ? old.filter((c: any) => c._id !== selectedConversation._id) : old
      );
      // Immediately clear selected conversation and its messages from cache
      selectConversation('');
      queryClient.removeQueries({ queryKey: ['messages', selectedConversation._id] });
      toast({ title: 'Conversation deleted' });
    } catch (e: any) {
      console.error('Delete conversation error:', e);
      toast({ title: 'Error', description: e.message || 'Failed to delete conversation', variant: 'destructive' });
    }
  };

  // Handle conversation selection
  const handleSelectConversation = (conversationId: string) => {
    if (!conversationId) return;
    selectConversation(conversationId);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Get other participants in a conversation (excluding current user)
  const getOtherParticipants = useCallback((conversation: any) => {
    if (!conversation?.participants) return [];
    if (conversation.isGroup) {
      return (conversation.participants || []).filter(Boolean);
    }
    // For 1:1 chats, return the other participant (not the current user)
    return (conversation.participants || []).filter((p: any) => p?._id !== userId);
  }, [userId]);

  // Get conversation title
  const getConversationTitle = useCallback((conversation: any) => {
    if (conversation.isGroup) {
      const names = (conversation.participants || []).filter(Boolean).map((p: any) => p?.name).filter(Boolean);
      return conversation.groupName || names.join(', ');
    }
    const otherParticipants = getOtherParticipants(conversation);
    return otherParticipants[0]?.name || 'Unknown User';
  }, [getOtherParticipants]);

  const themeTokens = useMemo(() => {
    if (chatTheme === 'midnight') {
      return {
        accent: 'bg-slate-900',
        accentSoft: 'bg-slate-900/80',
        ring: 'ring-slate-400/20',
        bubbleMine: 'bg-slate-900 text-white',
        bubbleTheirs: 'bg-white/90 dark:bg-white/10',
        bubbleMineText: 'text-white',
        header: 'bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60',
        sidebar: 'bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60',
      };
    }
    if (chatTheme === 'purple') {
      return {
        accent: 'bg-violet-600',
        accentSoft: 'bg-violet-600/90',
        ring: 'ring-violet-500/25',
        bubbleMine: 'bg-violet-600 text-white',
        bubbleTheirs: 'bg-white/90 dark:bg-white/10',
        bubbleMineText: 'text-white',
        header: 'bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60',
        sidebar: 'bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60',
      };
    }
    return {
      accent: 'bg-emerald-600',
      accentSoft: 'bg-emerald-600/90',
      ring: 'ring-emerald-500/25',
      bubbleMine: 'bg-emerald-600 text-white',
      bubbleTheirs: 'bg-white/90 dark:bg-white/10',
      bubbleMineText: 'text-white',
      header: 'bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60',
      sidebar: 'bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60',
    };
  }, [chatTheme]);

  const chatBgStyle = useMemo(() => {
    const lightSvg =
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140' viewBox='0 0 140 140'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='.04'%3E%3Cpath d='M19 18h8v8h-8zM69 54h10v10H69zM112 26h7v7h-7zM36 92h9v9h-9zM94 96h8v8h-8z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E";
    const darkSvg =
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140' viewBox='0 0 140 140'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23fff' fill-opacity='.06'%3E%3Cpath d='M19 18h8v8h-8zM69 54h10v10H69zM112 26h7v7h-7zM36 92h9v9h-9zM94 96h8v8h-8z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E";
    return {
      backgroundImage: `url("${lightSvg}")`,
      backgroundSize: '180px 180px',
      backgroundPosition: 'center',
      backgroundRepeat: 'repeat',
    } as React.CSSProperties;
  }, []);

  // Get conversation avatar URL
  const getAvatarUrl = useCallback((conversation: any) => {
    if (conversation.isGroup) {
      return conversation.groupPhoto || '';
    }
    const otherParticipants = getOtherParticipants(conversation);
    return otherParticipants[0]?.avatar || '';
  }, [getOtherParticipants]);

  // Get fallback text for avatar
  const getAvatarFallback = useCallback((conversation: any) => {
    if (conversation.isGroup) {
      return conversation.groupName 
        ? conversation.groupName.split(' ').map((n: string) => n[0]).join('').toUpperCase()
        : 'G';
    }
    const otherParticipants = getOtherParticipants(conversation);
    return otherParticipants[0]?.name?.charAt(0).toUpperCase() || 'U';
  }, [getOtherParticipants]);

  if (isLoading && !selectedConversation) {
    return (
      <div className="flex h-screen bg-background">
        <div className="w-80 border-r bg-background flex flex-col">
          <div className="p-4 border-b">
            <Skeleton className="h-10 w-full mb-4" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="flex-1 p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center bg-muted/50">
          <div className="text-center space-y-3">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Select a conversation to start messaging</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-destructive text-center space-y-2">
          <MessageSquare className="h-12 w-12 mx-auto" />
          <p>Failed to load messages</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] overflow-hidden bg-gradient-to-br from-slate-50 via-white to-emerald-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/10">
      {/* New Conversation Dialog */}
      {role !== 'client' ? (
        <NewConversation 
          open={isNewConversationOpen} 
          onOpenChange={setIsNewConversationOpen} 
        />
      ) : null}
      
      {/* Sidebar */}
      <div className={`w-80 border-r bg-background flex flex-col overflow-hidden ${themeTokens.sidebar}`}>
        <div className={`p-4 border-b ${themeTokens.header}`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Messages</h2>
            <div className="flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-8 w-8">
                    <Palette className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setChatTheme('whatsapp')}>WhatsApp Green</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setChatTheme('midnight')}>Midnight</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setChatTheme('purple')}>Purple</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {role !== 'client' && (
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-8 w-8"
                  onClick={() => setIsNewConversationOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search conversations..."
              className={`w-full pl-10 h-10 bg-muted/50 border-0 focus-visible:ring-2 ${themeTokens.ring}`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        {/* Conversation List */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
          <div className="divide-y divide-border p-2">
            {safeConversations.filter(conv => {
              if (!searchQuery) return true;
              const searchLower = searchQuery.toLowerCase();
              const title = getConversationTitle(conv).toLowerCase();
              const lastMessage = conv.lastMessage?.content?.toLowerCase() || '';
              return title.includes(searchLower) || lastMessage.includes(searchLower);
            }).map((conversation) => (
              <div
                key={conversation._id}
                className={`p-3 hover:bg-muted/50 cursor-pointer transition-colors ${
                  selectedConversation?._id === conversation._id ? 'bg-muted' : ''
                }`}
                onClick={() => handleSelectConversation(conversation._id)}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={getAvatarUrl(conversation)} />
                      <AvatarFallback className="text-sm font-medium">{getAvatarFallback(conversation)}</AvatarFallback>
                    </Avatar>
                    {selectedConversation?._id === conversation._id && (
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-background"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="font-medium truncate text-sm">{getConversationTitle(conversation)}</h3>
                      <span className="text-xs text-muted-foreground ml-2">
                        {format(new Date(conversation.updatedAt), 'p')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {conversation.lastMessage && (
                        <p className="text-sm text-muted-foreground truncate flex-1">
                          {conversation.lastMessage?.sender?._id === userId ? 'You: ' : ''}
                          {conversation.lastMessage.content || 'Sent an attachment'}
                        </p>
                      )}
                      {conversation.unreadCount > 0 && (
                        <span className="bg-primary text-primary-foreground text-xs rounded-full h-5 min-w-[20px] flex items-center justify-center px-1.5">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {safeConversations.length === 0 && !isLoading && (
              <div className="p-8 text-center text-muted-foreground">
                <MessageSquare className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p className="mb-4">No conversations yet</p>
                {role !== 'client' && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsNewConversationOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Start a new conversation
                  </Button>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className={`border-b px-4 py-3 flex items-center justify-between ${themeTokens.header}`}>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={getAvatarUrl(selectedConversation)} />
                    <AvatarFallback className="text-sm font-medium">{getAvatarFallback(selectedConversation)}</AvatarFallback>
                  </Avatar>
                  <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background ${themeTokens.accent}`}></div>
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{getConversationTitle(selectedConversation)}</h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedConversation.isGroup
                      ? `${selectedConversation.participants.length} participants`
                      : 'Active now'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openMeeting('audio')}>
                  <Phone className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openMeeting('video')}>
                  <Video className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Info className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setIsNewConversationOpen(true)}>
                      <Users className="mr-2 h-4 w-4" /> New group
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={shareMeeting}>
                      <LinkIcon className="mr-2 h-4 w-4" /> Align meeting
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDeleteConversation} className="text-destructive focus:text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete conversation
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-hidden relative" style={chatBgStyle}>
              <ScrollArea className="h-full">
                <div className="p-4 space-y-3 min-h-0">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center space-y-2">
                      <div className={`mx-auto h-12 w-12 rounded-2xl ${themeTokens.accentSoft} flex items-center justify-center text-white shadow-lg`}>
                        <MessageSquare className="h-6 w-6" />
                      </div>
                      <p className="text-sm">No messages yet</p>
                      <p className="text-xs text-muted-foreground">Send a message to start the conversation.</p>
                    </div>
                  </div>
                ) : (
                  safeMessages.map((message) => {
                    const isOwn = message.sender?._id === userId;
                    const canModify = isOwn || (Array.isArray(selectedConversation?.admins) && selectedConversation.admins?.includes?.(userId));
                    return (
                      <div
                        key={message._id}
                        className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isOwn && (
                          <div className="flex-shrink-0">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={message.sender?.avatar} />
                              <AvatarFallback>{message.sender?.name?.charAt(0) || 'U'}</AvatarFallback>
                            </Avatar>
                          </div>
                        )}
                        <div className="max-w-[72%]">
                          {(!isOwn && selectedConversation.isGroup) && (
                            <span className="text-xs text-muted-foreground block mb-1">
                              {message.sender?.name || 'Unknown User'}
                            </span>
                          )}
                          <div
                            className={
                              "px-4 py-2 shadow-sm border border-white/30 dark:border-white/10 " +
                              (isOwn
                                ? `${themeTokens.bubbleMine} rounded-2xl rounded-br-md`
                                : `${themeTokens.bubbleTheirs} rounded-2xl rounded-bl-md`)
                            }
                          >
                            {message.isDeleted ? (
                              <p className={`italic text-xs ${isOwn ? 'text-primary-foreground/80' : 'text-foreground/70'}`}>Message deleted</p>
                            ) : editingMessageId === message._id ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  value={editText}
                                  onChange={(e) => setEditText(e.target.value)}
                                  placeholder="Edit message..."
                                  className={`${isOwn ? 'bg-primary/20 text-primary-foreground' : ''}`}
                                />
                                <Button size="sm" type="button" onClick={handleSaveEdit}>Save</Button>
                                <Button size="sm" type="button" variant="ghost" onClick={handleCancelEdit}>Cancel</Button>
                              </div>
                            ) : (
                              <p className="whitespace-pre-wrap break-words">{message.content}</p>
                            )}
                            {Array.isArray(message.attachments) && message.attachments.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {message.attachments.map((att, idx) => {
                                  const rawUrl = typeof att === 'string' ? att : att.url;
                                  const url = rawUrl?.startsWith('http') ? rawUrl : `${API_BASE}${rawUrl || ''}`;
                                  const label = typeof att === 'string'
                                    ? (rawUrl?.split('/').pop() || 'attachment')
                                    : (att.name || 'attachment');
                                  return (
                                    <a
                                      key={idx}
                                      href={url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className={`inline-flex items-center gap-2 text-xs underline ${isOwn ? 'text-primary-foreground/90' : 'text-foreground/80'}`}
                                    >
                                      <Paperclip className="h-3 w-3" />
                                      <span className="truncate max-w-[220px]">{label}</span>
                                    </a>
                                  );
                                })}
                              </div>
                            )}
                            <div className="flex items-center justify-between mt-1">
                              {canModify && !message.isDeleted && (
                                <div className="-ml-1">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align={isOwn ? 'start' : 'end'}>
                                      <DropdownMenuItem onClick={() => handleStartEdit(message)}>
                                        <Edit3 className="mr-2 h-4 w-4" /> Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleDeleteMessage(message._id)}>
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <span className="text-xs opacity-70">
                                  {format(new Date(message.createdAt), 'p')}
                                </span>
                                {isOwn && (
                                  <span className="text-xs">
                                    {message.readBy && message.readBy.length > 1 ? '✓✓' : '✓'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        {isOwn && (
                          <div className="flex-shrink-0">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={message.sender.avatar} />
                              <AvatarFallback>{message.sender.name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </div>

            {/* Message Input */}
            <div className={`border-t p-4 ${themeTokens.header}`}>
              {isRecording ? (
                <div className="mb-3 p-2 bg-muted/50 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mic className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Recording… {Math.ceil(recordingMs / 1000)}s</span>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={stopRecording}>
                    <StopCircle className="h-4 w-4" />
                  </Button>
                </div>
              ) : null}

              {voicePreviewUrl ? (
                <div className="mb-3 p-2 bg-muted/50 rounded-lg flex items-center justify-between gap-3">
                  <audio controls src={voicePreviewUrl} className="w-full" />
                  <Button type="button" variant="ghost" size="sm" onClick={stopVoicePreview}>
                    ×
                  </Button>
                </div>
              ) : null}

              {selectedFile && (
                <div className="mb-3 p-2 bg-muted/50 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{selectedFile.name}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                  >
                    ×
                  </Button>
                </div>
              )}
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    if (isRecording) {
                      stopRecording();
                      return;
                    }
                    void startRecording();
                  }}
                  disabled={!selectedConversation}
                  title="Voice message"
                >
                  {isRecording ? <StopCircle className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Smile className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <EmojiPicker onEmojiClick={(emoji) => handleEmojiSelect(emoji)} />
                  </PopoverContent>
                </Popover>
                <Input
                  type="text"
                  placeholder="Type a message..."
                  className={`flex-1 rounded-full bg-muted/40 border-0 focus-visible:ring-2 ${themeTokens.ring}`}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <Button type="submit" size="icon" disabled={!newMessage.trim() && !selectedFile && !voiceBlob} className={`rounded-full ${themeTokens.accentSoft} hover:opacity-95 text-white`}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No conversation selected</h3>
            <p className="text-muted-foreground mb-6">
              Select a conversation or start a new one
            </p>
            <Button onClick={() => setIsNewConversationOpen(true)}>
              <MessageSquare className="mr-2 h-4 w-4" />
              New message
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
