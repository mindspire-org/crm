import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, MessageSquare, Users, Send, Paperclip, Smile, MoreVertical, Plus, Phone, Video, Info, Mic, Edit3, Trash2, Settings, Palette, Link as LinkIcon, StopCircle, Sparkles, Star, Pin, Check, CheckCheck, FileIcon, Download, X } from 'lucide-react';
import { format, isAfter, subHours } from 'date-fns';
import { useMessaging } from '@/contexts/MessagingContext';
import { NewConversation } from './components/NewConversation';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import EmojiPicker from 'emoji-picker-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AudioPlayer } from './components/AudioPlayer';
import { cn } from '@/lib/utils';
import { uploadAttachment, editMessage as apiEditMessage, deleteMessage as apiDeleteMessage, deleteConversation as apiDeleteConversation } from '@/lib/api/messaging';
import { API_BASE } from '@/lib/api/base';
import { getAuthHeaders } from '@/lib/api/auth';

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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditGroupOpen, setIsEditGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
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
  const [showStickers, setShowStickers] = useState(false);
  const [projectTag, setProjectTag] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [projects, setProjectItems] = useState<any[]>([]);
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
    starMessage,
    pinMessage,
    markAsRead,
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

  const pinnedMessages = useMemo(() => {
    return safeMessages.filter(m => m.isPinned);
  }, [safeMessages]);

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

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/projects`, { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          setProjectItems(Array.isArray(data) ? data : []);
        }
      } catch (e) {}
    };
    fetchProjects();
  }, []);

  const STICKERS = [
    'https://cdn-icons-png.flaticon.com/512/2584/2584602.png',
    'https://cdn-icons-png.flaticon.com/512/2584/2584606.png',
    'https://cdn-icons-png.flaticon.com/512/2584/2584610.png',
    'https://cdn-icons-png.flaticon.com/512/2584/2584614.png',
    'https://cdn-icons-png.flaticon.com/512/2584/2584618.png',
    'https://cdn-icons-png.flaticon.com/512/2584/2584622.png',
  ];

  const handleSendSticker = async (stickerUrl: string) => {
    try {
      await sendMessage('', [{ url: stickerUrl, name: 'sticker', type: 'image/png', size: 0, isSticker: true }]);
      setShowStickers(false);
    } catch (e) {}
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && !selectedFile && !voiceBlob && !projectTag) return;

    try {
      const attachments: any[] = [];
      if (projectTag) {
        attachments.push({
          type: 'project_tag',
          projectId: projectTag,
          progress: progress,
          name: projects.find(p => p._id === projectTag)?.title || 'Project'
        });
      }

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
      setProjectTag(null);
      setProgress(0);
      stopVoicePreview();
      setShowEmojiPicker(false);
      scrollToBottom();
      toast({ title: 'Message sent' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' });
    }
  };

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

  const handleEmojiSelect = (emoji: any) => {
    setNewMessage((prev) => prev + emoji.emoji);
    setShowEmojiPicker(false);
  };

  const handleStartEdit = (message: any) => {
    const isWithinHour = isAfter(new Date(message.createdAt), subHours(new Date(), 1));
    if (!isWithinHour) {
      toast({ title: 'Cannot edit', description: 'Messages can only be edited within 1 hour.', variant: 'destructive' });
      return;
    }
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

  const handleDeleteMessage = async (message: any) => {
    const isWithinHour = isAfter(new Date(message.createdAt), subHours(new Date(), 1));
    if (!isWithinHour) {
      toast({ title: 'Cannot delete', description: 'Messages can only be deleted within 1 hour.', variant: 'destructive' });
      return;
    }
    try {
      await apiDeleteMessage(message._id);
      queryClient.setQueryData(['messages', selectedConversation?._id], (old: any) =>
        Array.isArray(old)
          ? old.map((m) => (m._id === message._id ? { ...m, isDeleted: true, content: '' } : m))
          : old
      );
      toast({ title: 'Message deleted' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to delete message', variant: 'destructive' });
    }
  };

  const handleStarMessage = async (messageId: string, isStarred: boolean) => {
    try {
      await starMessage(messageId, !isStarred);
      toast({ title: !isStarred ? 'Message starred' : 'Message unstarred' });
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to update star status', variant: 'destructive' });
    }
  };

  const handlePinMessage = async (messageId: string, isPinned: boolean) => {
    try {
      await pinMessage(messageId, !isPinned);
      toast({ title: !isPinned ? 'Message pinned' : 'Message unpinned' });
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to update pin status', variant: 'destructive' });
    }
  };

  const handleDeleteConversation = async () => {
    if (!selectedConversation?._id) return;
    try {
      await apiDeleteConversation(selectedConversation._id);
      queryClient.setQueryData(['conversations'], (old: any) =>
        Array.isArray(old) ? old.filter((c: any) => c._id !== selectedConversation._id) : old
      );
      selectConversation('');
      queryClient.removeQueries({ queryKey: ['messages', selectedConversation._id] });
      toast({ title: 'Conversation deleted' });
      setIsDeleteDialogOpen(false);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to delete conversation', variant: 'destructive' });
    }
  };

  const handleUpdateGroupName = async () => {
    if (!selectedConversation?._id || !newGroupName.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/messages/conversations/${selectedConversation._id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ groupName: newGroupName.trim() }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to update group name');
      }
      refreshConversations();
      toast({ title: 'Group name updated' });
      setIsEditGroupOpen(false);
      setNewGroupName("");
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const shareMeeting = useCallback(async () => {
    if (!selectedConversation) return;
    const url = `https://meet.jit.si/healthspire-${selectedConversation._id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Meeting link copied' });
      await sendMessage(`Meeting link: ${url}`, []);
    } catch (e) {}
  }, [selectedConversation, sendMessage, toast]);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    // Scroll to bottom on initial load and when messages change
    scrollToBottom('auto');
  }, [selectedConversation?._id]);

  useEffect(() => {
    if (selectedConversation?._id && messages.length > 0) {
      const unreadIds = messages
        .filter((m) => !m.readBy?.includes(userId || ''))
        .map((m) => m._id);
      if (unreadIds.length > 0) {
        markAsRead(unreadIds);
      }
    }
  }, [selectedConversation?._id, messages, userId, markAsRead]);

  useEffect(() => {
    // Only scroll to bottom if we are already near the bottom OR if the last message is from the user
    const lastMessage = messages[messages.length - 1];
    const isFromUser = lastMessage?.sender?._id === userId;
    
    if (isFromUser) {
      scrollToBottom('smooth');
    }
  }, [messages, userId]);

  const getOtherParticipants = useCallback((conversation: any) => {
    if (!conversation?.participants) return [];
    if (conversation.isGroup) {
      return (conversation.participants || []).filter(Boolean);
    }
    return (conversation.participants || []).filter((p: any) => p?._id !== userId);
  }, [userId]);

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
    const lightSvg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140' viewBox='0 0 140 140'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='.04'%3E%3Cpath d='M19 18h8v8h-8zM69 54h10v10H69zM112 26h7v7h-7zM36 92h9v9h-9zM94 96h8v8h-8z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E";
    return {
      backgroundImage: `url("${lightSvg}")`,
      backgroundSize: '180px 180px',
      backgroundPosition: 'center',
      backgroundRepeat: 'repeat',
    } as React.CSSProperties;
  }, []);

  const getAvatarUrl = useCallback((conversation: any) => {
    if (conversation.isGroup) return conversation.groupPhoto || '';
    const otherParticipants = getOtherParticipants(conversation);
    return otherParticipants[0]?.avatar || '';
  }, [getOtherParticipants]);

  const getAvatarFallback = useCallback((conversation: any) => {
    if (conversation.isGroup) {
      return conversation.groupName 
        ? conversation.groupName.split(' ').map((n: string) => n[0]).join('').toUpperCase()
        : 'G';
    }
    const otherParticipants = getOtherParticipants(conversation);
    return otherParticipants[0]?.name?.charAt(0).toUpperCase() || 'U';
  }, [getOtherParticipants]);

  const isGroupAdmin = useMemo(() => {
    if (!selectedConversation?.isGroup) return false;
    const adminIds = selectedConversation.admins || [];
    return adminIds.includes(userId || '') || role === 'admin';
  }, [selectedConversation, userId, role]);

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
      {role !== 'client' ? (
        <NewConversation 
          open={isNewConversationOpen} 
          onOpenChange={setIsNewConversationOpen} 
        />
      ) : null}
      
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
                  className={`p-3 hover:bg-muted/50 cursor-pointer transition-colors rounded-lg ${
                    selectedConversation?._id === conversation._id ? 'bg-muted' : ''
                  }`}
                  onClick={() => selectConversation(conversation._id)}
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
            </div>
          </ScrollArea>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedConversation ? (
          <>
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
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Video className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {selectedConversation.isGroup && isGroupAdmin && (
                      <DropdownMenuItem onClick={() => {
                        setNewGroupName(getConversationTitle(selectedConversation));
                        setIsEditGroupOpen(true);
                      }}>
                        <Edit3 className="mr-2 h-4 w-4" /> Edit Name
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => setIsNewConversationOpen(true)}>
                      <Users className="mr-2 h-4 w-4" /> New group
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setIsDeleteDialogOpen(true)}>
                      <Trash2 className="mr-2 h-4 w-4" /> Delete conversation
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <AlertDialog open={isEditGroupOpen} onOpenChange={setIsEditGroupOpen}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Edit Group Name</AlertDialogTitle>
                      <AlertDialogDescription>
                        Enter a new name for the group.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <Input 
                      value={newGroupName} 
                      onChange={(e) => setNewGroupName(e.target.value)} 
                      placeholder="New group name"
                    />
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleUpdateGroupName}>Save</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete this conversation and all its messages. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteConversation} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            {pinnedMessages.length > 0 && (
              <div className="px-4 py-2 bg-muted/50 border-b flex items-center gap-2 text-xs">
                <Pin className="h-3 w-3 text-primary rotate-45" />
                <span className="font-bold uppercase tracking-wider opacity-60">Pinned:</span>
                <span className="truncate flex-1">{pinnedMessages[0].content || 'Attachment'}</span>
                <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => handlePinMessage(pinnedMessages[0]._id, true)}>Unpin</Button>
              </div>
            )}

            <div className="flex-1 overflow-hidden relative" style={chatBgStyle}>
              <ScrollArea className="h-full">
                <div className="p-4 space-y-3 min-h-0">
                  {safeMessages.map((message) => {
                    const isOwn = message.sender?._id === userId;
                    return (
                      <div key={message._id} className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        {!isOwn && (
                          <div className="flex-shrink-0">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={message.sender?.avatar} />
                              <AvatarFallback>{message.sender?.name?.charAt(0) || 'U'}</AvatarFallback>
                            </Avatar>
                          </div>
                        )}
                        <div className="max-w-[72%] group relative">
                          <div className={cn(
                            "px-4 py-2 shadow-sm border border-white/30 dark:border-white/10 relative",
                            isOwn ? `${themeTokens.bubbleMine} rounded-2xl rounded-br-md` : `${themeTokens.bubbleTheirs} rounded-2xl rounded-bl-md`,
                            message.isPinned && "ring-2 ring-primary/20"
                          )}>
                            {message.isStarred && <Star className="absolute -top-2 -right-2 h-4 w-4 text-amber-400 fill-current shadow-sm" />}
                            {message.isPinned && <Pin className="absolute -top-2 -left-2 h-4 w-4 text-primary fill-current shadow-sm rotate-45" />}
                            
                            {message.isDeleted ? (
                              <p className="italic text-xs opacity-70">Message deleted</p>
                            ) : editingMessageId === message._id ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  value={editText}
                                  onChange={(e) => setEditText(e.target.value)}
                                  className="h-8 text-sm"
                                />
                                <Button size="sm" onClick={handleSaveEdit}>Save</Button>
                                <Button size="sm" variant="ghost" onClick={handleCancelEdit}>×</Button>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {message.content && <p className="whitespace-pre-wrap break-words">{message.content}</p>}
                                {Array.isArray(message.attachments) && message.attachments.map((att: any, idx: number) => {
                                  if (att.type?.startsWith('audio/')) {
                                    return <AudioPlayer key={idx} src={att.url.startsWith('http') ? att.url : `${API_BASE}${att.url}`} mine={isOwn} />;
                                  }
                                  if (att.isSticker) {
                                    return <img key={idx} src={att.url} alt="sticker" className="w-32 h-32 object-contain" />;
                                  }
                                  if (att.type?.startsWith('image/')) {
                                    const imgUrl = att.url.startsWith('http') ? att.url : `${API_BASE}${att.url}`;
                                    return (
                                      <div key={idx} className="mt-2 rounded-lg overflow-hidden border border-white/20 max-w-sm">
                                        <img 
                                          src={imgUrl} 
                                          alt={att.name || "Image"} 
                                          className="w-full h-auto cursor-pointer hover:opacity-90 transition-opacity" 
                                          onClick={() => window.open(imgUrl, '_blank')}
                                        />
                                      </div>
                                    );
                                  }
                                  if (att.type?.startsWith('video/')) {
                                    const videoUrl = att.url.startsWith('http') ? att.url : `${API_BASE}${att.url}`;
                                    return (
                                      <div key={idx} className="mt-2 rounded-lg overflow-hidden border border-white/20 max-w-sm bg-black/20">
                                        <video 
                                          src={videoUrl} 
                                          controls 
                                          className="w-full h-auto"
                                        />
                                      </div>
                                    );
                                  }
                                  if (att.type === 'project_tag') {
                                    return (
                                      <div key={idx} className="bg-white/10 p-3 rounded-lg border border-white/20 space-y-2 min-w-[200px]">
                                        <div className="flex items-center justify-between text-xs font-bold">
                                          <span>PROJECT: {att.name}</span>
                                          <span>{att.progress}%</span>
                                        </div>
                                        <div className="w-full bg-black/20 h-1.5 rounded-full overflow-hidden">
                                          <div className="bg-white h-full transition-all" style={{ width: `${att.progress}%` }} />
                                        </div>
                                      </div>
                                    );
                                  }
                                  // Generic file download
                                  if (att.url) {
                                    const fileUrl = att.url.startsWith('http') ? att.url : `${API_BASE}${att.url}`;
                                    return (
                                      <a 
                                        key={idx} 
                                        href={fileUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="flex items-center gap-2 bg-black/10 hover:bg-black/20 p-2 rounded-lg text-xs font-medium transition-colors border border-white/10 group/file mt-1"
                                      >
                                        <div className="p-1.5 bg-white/10 rounded-md">
                                          <FileIcon className="w-3.5 h-3.5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="truncate">{att.name || "Download file"}</p>
                                          <p className="opacity-50 text-[10px]">{(att.size / 1024).toFixed(1)} KB</p>
                                        </div>
                                        <Download className="w-3.5 h-3.5 opacity-0 group-hover/file:opacity-100 transition-opacity" />
                                      </a>
                                    );
                                  }
                                  return null;
                                })}
                              </div>
                            )}
                            <div className={cn(
                              "text-[10px] mt-1 flex items-center gap-1",
                              isOwn ? `text-${themeTokens.bubbleMineText}/70 justify-end` : 'text-muted-foreground'
                            )}>
                              {format(new Date(message.createdAt), 'p')}
                              {isOwn && (
                                <span className={`text-${themeTokens.bubbleMineText}/80`}>
                                  {message.readBy && message.readBy.length > 1 ? <CheckCheck className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className={cn(
                            "absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1",
                            isOwn ? "right-full mr-2" : "left-full ml-2"
                          )}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full bg-background/80 backdrop-blur shadow-sm">
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent side="top">
                                <DropdownMenuItem onClick={() => handleStarMessage(message._id, !!message.isStarred)}>
                                  <Star className="mr-2 h-3 w-3" /> {message.isStarred ? 'Unstar' : 'Star'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handlePinMessage(message._id, !!message.isPinned)}>
                                  <Pin className="mr-2 h-3 w-3" /> {message.isPinned ? 'Unpin' : 'Pin'}
                                </DropdownMenuItem>
                                {isOwn && !message.isDeleted && (
                                  <>
                                    <DropdownMenuItem onClick={() => handleStartEdit(message)}>
                                      <Edit3 className="mr-2 h-3 w-3" /> Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDeleteMessage(message)} className="text-destructive">
                                      <Trash2 className="mr-2 h-3 w-3" /> Delete
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </div>

            <div className="p-4 border-t bg-background/80 backdrop-blur">
              {projectTag && (
                <div className="mb-2 p-2 bg-primary/10 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-primary">PROJECT TAGGED:</span>
                    <span className="font-medium">{projects.find((p: any) => p._id === projectTag)?.title}</span>
                    <div className="flex items-center gap-1 border-l pl-2 ml-1">
                      <Input 
                        type="number" 
                        min="0" max="100" 
                        value={progress} 
                        onChange={(e) => setProgress(Number(e.target.value))}
                        className="w-14 h-6 p-1 text-[10px] bg-background"
                      />
                      <span>% Progress</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => setProjectTag(null)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              {selectedFile && (
                <div className="mb-2 p-2 bg-muted/50 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    <Paperclip className="h-3.5 w-3.5 text-primary" />
                    <span className="font-medium truncate max-w-[200px]">{selectedFile.name}</span>
                    <span className="text-muted-foreground">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => setSelectedFile(null)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              {voicePreviewUrl && (
                <div className="mb-2 p-2 bg-muted/50 rounded-lg flex items-center gap-3">
                  <div className="flex-1">
                    <AudioPlayer src={voicePreviewUrl} />
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={stopVoicePreview}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" type="button" className="h-9 w-9 shrink-0">
                      <Plus className="w-5 h-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent side="top" align="start" className="w-64 p-2">
                    <p className="text-[10px] font-bold px-2 py-1 uppercase opacity-50">Tag Project</p>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {projects.map((p: any) => (
                        <Button key={p._id} variant="ghost" className="w-full justify-start text-xs h-9" onClick={() => setProjectTag(p._id)}>
                          {p.title}
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                <Button variant="ghost" size="icon" type="button" className="h-9 w-9 shrink-0" onClick={() => fileInputRef.current?.click()}>
                  <Paperclip className="w-5 h-5" />
                </Button>

                {isRecording ? (
                  <div className="flex-1 flex items-center gap-3 bg-muted/30 px-3 h-10 rounded-md border border-red-500/20">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-sm font-medium flex-1">Recording: {Math.floor(recordingMs / 1000)}s</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      type="button" 
                      className="h-7 text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        stopRecording();
                        setVoiceBlob(null);
                        setVoicePreviewUrl('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1 h-10 bg-muted/30 border-0"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e as any);
                      }
                    }}
                  />
                )}

                <Popover open={showStickers} onOpenChange={setShowStickers}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" type="button" className="h-9 w-9 shrink-0">
                      <Sparkles className="w-5 h-5 text-amber-500" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent side="top" align="end" className="w-72 p-4">
                    <div className="grid grid-cols-3 gap-3">
                      {STICKERS.map((url, i) => (
                        <button key={i} className="hover:scale-110 transition-all p-2 rounded-xl hover:bg-muted" onClick={() => handleSendSticker(url)}>
                          <img src={url} alt="sticker" className="w-full h-full object-contain" />
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" type="button" className="h-9 w-9 shrink-0 text-amber-500">
                      <Smile className="w-5 h-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent side="top" align="end" className="p-0 border-0 shadow-2xl">
                    <EmojiPicker onEmojiClick={handleEmojiSelect} width={320} height={400} />
                  </PopoverContent>
                </Popover>

                {newMessage.trim() || selectedFile || voiceBlob || projectTag ? (
                  <Button type="submit" size="icon" className={cn("h-10 w-10 shrink-0", themeTokens.accent)}>
                    <Send className="w-5 h-5" />
                  </Button>
                ) : (
                  <Button type="button" size="icon" variant="ghost" onMouseDown={startRecording} onMouseUp={stopRecording} className={isRecording ? 'text-red-500 animate-pulse' : ''}>
                    <Mic className="w-5 h-5" />
                  </Button>
                )}
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-muted/10">
            <div className="text-center space-y-6 max-w-sm px-6">
              <div className={cn("mx-auto h-24 w-24 rounded-3xl flex items-center justify-center text-white shadow-2xl", themeTokens.accentSoft)}>
                <MessageSquare className="h-12 w-12" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Your Messages</h2>
              <Button onClick={() => setIsNewConversationOpen(true)} className={cn("w-full h-11", themeTokens.accent)}>
                <Plus className="mr-2 h-4 w-4" /> New Message
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
