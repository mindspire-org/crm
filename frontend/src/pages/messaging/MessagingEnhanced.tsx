import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, MessageSquare, Users, Send, Paperclip, Smile, MoreVertical, Plus, Phone, Video, Info, Mic, Settings, Moon, Sun, Palette } from "lucide-react";
import { format } from "date-fns";
import { useMessaging } from "@/contexts/MessagingContext";
import { NewConversation } from "./components/NewConversation";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "next-themes";
import Picker from "emoji-picker-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && !selectedFile) return;

    try {
      await sendMessage(newMessage);
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
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      toast({
        title: "File selected",
        description: `${file.name} attached`,
      });
    }
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
              <div className="p-4 space-y-3 min-h-0">
                {(Array.isArray(messages) ? messages : []).map((m: any) => {
                  const mine = String(m?.sender?._id || "") === String(userId || "");
                  return (
                    <div key={m._id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                          mine ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}
                      >
                        {!!m?.content && <div className="whitespace-pre-wrap break-words">{m.content}</div>}
                        {!!m?.createdAt && (
                          <div
                            className={`mt-1 text-[10px] ${
                              mine ? "text-primary-foreground/70" : "text-muted-foreground"
                            }`}
                          >
                            {format(new Date(m.createdAt), "p")}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            </div>

            <Separator />
            <form onSubmit={handleSendMessage} className="p-4 flex items-end gap-2">
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-4 w-4" />
              </Button>

              <div className="flex-1">
                {selectedFile ? (
                  <div className="text-xs text-muted-foreground mb-1 truncate">{selectedFile.name}</div>
                ) : null}
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="h-10"
                />
              </div>

              <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="h-10 w-10">
                    <Smile className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="p-0">
                  <Picker onEmojiClick={(emojiData: any) => handleEmojiSelect(emojiData)} />
                </PopoverContent>
              </Popover>

              <Button type="submit" size="icon" className="h-10 w-10" disabled={!newMessage.trim() && !selectedFile}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
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
