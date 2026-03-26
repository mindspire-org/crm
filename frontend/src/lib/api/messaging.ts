import { API_BASE } from "@/lib/api/base";

export interface Message {
  _id: string;
  conversationId: string;
  sender: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  content: string;
  readBy: string[];
  // Support both object attachments and legacy string[] URLs
  attachments: Array<
    | {
        url: string;
        name: string;
        type: string;
        size: number;
      }
    | string
  >;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
  isStarred?: boolean;
  isPinned?: boolean;
}

export interface Conversation {
  _id: string;
  projectId?: string;
  participants: Array<{
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  }>;
  lastMessage?: Message;
  isGroup: boolean;
  groupName?: string;
  admins?: string[];
  unreadCount?: number;
  updatedAt: string;
}

export const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

export const fetchConversations = async (): Promise<Conversation[]> => {
  const response = await fetch(`${API_BASE}/api/messages/conversations`, {
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch conversations');
  }
  
  return response.json();
};

export const createProjectConversation = async (projectId: string): Promise<Conversation> => {
  const response = await fetch(`${API_BASE}/api/messages/conversations`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ projectId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.message || 'Failed to create conversation');
  }

  return response.json();
};

export const createConversation = async (participantIds: string[]): Promise<Conversation> => {
  const response = await fetch(`${API_BASE}/api/messages/conversations`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ participantIds }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to create conversation');
  }
  
  return response.json();
};

export const fetchMessages = async (
  conversationId: string, 
  before?: string, 
  limit: number = 50
): Promise<Message[]> => {
  const params = new URLSearchParams();
  if (before) params.set('before', before);
  params.set('limit', limit.toString());
  
  const response = await fetch(
    `${API_BASE}/api/messages/conversations/${conversationId}/messages?${params.toString()}`,
    { headers: getAuthHeaders() }
  );
  
  // Silently return empty array if conversation not found (e.g., deleted)
  if (response.status === 404) {
    return [];
  }
  
  if (!response.ok) {
    throw new Error('Failed to fetch messages');
  }
  
  return response.json();
};

export const sendMessage = async (
  conversationId: string, 
  content: string,
  attachments: any[] = [],
  type: string = 'text'
): Promise<Message> => {
  const normalizeAttachments = (atts: any[]): any[] => {
    const list = Array.isArray(atts) ? atts : [];
    return list
      .map((a: any) => {
        if (!a) return null;
        if (typeof a === "string") return { url: a, name: "Attachment", type: "", size: 0 };
        if (typeof a === "object" && typeof a.url === "string") {
          return {
            url: a.url,
            name: a.name || "Attachment",
            type: a.type || "",
            size: a.size || 0
          };
        }
        return null;
      })
      .filter((a: any) => a !== null);
  };

  const response = await fetch(`${API_BASE}/api/messages/messages`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      conversationId,
      content,
      attachments: normalizeAttachments(attachments),
      type
    }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const msg = error.error || error.message || `Failed to send message (${response.status})`;
    throw new Error(msg);
  }
  
  return response.json();
};

export const markMessagesAsRead = async (messageIds: string[]): Promise<{ success: boolean }> => {
  const response = await fetch(`${API_BASE}/api/messages/messages/read`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ messageIds }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to mark messages as read');
  }
  
  return response.json();
};

export const uploadAttachment = async (file: File): Promise<{ url: string; name?: string; type?: string; size?: number }> => {
  const formData = new FormData();
  formData.append('file', file);

  // Prefer server files route, fallback to legacy /api/upload if present
  const endpoints = [`${API_BASE}/api/files`, `${API_BASE}/api/upload`];
  let lastError: any = null;

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Authorization': getAuthHeaders().Authorization },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        lastError = new Error(err.error || err.message || `Upload failed (${res.status})`);
        continue;
      }
      const json = await res.json();
      const rawUrl = json.url || json.path || json.fileUrl;
      // Store relative path if it's on our server, or full URL if external
      const normalizedUrl = rawUrl && typeof rawUrl === 'string'
        ? (rawUrl.startsWith(API_BASE) ? rawUrl.replace(API_BASE, '') : rawUrl)
        : '';
      return {
        url: normalizedUrl,
        name: json.name || file.name,
        type: json.type || file.type,
        size: typeof json.size === 'number' ? json.size : file.size,
      };
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError || new Error('Failed to upload attachment');
};

export const editMessage = async (messageId: string, content: string): Promise<Message> => {
  const response = await fetch(`${API_BASE}/api/messages/messages/${messageId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ content }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.message || 'Failed to edit message');
  }
  return response.json();
};

export const starMessage = async (messageId: string, isStarred: boolean): Promise<Message> => {
  const response = await fetch(`${API_BASE}/api/messages/messages/${messageId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ isStarred }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.message || 'Failed to star message');
  }
  return response.json();
};

export const pinMessage = async (messageId: string, isPinned: boolean): Promise<Message> => {
  const response = await fetch(`${API_BASE}/api/messages/messages/${messageId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ isPinned }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.message || 'Failed to pin message');
  }
  return response.json();
};

export const deleteMessage = async (messageId: string): Promise<{ success: boolean }> => {
  const response = await fetch(`${API_BASE}/api/messages/messages/${messageId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.message || 'Failed to delete message');
  }
  return response.json();
};

export const deleteConversation = async (conversationId: string): Promise<{ success: boolean }> => {
  const response = await fetch(`${API_BASE}/api/messages/conversations/${conversationId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.message || 'Failed to delete conversation');
  }
  return response.json();
};
