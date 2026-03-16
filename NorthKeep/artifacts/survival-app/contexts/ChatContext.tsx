import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from "react";
import { getDatabase, generateId } from "@/lib/database";
import { checkAICapability, AICapability } from "@/lib/ai-service";
import { getGroundedChatResponse } from "@/lib/chat/grounded-chat-service";
import type { ConversationContext } from "@/lib/chat/grounded-chat-service";
import { useAIMode } from "@/lib/ai/use-ai-mode";
import type { GroundedChatMeta } from "@/lib/chat/types";

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  lastMessage?: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  sources?: string;
  createdAt: number;
}

interface ChatContextValue {
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  messages: ChatMessage[];
  isLoading: boolean;
  isSending: boolean;
  aiCapability: AICapability | null;
  loadSessions: () => Promise<void>;
  createSession: () => Promise<string>;
  deleteSession: (id: string) => Promise<void>;
  selectSession: (id: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  clearAllChats: () => Promise<void>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [aiCapability, setAiCapability] = useState<AICapability | null>(null);
  const { mode: aiMode } = useAIMode();

  useEffect(() => {
    checkAICapability().then(setAiCapability);
  }, []);

  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<any>(
        "SELECT s.*, (SELECT content FROM chat_messages WHERE session_id = s.id ORDER BY created_at DESC LIMIT 1) as last_message FROM chat_sessions s ORDER BY s.updated_at DESC"
      );
      setSessions(
        rows.map((r: any) => ({
          id: r.id,
          title: r.title,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          lastMessage: r.last_message,
        }))
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createSession = useCallback(async () => {
    const db = await getDatabase();
    const id = generateId();
    const now = Date.now();
    await db.runAsync(
      "INSERT INTO chat_sessions (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)",
      id,
      "New Conversation",
      now,
      now
    );
    const session: ChatSession = { id, title: "New Conversation", createdAt: now, updatedAt: now };
    setSessions((prev) => [session, ...prev]);
    setCurrentSession(session);
    setMessages([]);
    return id;
  }, []);

  const deleteSession = useCallback(async (id: string) => {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM chat_messages WHERE session_id = ?", id);
    await db.runAsync("DELETE FROM chat_sessions WHERE id = ?", id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (currentSession?.id === id) {
      setCurrentSession(null);
      setMessages([]);
    }
  }, [currentSession]);

  const selectSession = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const db = await getDatabase();
      const session = await db.getFirstAsync<any>("SELECT * FROM chat_sessions WHERE id = ?", id);
      if (session) {
        setCurrentSession({
          id: session.id,
          title: session.title,
          createdAt: session.created_at,
          updatedAt: session.updated_at,
        });
      }
      const rows = await db.getAllAsync<any>(
        "SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC",
        id
      );
      setMessages(
        rows.map((r: any) => ({
          id: r.id,
          sessionId: r.session_id,
          role: r.role,
          content: r.content,
          sources: r.sources,
          createdAt: r.created_at,
        }))
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!currentSession || isSending) return;
      setIsSending(true);
      const db = await getDatabase();
      const userMsgId = generateId();
      const now = Date.now();

      const userMsg: ChatMessage = {
        id: userMsgId,
        sessionId: currentSession.id,
        role: "user",
        content,
        createdAt: now,
      };
      setMessages((prev) => [...prev, userMsg]);
      await db.runAsync(
        "INSERT INTO chat_messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
        userMsgId,
        currentSession.id,
        "user",
        content,
        now
      );

      if (messages.length === 0) {
        const title = content.length > 40 ? content.substring(0, 40) + "..." : content;
        await db.runAsync("UPDATE chat_sessions SET title = ?, updated_at = ? WHERE id = ?", title, now, currentSession.id);
        setCurrentSession((prev) => (prev ? { ...prev, title } : null));
        setSessions((prev) => prev.map((s) => (s.id === currentSession.id ? { ...s, title, updatedAt: now } : s)));
      }

      try {
        const lastAssistantMsg = [...messages].reverse().find((m) => m.role === "assistant");
        let conversationContext: ConversationContext | null = null;

        if (lastAssistantMsg?.sources) {
          try {
            const meta = JSON.parse(lastAssistantMsg.sources) as GroundedChatMeta;
            if (meta.version === 2 && meta.matchedGuides.length > 0) {
              const top = meta.matchedGuides[0];
              conversationContext = {
                previousTopGuideId: top.guideId,
                previousTopGuideSlug: top.guideSlug,
                previousTopGuideTitle: top.guideTitle,
                previousParentTopic: top.parentTopic,
                previousCategory: top.category,
                previousQueryMode: meta.queryMode,
                previousConfidence: meta.confidence,
              };
            }
          } catch {
            conversationContext = null;
          }
        }

        const result = await getGroundedChatResponse(content, aiMode, conversationContext);
        const metaJson = JSON.stringify(result.meta);

        const aiMsgId = generateId();
        const aiNow = Date.now();

        const aiMsg: ChatMessage = {
          id: aiMsgId,
          sessionId: currentSession.id,
          role: "assistant",
          content: result.text,
          sources: metaJson,
          createdAt: aiNow,
        };
        setMessages((prev) => [...prev, aiMsg]);
        await db.runAsync(
          "INSERT INTO chat_messages (id, session_id, role, content, sources, created_at) VALUES (?, ?, ?, ?, ?, ?)",
          aiMsgId,
          currentSession.id,
          "assistant",
          result.text,
          metaJson,
          aiNow
        );
        await db.runAsync("UPDATE chat_sessions SET updated_at = ? WHERE id = ?", aiNow, currentSession.id);
        setSessions((prev) =>
          prev.map((s) =>
            s.id === currentSession.id
              ? { ...s, updatedAt: aiNow, lastMessage: result.text }
              : s
          )
        );
      } finally {
        setIsSending(false);
      }
    },
    [currentSession, isSending, messages, aiMode]
  );

  const clearAllChats = useCallback(async () => {
    const db = await getDatabase();
    await db.execAsync("DELETE FROM chat_messages");
    await db.execAsync("DELETE FROM chat_sessions");
    setSessions([]);
    setCurrentSession(null);
    setMessages([]);
  }, []);

  const value = useMemo(
    () => ({
      sessions,
      currentSession,
      messages,
      isLoading,
      isSending,
      aiCapability,
      loadSessions,
      createSession,
      deleteSession,
      selectSession,
      sendMessage,
      clearAllChats,
    }),
    [sessions, currentSession, messages, isLoading, isSending, aiCapability, loadSessions, createSession, deleteSession, selectSession, sendMessage, clearAllChats]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChat must be used within ChatProvider");
  return context;
}
