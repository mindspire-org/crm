import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, MessageSquare, Users, Send, Paperclip, Smile, MoreVertical, Plus, Phone, Video, Info, Mic, Settings, Moon, Sun, Palette, FileIcon, X, Loader2, Play, Pause, Volume2, Download, ExternalLink, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { useMessaging } from "@/contexts/MessagingContext";
import { NewConversation } from "./components/NewConversation";
import { AudioPlayer } from "./components/AudioPlayer";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "next-themes";
import Picker from "emoji-picker-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { uploadAttachment } from "@/lib/api/messaging";
import { API_BASE } from "@/lib/api/base";
import { cn } from "@/lib/utils";
const getStoredAuthUser = (): { id?: string; _id?: string; email?: string; role?: string } | null => {
  const raw = localStorage.getItem("auth_user") || sessionStorage.getItem("auth_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export default function MessagingEnhanced() {
  const [searchQuery, setSearchQuery] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [isNewConversationOpen, setIsNewConversationOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const user = getStoredAuthUser();
  const userId = user?.id || user?._id;
  const role = user?.role || "admin";
  const navigate = useNavigate();
  const location = useLocation();
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
      (c: any) => c && typeof c === "object" && c._id
    );
  }, [conversations]);

  const conversationIdFromUrl = useMemo(() => {
    const sp = new URLSearchParams(location.search || "");
    const v = sp.get("conversationId");
    return v ? String(v) : "";
  }, [location.search]);

  useEffect(() => {
    if (!conversationIdFromUrl) return;
    const target = safeConversations.find((c: any) => c._id === conversationIdFromUrl);
    if (target && (!selectedConversation || selectedConversation?._id !== target._id)) {
      selectConversation(target._id);
    }
  }, [conversationIdFromUrl, safeConversations, selectedConversation, selectConversation]);
  // Handle sending a new message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() && !selectedFile) return;

    try {
      setUploading(true);
      let attachments: any[] = [];
      let type = 'text';
      
      if (selectedFile) {
        const uploaded = await uploadAttachment(selectedFile);
        attachments = [uploaded];
        
        if (selectedFile.type.startsWith('image/')) type = 'image';
        else if (selectedFile.type.startsWith('video/')) type = 'video';
        else if (selectedFile.type.startsWith('audio/')) type = 'audio';
        else type = 'file';
      }

      await sendMessage(newMessage, attachments, type);
      setNewMessage("");
      setSelectedFile(null);
      setShowEmojiPicker(false);
      scrollToBottom();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], `voice-message-${Date.now()}.webm`, { type: 'audio/webm' });
        
        try {
          setUploading(true);
          const uploaded = await uploadAttachment(file);
          await sendMessage("", [uploaded], 'voice');
          toast({ title: "Success", description: "Voice message sent" });
        } catch (error) {
          toast({ title: "Error", description: "Failed to send voice message", variant: "destructive" });
        } finally {
          setUploading(false);
        }
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      toast({ title: "Error", description: "Could not access microphone", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
    // Reset value so the same file can be selected again if removed
    e.target.value = "";
  };

  // Handle emoji selection
  const handleEmojiSelect = (emoji: any) => {
    setNewMessage((prev) => prev + emoji.emoji);
    setShowEmojiPicker(false);
  };
  // Handle conversation selection
  const handleSelectConversation = (conversationId: string) => {
    if (!conversationId) return;
    selectConversation(conversationId);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Get other participants in a conversation (excluding current user)
  const getOtherParticipants = useCallback((conversation: any) => {
    if (!conversation?.participants) return [];
    if (conversation.isGroup) {
      return conversation.participants;
    }
    return conversation.participants?.filter((p: any) => p?._id !== userId);
  }, [userId]);
  // Get conversation title
  const getConversationTitle = useCallback((conversation: any) => {
    if (conversation.isGroup) {
      const names = (conversation.participants || []).filter(Boolean).map((p: any) => p?.name).filter(Boolean);
      return conversation.groupName || names.join(", ");
    }
    const otherParticipants = getOtherParticipants(conversation);
    return otherParticipants[0]?.name || "Unknown User";
  }, [getOtherParticipants]);

  // Get conversation avatar URL
  const getAvatarUrl = useCallback((conversation: any) => {
    if (conversation.isGroup) {
      return conversation.groupPhoto || "";
    }
    const otherParticipants = getOtherParticipants(conversation);
    return otherParticipants[0]?.avatar || "";
  }, [getOtherParticipants]);
  // Get fallback text for avatar
  const getAvatarFallback = useCallback((conversation: any) => {
    if (conversation.isGroup) {
      return conversation.groupName 
        ? conversation.groupName.split(" ").map((n: string) => n[0]).join("").toUpperCase()
        : "G";
    }
    const otherParticipants = getOtherParticipants(conversation);
    return otherParticipants[0]?.name?.charAt(0).toUpperCase() || "U";
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
    <div className="flex h-[calc(100vh-7rem)] overflow-hidden bg-background">
      {/* New Conversation Dialog */}
      {role !== "client" ? (
        <NewConversation 
          open={isNewConversationOpen} 
          onOpenChange={setIsNewConversationOpen} 
        />
      ) : null}
      
      {/* Sidebar */}
      <div className="w-80 border-r bg-background flex flex-col overflow-hidden">
        <div className="p-4 border-b">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Messages</h2>
            <div className="flex items-center gap-1">
              {/* Theme Toggle */}
              <DropdownMenu open={showThemeMenu} onOpenChange={setShowThemeMenu}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setTheme("light")}>
                    <Sun className="mr-2 h-4 w-4" /> Light
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("dark")}>
                    <Moon className="mr-2 h-4 w-4" /> Dark
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("system")}>
                    <Settings className="mr-2 h-4 w-4" /> System
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {role !== "client" && (
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
              className="w-full pl-10 h-10 bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-primary/20"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        {/* Conversation List */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
          <div className="divide-y divide-border p-2">
            {safeConversations.filter((conv: any) => {
              if (!searchQuery) return true;
              const searchLower = searchQuery.toLowerCase();
              const title = getConversationTitle(conv).toLowerCase();
              const lastMessage = conv.lastMessage?.content?.toLowerCase() || "";
              return title.includes(searchLower) || lastMessage.includes(searchLower);
            }).map((conversation) => (
              <div
                key={conversation._id}
                className={`p-3 hover:bg-muted/50 cursor-pointer transition-colors ${
                  selectedConversation?._id === conversation._id ? "bg-muted" : ""
                }`}
                onClick={() => handleSelectConversation(conversation._id)}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={getAvatarUrl(conversation)} />
                      <AvatarFallback className="text-sm font-medium">{getAvatarFallback(conversation)}</AvatarFallback>
                    </Avatar>
                    {selectedConversation?._id === conversation?._id && (
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-background"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="font-medium truncate text-sm">{getConversationTitle(conversation)}</h3>
                      <span className="text-xs text-muted-foreground ml-2">
                        {format(new Date(conversation.updatedAt), "p")}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {conversation.lastMessage && (
                        <p className="text-sm text-muted-foreground truncate flex-1">
                          {conversation.lastMessage?.sender?._id === userId ? "You: " : ""}
                          {conversation.lastMessage.content || "Sent an attachment"}
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
                {role !== "client" && (
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
            <div className="border-b bg-background px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={getAvatarUrl(selectedConversation)} />
                    <AvatarFallback className="text-sm font-medium">{getAvatarFallback(selectedConversation)}</AvatarFallback>
                  </Avatar>
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background"></div>
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{getConversationTitle(selectedConversation)}</h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedConversation.isGroup
                      ? `${selectedConversation.participants.length} participants`
                      : "Active now"}
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
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Info className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
              <div className="p-4 space-y-4 min-h-0">
                {(Array.isArray(messages) ? messages : []).map((m: any) => {
                  const mine = String(m?.sender?._id || "") === String(userId || "");
                  const attachments = Array.isArray(m.attachments) ? m.attachments : [];
                  
                  return (
                    <div key={m._id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={cn("max-w-[80%] flex flex-col gap-1", mine ? "items-end" : "items-start")}>
                        <div
                          className={cn(
                            "rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                            mine ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-muted text-foreground rounded-tl-none"
                          )}
                        >
                          {!!m?.content && <div className="whitespace-pre-wrap break-words">{m.content}</div>}
                          
                          {/* Attachments Display */}
                          {attachments.length > 0 ? (
                            <div className={cn("mt-2 space-y-2 w-full min-w-[120px]", m.content ? "pt-2 border-t border-white/10" : "")}>
                              {attachments.map((att: any, idx: number) => {
                                if (!att) return null;
                                const url = typeof att === 'string' ? att : att.url;
                                if (!url) return null;
                                
                                const name = typeof att === 'object' ? att.name : "Attachment";
                                const type = typeof att === 'object' ? att.type : "";
                                const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
                                
                                if (type?.startsWith('image/') || url.match(/\.(jpeg|jpg|gif|png|webp)$/i)) {
                                  return (
                                    <div key={idx} className="rounded-lg overflow-hidden border border-white/10 bg-black/5">
                                      <img 
                                        src={fullUrl} 
                                        alt={name} 
                                        className="max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity block mx-auto"
                                        onClick={() => window.open(fullUrl, '_blank')}
                                        loading="lazy"
                                      />
                                    </div>
                                  );
                                }
                                
                                if (type?.startsWith('video/') || url.match(/\.(mp4|webm|ogg|mov)$/i)) {
                                  return (
                                    <div key={idx} className="rounded-lg overflow-hidden border border-white/10 bg-black/20">
                                      <video 
                                        src={fullUrl} 
                                        controls 
                                        className="max-w-full rounded-lg block mx-auto"
                                      />
                                    </div>
                                  );
                                }
                                
                                if (type?.startsWith('audio/') || type === 'voice' || url.match(/\.(mp3|wav|ogg|webm|m4a)$/i)) {
                                  return (
                                    <div key={idx} className="w-full min-w-[220px] py-1">
                                      <AudioPlayer src={fullUrl} mine={mine} />
                                    </div>
                                  );
                                }
                                
                                return (
                                  <a 
                                    key={idx}
                                    href={fullUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className={cn(
                                      "flex items-center gap-3 p-3 rounded-xl border transition-all",
                                      mine ? "bg-white/10 border-white/20 hover:bg-white/20 text-white" : "bg-white border-slate-200 hover:bg-slate-50 text-slate-900"
                                    )}
                                  >
                                    <div className={cn("p-2 rounded-lg shrink-0", mine ? "bg-white/20" : "bg-indigo-50")}>
                                      <FileIcon className={cn("w-5 h-5", mine ? "text-white" : "text-indigo-600")} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-bold truncate">{name}</p>
                                      <p className={cn("text-[10px] uppercase tracking-wider opacity-60")}>Document</p>
                                    </div>
                                    <Download className="w-4 h-4 shrink-0 opacity-60" />
                                  </a>
                                );
                              })}
                            </div>
                          ) : (
                            !m.content && (
                              <div className="flex items-center gap-2 text-[10px] opacity-50 italic py-1">
                                <FileIcon className="w-3 h-3" /> Loading media...
                              </div>
                            )
                          )}

                          {!!m?.createdAt && (
                            <div
                              className={cn(
                                "mt-1.5 text-[9px] font-medium flex items-center gap-1.5",
                                mine ? "text-white/70" : "text-slate-400"
                              )}
                            >
                              {format(new Date(m.createdAt), "p")}
                              {mine && <CheckCircle2 className="w-2.5 h-2.5 opacity-70" />}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            </div>

            <Separator />
            <div className="p-4 space-y-3">
              {selectedFile && (
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-indigo-50 border border-indigo-100 animate-in fade-in slide-in-from-bottom-2">
                  <div className="p-2 rounded-xl bg-white shadow-sm">
                    <FileIcon className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{selectedFile.name}</p>
                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-full hover:bg-white" 
                    onClick={() => setSelectedFile(null)}
                  >
                    <X className="w-4 h-4 text-slate-400" />
                  </Button>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Paperclip className="h-5 w-5" />
                </Button>

                <div className="relative flex-1 group">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="h-11 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all px-4 font-medium"
                    disabled={uploading}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                      <PopoverTrigger asChild>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-lg text-slate-400 hover:text-amber-500"
                          disabled={uploading}
                        >
                          <Smile className="h-5 w-5" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" side="top" className="p-0 border-0 shadow-2xl rounded-2xl overflow-hidden">
                        <Picker onEmojiClick={(emojiData: any) => handleEmojiSelect(emojiData)} />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {newMessage.trim() || selectedFile ? (
                  <Button 
                    type="submit" 
                    size="icon" 
                    className="h-11 w-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 hover:scale-[1.05] transition-all"
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  </Button>
                ) : (
                  <Button 
                    type="button" 
                    size="icon" 
                    className={cn(
                      "h-11 w-11 rounded-xl transition-all",
                      isRecording ? "bg-rose-500 hover:bg-rose-600 animate-pulse text-white" : "bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-200"
                    )}
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mic className="h-5 w-5" />}
                  </Button>
                )}
              </form>
            </div>
          </> 
        ) : (
          <div className="flex-1 flex items-center justify-center bg-muted/50">
            <div className="text-center space-y-3">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
