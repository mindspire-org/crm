import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Send, Paperclip, Smile, Phone, Video, MoreVertical, Check, CheckCheck, Image as ImageIcon, PlayCircle, FileText, X, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { API_BASE } from "@/lib/api/base";
import { getAuthHeaders } from "@/lib/api/auth";
import { getCurrentUser } from "@/utils/roleAccess";
import { toast } from "sonner";

type Contact = {
  id: number;
  name: string;
  initials: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
  typing?: boolean;
};

type Message = {
  id: number;
  content: string;
  time: string;
  sender: "me" | "other";
  status: "sent" | "delivered" | "read";
  type?: "text" | "image" | "video" | "file";
  mediaUrl?: string;
};

const contacts: Contact[] = [
  {
    id: 1,
    name: "Sarah Johnson",
    initials: "SJ",
    lastMessage: "Sure, I'll send the report by EOD",
    time: "2 min",
    unread: 2,
    online: true,
  },
  {
    id: 2,
    name: "Michael Chen",
    initials: "MC",
    lastMessage: "The deployment was successful!",
    time: "15 min",
    unread: 0,
    online: true,
    typing: true,
  },
  {
    id: 3,
    name: "Emily Davis",
    initials: "ED",
    lastMessage: "Let's schedule a call tomorrow",
    time: "1 hour",
    unread: 0,
    online: false,
  },
  {
    id: 4,
    name: "Robert Wilson",
    initials: "RW",
    lastMessage: "Thanks for the update!",
    time: "3 hours",
    unread: 0,
    online: false,
  },
  {
    id: 5,
    name: "Lisa Anderson",
    initials: "LA",
    lastMessage: "I've reviewed the proposal",
    time: "Yesterday",
    unread: 1,
    online: true,
  },
];

const messages: Message[] = [
  {
    id: 1,
    content: "Hey! How's the Q4 project going?",
    time: "10:30 AM",
    sender: "other",
    status: "read",
  },
  {
    id: 2,
    content: "It's going well! We're on track to deliver by the deadline.",
    time: "10:32 AM",
    sender: "me",
    status: "read",
  },
  {
    id: 3,
    content: "That's great to hear. Do you need any additional resources?",
    time: "10:33 AM",
    sender: "other",
    status: "read",
  },
  {
    id: 4,
    content:
      "Actually, yes. We could use another developer for the frontend work. The scope expanded a bit last week.",
    time: "10:35 AM",
    sender: "me",
    status: "read",
  },
  {
    id: 5,
    content: "I'll talk to HR about it. Can you send me the updated requirements doc?",
    time: "10:37 AM",
    sender: "other",
    status: "read",
  },
  {
    id: 6,
    content: "Sure, I'll send the report by EOD",
    time: "10:38 AM",
    sender: "me",
    status: "delivered",
  },
];

export default function Chat() {
  const [activeTab, setActiveTab] = useState<"contacts" | "groups">("contacts");
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewMedia, setPreviewMedia] = useState<{ url: string; type: string; file: File } | null>(null);
  const [showStickers, setShowStickers] = useState(false);
  const [chatTheme, setChatTheme] = useState<"classic" | "emerald" | "ocean" | "sunset" | "nebula">("classic");
  const scrollRef = useRef<HTMLDivElement>(null);

  const stickers = [
    { id: "s1", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f600/512.gif", label: "Grinning" },
    { id: "s2", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f60d/512.gif", label: "Heart Eyes" },
    { id: "s3", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f929/512.gif", label: "Star Struck" },
    { id: "s4", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f60e/512.gif", label: "Cool" },
    { id: "s5", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f911/512.gif", label: "Money Mouth" },
    { id: "s6", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f631/512.gif", label: "Scream" },
    { id: "s7", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f973/512.gif", label: "Party" },
    { id: "s8", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f680/512.gif", label: "Rocket" },
    { id: "s9", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f4aa/512.gif", label: "Muscle" },
    { id: "s10", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f4af/512.gif", label: "100" },
    { id: "s11", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.gif", label: "Fire" },
    { id: "s12", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/2728/512.gif", label: "Sparkles" },
  ];

  const themes = {
    classic: {
      bg: "bg-white",
      bubbleMe: "bg-[#059669] text-white",
      bubbleOther: "bg-slate-100 text-slate-900",
      accent: "text-indigo-600",
      sendBtn: "bg-indigo-600"
    },
    emerald: {
      bg: "bg-emerald-50",
      bubbleMe: "bg-emerald-600 text-white",
      bubbleOther: "bg-white text-emerald-900 shadow-sm",
      accent: "text-emerald-700",
      sendBtn: "bg-emerald-600"
    },
    ocean: {
      bg: "bg-sky-50",
      bubbleMe: "bg-sky-600 text-white",
      bubbleOther: "bg-white text-sky-900 shadow-sm",
      accent: "text-sky-700",
      sendBtn: "bg-sky-600"
    },
    sunset: {
      bg: "bg-orange-50",
      bubbleMe: "bg-orange-500 text-white",
      bubbleOther: "bg-white text-orange-900 shadow-sm",
      accent: "text-orange-700",
      sendBtn: "bg-orange-500"
    },
    nebula: {
      bg: "bg-purple-50",
      bubbleMe: "bg-purple-600 text-white",
      bubbleOther: "bg-white text-purple-900 shadow-sm",
      accent: "text-purple-700",
      sendBtn: "bg-purple-600"
    }
  };

  const loadConversations = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/messages/conversations`, { headers: getAuthHeaders() });
      if (res.ok) setConversations(await res.json());
    } catch (e) { console.error(e); }
  };

  const loadMessages = async (convoId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/messages/conversations/${convoId}/messages`, { headers: getAuthHeaders() });
      if (res.ok) setMessages(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(true); }
  };

  useEffect(() => { loadConversations(); }, []);
  useEffect(() => { if (selectedConvo) loadMessages(selectedConvo._id); }, [selectedConvo]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewMedia({ url, type: file.type, file });
  };

  const clearPreview = () => {
    if (previewMedia) {
      URL.revokeObjectURL(previewMedia.url);
      setPreviewMedia(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const sendMessage = async () => {
    if (!selectedConvo || (!messageInput.trim() && !previewMedia)) return;

    try {
      let mediaUrl = "";
      let type: "text" | "image" | "video" | "file" = "text";

      if (previewMedia) {
        const formData = new FormData();
        formData.append("file", previewMedia.file);
        const uploadRes = await fetch(`${API_BASE}/api/files`, {
          method: "POST",
          headers: { Authorization: getAuthHeaders().Authorization },
          body: formData
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          mediaUrl = `${API_BASE}${uploadData.path}`;
          type = previewMedia.type.startsWith("image/") ? "image" : previewMedia.type.startsWith("video/") ? "video" : "file";
        }
      }

      const res = await fetch(`${API_BASE}/api/messages/messages`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          conversationId: selectedConvo._id,
          content: messageInput,
          type,
          mediaUrl
        })
      });

      if (res.ok) {
        setMessageInput("");
        clearPreview();
        loadMessages(selectedConvo._id);
      }
    } catch (e) { toast.error("Failed to send message"); }
  };

  const sendSticker = async (stickerUrl: string) => {
    if (!selectedConvo) return;
    try {
      const res = await fetch(`${API_BASE}/api/messages/messages`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          conversationId: selectedConvo._id,
          content: "",
          type: "image",
          mediaUrl: stickerUrl
        })
      });
      if (res.ok) {
        setShowStickers(false);
        loadMessages(selectedConvo._id);
      }
    } catch (e) { toast.error("Failed to send sticker"); }
  };

  return (
    <div className="h-[calc(100vh-8rem)] animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 h-full">
        {/* Contacts List */}
        <Card className="flex flex-col h-full overflow-hidden">
          <CardHeader className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search conversations..." className="pl-10" />
            </div>
          </CardHeader>
          <ScrollArea className="flex-1">
            <div className="p-2">
              {conversations.map((convo) => {
                const otherPart = convo.participants.find((p: any) => p._id !== getCurrentUser()?.id);
                const title = convo.isGroup ? convo.groupName : (otherPart?.name || "Unknown User");
                const initials = title.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

                return (
                  <button
                    key={convo._id}
                    onClick={() => setSelectedConvo(convo)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left",
                      selectedConvo?._id === convo._id
                        ? "bg-primary/10"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <div className="relative">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className="bg-gradient-to-br from-primary to-indigo text-primary-foreground font-semibold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm truncate">{title}</h4>
                        <span className="text-xs text-muted-foreground">
                          {convo.lastMessage?.createdAt ? new Date(convo.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                        {convo.lastMessage?.content || "No messages yet"}
                      </p>
                    </div>
                    {convo.unreadCount > 0 && (
                      <Badge className="bg-primary text-primary-foreground text-xs">
                        {convo.unreadCount}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </Card>

        {/* Chat Area */}
        <Card className={cn("flex flex-col h-full overflow-hidden transition-colors duration-500", themes[chatTheme].bg)}>
          {selectedConvo ? (
            <>
              {/* Chat Header */}
              <CardHeader className="p-4 border-b flex-row items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="w-10 h-10 ring-2 ring-primary/10">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-indigo text-primary-foreground font-semibold">
                        {(selectedConvo.isGroup ? selectedConvo.groupName : selectedConvo.participants.find((p: any) => p._id !== getCurrentUser()?.id)?.name || "U").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{selectedConvo.isGroup ? selectedConvo.groupName : selectedConvo.participants.find((p: any) => p._id !== getCurrentUser()?.id)?.name}</h3>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Secure Node Active</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <div className="flex bg-slate-100 p-1 rounded-full mr-2">
                    {(Object.keys(themes) as Array<keyof typeof themes>).map((t) => (
                      <button
                        key={t}
                        onClick={() => setChatTheme(t)}
                        className={cn(
                          "w-6 h-6 rounded-full transition-all hover:scale-110",
                          t === "classic" && "bg-slate-400",
                          t === "emerald" && "bg-emerald-500",
                          t === "ocean" && "bg-sky-500",
                          t === "sunset" && "bg-orange-500",
                          t === "nebula" && "bg-purple-500",
                          chatTheme === t && "ring-2 ring-offset-1 ring-slate-900 scale-110"
                        )}
                        title={t.charAt(0).toUpperCase() + t.slice(1) + " Theme"}
                      />
                    ))}
                  </div>
                  <Button variant="ghost" size="icon" className="text-slate-400 hover:text-primary transition-colors"><Phone className="w-5 h-5" /></Button>
                  <Button variant="ghost" size="icon" className="text-slate-400 hover:text-primary transition-colors"><Video className="w-5 h-5" /></Button>
                  <Button variant="ghost" size="icon" className="text-slate-400 hover:text-primary transition-colors"><MoreVertical className="w-5 h-5" /></Button>
                </div>
              </CardHeader>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-6">
                  {messages.map((message) => {
                    const isMe = message.sender?._id === getCurrentUser()?.id;
                    const isSticker = message.type === "image" && message.mediaUrl?.includes("notoemoji");
                    
                    return (
                      <div key={message._id} className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                        <div className={cn(
                          "max-w-[70%] relative group",
                          isSticker ? "bg-transparent p-0" : cn("rounded-2xl px-4 py-2.5 shadow-sm", isMe ? themes[chatTheme].bubbleMe + " rounded-tr-none" : themes[chatTheme].bubbleOther + " rounded-tl-none")
                        )}>
                          {!isMe && selectedConvo.isGroup && <p className={cn("text-[10px] font-black uppercase mb-1 tracking-tight", themes[chatTheme].accent)}>{message.sender?.name}</p>}
                          
                          {message.type === "image" ? (
                            <div className="space-y-2">
                              <img 
                                src={message.mediaUrl?.startsWith('http') ? message.mediaUrl : `${API_BASE}${message.mediaUrl}`} 
                                alt="Shared" 
                                className={cn(
                                  "rounded-xl max-w-full h-auto cursor-pointer transition-transform hover:scale-[1.02]",
                                  isSticker ? "w-32 h-32" : "border border-white/20"
                                )} 
                                onClick={() => window.open(message.mediaUrl?.startsWith('http') ? message.mediaUrl : `${API_BASE}${message.mediaUrl}`, '_blank')} 
                                onError={(e) => {
                                  const img = e.target as HTMLImageElement;
                                  if (!img.src.includes(API_BASE) && !message.mediaUrl?.startsWith('http')) {
                                    img.src = `${API_BASE}${message.mediaUrl}`;
                                  }
                                }}
                              />
                              {message.content && <p className="text-sm font-semibold mt-2">{message.content}</p>}
                            </div>
                          ) : message.type === "video" ? (
                            <div className="space-y-2">
                              <video 
                                src={message.mediaUrl?.startsWith('http') ? message.mediaUrl : `${API_BASE}${message.mediaUrl}`} 
                                controls 
                                className="rounded-xl max-w-full h-auto border border-white/20 shadow-lg" 
                              />
                              {message.content && <p className="text-sm font-semibold mt-2">{message.content}</p>}
                            </div>
                          ) : (
                            <p className="text-sm font-medium whitespace-pre-wrap leading-relaxed tracking-tight">{message.content}</p>
                          )}
                          
                          <div className={cn("flex items-center gap-1.5 mt-1.5 opacity-60 group-hover:opacity-100 transition-opacity", isMe ? "justify-end" : "justify-start")}>
                            <span className="text-[9px] font-bold uppercase tracking-tighter">
                              {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isMe && (
                              <span className="flex">
                                {message.readBy?.length > 1 ? (
                                  <CheckCheck className="w-3 h-3 text-emerald-300" />
                                ) : (
                                  <Check className="w-3 h-3 text-white/60" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={scrollRef} />
                </div>
              </ScrollArea>

              {/* Media Preview & Input Area */}
              <div className="p-4 border-t bg-white relative z-20">
                {previewMedia && (
                  <div className="mb-4 p-3 bg-slate-50 border rounded-2xl flex items-center gap-4 relative animate-in slide-in-from-bottom-2 duration-300">
                    <button 
                      onClick={clearPreview}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-rose-600 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    {previewMedia.type.startsWith('image/') ? (
                      <img src={previewMedia.url} alt="Preview" className="w-16 h-16 object-cover rounded-lg ring-2 ring-white shadow-md" />
                    ) : (
                      <div className="w-16 h-16 bg-slate-900 rounded-lg flex items-center justify-center shadow-md">
                        <PlayCircle className="w-8 h-8 text-white" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Neural Transmission Ready</p>
                      <p className="text-xs font-bold text-slate-600 truncate">{previewMedia.file.name}</p>
                    </div>
                  </div>
                )}

                {showStickers && (
                  <div className="absolute bottom-full left-4 mb-2 p-4 bg-white border rounded-2xl shadow-2xl w-[320px] grid grid-cols-4 gap-3 animate-in zoom-in-95 duration-200">
                    <div className="col-span-4 flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Holographic Stickers</span>
                      <button onClick={() => setShowStickers(false)} className="text-slate-400 hover:text-rose-500"><X className="w-4 h-4" /></button>
                    </div>
                    {stickers.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => sendSticker(s.url)}
                        className="p-2 hover:bg-slate-50 rounded-xl transition-all hover:scale-110 active:scale-95"
                      >
                        <img src={s.url} alt={s.label} className="w-12 h-12" />
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileUpload} />
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => fileInputRef.current?.click()}
                      className="text-slate-500 hover:text-primary transition-colors hover:bg-white rounded-lg"
                    >
                      <Paperclip className="w-5 h-5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setShowStickers(!showStickers)}
                      className={cn("text-slate-500 transition-all hover:bg-white rounded-lg", showStickers && "text-primary bg-white")}
                    >
                      <Smile className="w-5 h-5" />
                    </Button>
                  </div>
                  <Input 
                    placeholder="Type your transmission..." 
                    value={messageInput} 
                    onChange={(e) => setMessageInput(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()} 
                    className="flex-1 h-12 border-none bg-slate-100 focus-visible:ring-1 focus-visible:ring-primary rounded-xl font-medium" 
                  />
                  <Button 
                    size="icon" 
                    className={cn("h-12 w-12 rounded-xl shadow-lg transition-transform active:scale-95", themes[chatTheme].sendBtn)} 
                    onClick={sendMessage}
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4"><MessageSquare className="w-10 h-10" /></div>
              <h3 className="text-lg font-bold text-slate-900">Encrypted Matrix Terminal</h3>
              <p className="max-w-[280px] text-sm mt-2">Select a communication node to begin secure transmission.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
