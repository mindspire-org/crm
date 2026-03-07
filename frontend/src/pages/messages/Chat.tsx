import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Send,
  Paperclip,
  Smile,
  Phone,
  Video,
  MoreVertical,
  Check,
  CheckCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [selectedContact, setSelectedContact] = useState<Contact>(contacts[0]);
  const [messageInput, setMessageInput] = useState("");

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
              {contacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left",
                    selectedContact.id === contact.id
                      ? "bg-primary/10"
                      : "hover:bg-muted/50"
                  )}
                >
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-indigo text-primary-foreground font-semibold">
                        {contact.initials}
                      </AvatarFallback>
                    </Avatar>
                    {contact.online && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-card" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm truncate">
                        {contact.name}
                      </h4>
                      <span className="text-xs text-muted-foreground">
                        {contact.time}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-0.5">
                      {contact.typing ? (
                        <span className="text-primary italic">Typing...</span>
                      ) : (
                        contact.lastMessage
                      )}
                    </p>
                  </div>
                  {contact.unread > 0 && (
                    <Badge className="bg-primary text-primary-foreground text-xs">
                      {contact.unread}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        </Card>

        {/* Chat Area */}
        <Card className="flex flex-col h-full overflow-hidden">
          {/* Chat Header */}
          <CardHeader className="p-4 border-b flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-indigo text-primary-foreground font-semibold">
                    {selectedContact.initials}
                  </AvatarFallback>
                </Avatar>
                {selectedContact.online && (
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-success rounded-full border-2 border-card" />
                )}
              </div>
              <div>
                <h3 className="font-semibold">{selectedContact.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {selectedContact.online ? "Online" : "Offline"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon">
                <Phone className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <Video className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.sender === "me" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[70%] rounded-2xl px-4 py-2",
                      message.sender === "me"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted rounded-bl-md"
                    )}
                  >
                    <p className="text-sm">{message.content}</p>
                    <div
                      className={cn(
                        "flex items-center gap-1 mt-1",
                        message.sender === "me" ? "justify-end" : "justify-start"
                      )}
                    >
                      <span
                        className={cn(
                          "text-[10px]",
                          message.sender === "me"
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground"
                        )}
                      >
                        {message.time}
                      </span>
                      {message.sender === "me" && (
                        <span className="text-primary-foreground/70">
                          {message.status === "read" ? (
                            <CheckCheck className="w-3 h-3" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="p-4 border-t">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon">
                <Paperclip className="w-5 h-5" />
              </Button>
              <Input
                placeholder="Type a message..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                className="flex-1"
              />
              <Button variant="ghost" size="icon">
                <Smile className="w-5 h-5" />
              </Button>
              <Button variant="gradient" size="icon">
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
