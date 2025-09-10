import { useCallback } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { createClient } from '@/lib/supabase/client';
import { ChatMessage } from '@/lib/websocket-service';

export const useChatWebSocket = (ws_url: string) => {
  const { sendMessage, lastMessage, readyState, getWebSocket } = useWebSocket(ws_url, {
    onError: (event) => {
      console.error('WebSocket error:', event);
    },
    onClose: (event) => {
      console.log('WebSocket connection closed:', event);
    },
    shouldReconnect: () => true, // Will attempt to reconnect on all close events
    reconnectAttempts: 1, // Number of reconnect attempts
    reconnectInterval: 3000, // Wait 3 seconds between reconnection attempts
  });

  // Send a query to the server with user authentication and conversation history
  const sendQuery = useCallback(async (query: string, conversationHistory?: ChatMessage[]) => {
    if (readyState === ReadyState.OPEN) {
      try {
        // Get current user from Supabase
        const supabase = createClient();
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error) {
          console.error('Error getting user:', error);
          return false;
        }

        // Prepare conversation history (last 5 messages for context)
        const recentHistory = conversationHistory?.slice(-5) || [];

        const message = JSON.stringify({
          type: 'query',
          query: query,
          user_id: user?.id || null,
          conversation_history: recentHistory.map(msg => ({
            content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
            sender: msg.sender,
            timestamp: msg.timestamp.toISOString(),
            type: msg.type || 'text'
          }))
        });
        sendMessage(message);
        return true;
      } catch (error) {
        console.error('Error sending query with user context:', error);
        return false;
      }
    }
    console.error('WebSocket is not connected');
    return false;
  }, [readyState, sendMessage]);

  return {
    sendQuery,
    lastMessage,
    readyState,
    getWebSocket,
  };
};

export default useChatWebSocket;
