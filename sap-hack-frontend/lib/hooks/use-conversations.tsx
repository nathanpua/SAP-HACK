'use client';

import { useState, useEffect, useCallback } from 'react';

export interface Conversation {
  id: string;
  session_id: string;
  title: string;
  started_at: string;
  last_message_at: string;
  message_count: number;
  status: string;
  conversation_type: string;
}

export interface CurrentConversation {
  sessionId: string;
  title: string;
  started_at: string;
  message_count: number;
}

export interface UseConversationsReturn {
  recentConversations: Conversation[];
  isLoadingConversations: boolean;
  currentConversation: CurrentConversation | null;
  fetchRecentConversations: () => Promise<void>;
  setCurrentConversation: (conversation: CurrentConversation | null) => void;
}

export function useConversations(): UseConversationsReturn {
  const [recentConversations, setRecentConversations] = useState<Conversation[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [currentConversation, setCurrentConversation] = useState<CurrentConversation | null>(null);

  const fetchRecentConversations = useCallback(async () => {
    console.log('🔄 Fetching recent conversations...');
    try {
      setIsLoadingConversations(true);
      const response = await fetch('/api/conversations?page=1&limit=3');
      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }

      const data = await response.json();
      console.log('📋 Fetched conversations:', data.conversations?.map((c: Conversation) => ({ id: c.session_id, title: c.title })));
      setRecentConversations(data.conversations || []);
    } catch (error) {
      console.error('❌ Error fetching recent conversations:', error);
      setRecentConversations([]);
    } finally {
      setIsLoadingConversations(false);
    }
  }, []);

  useEffect(() => {
    fetchRecentConversations();
  }, [fetchRecentConversations]);

  return {
    recentConversations,
    isLoadingConversations,
    currentConversation,
    fetchRecentConversations,
    setCurrentConversation
  };
}
