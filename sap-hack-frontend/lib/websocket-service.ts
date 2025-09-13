import { useCallback } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';

// Event types from WebUI system
export interface WebUIEvent {
  type: 'raw' | 'orchestra' | 'finish' | 'example' | 'new';
  data: TextDeltaContent | OrchestraContent | ExampleContent | NewAgentContent | null;
  requireConfirm?: boolean;
}

export interface TextDeltaContent {
  type: 'reason' | 'tool_call' | 'tool_call_output' | 'text';
  delta: string;
  callid?: string;
  argument?: string;
  inprogress?: boolean;
}

export interface ExampleContent {
  query: string;
}

export interface PlanItem {
  analysis: string;
  todo: string;
}

export interface WorkerItem {
  task: string;
  output: string;
}

export interface ReportItem {
  output: string;
}

export interface NewAgentContent {
  name: string;
}

export type OrchestraContent =
  | { type: 'plan'; item: PlanItem }
  | { type: 'worker'; item: WorkerItem }
  | { type: 'report'; item: ReportItem };

export interface ChatMessage {
  id: number;
  content: string | ToolCallMessage | PlanItem | WorkerItem | ReportItem;
  sender: 'user' | 'assistant';
  type?: 'text' | 'reason' | 'tool_call' | 'worker' | 'report' | 'error' | 'plan' | 'new_agent' | 'raw';
  inprogress?: boolean;
  timestamp: Date;
  requireConfirm?: boolean;
  confirmedStatus?: 'confirmed' | 'rejected';
  callid?: string;
}

export interface ToolCallMessage {
  toolName: string;
  toolCallArgument: string;
  toolCallOutput: string;
  callid: string;
}

export interface UserQuery {
  type: 'query';
  query: string;
}

export const useCareerCoachWebSocket = (wsUrl: string = 'ws://127.0.0.1:8080/ws') => {
  const { sendMessage, lastMessage, readyState, getWebSocket } = useWebSocket(wsUrl, {
    onError: (event) => {
      console.error('WebSocket error:', event);
    },
    onClose: (event) => {
      console.log('WebSocket connection closed:', event);
    },
    shouldReconnect: () => true,
    reconnectAttempts: 10,
    reconnectInterval: 3000,
  });

  const sendQuery = useCallback((query: string) => {
    if (readyState === ReadyState.OPEN) {
      const message: UserQuery = {
        type: 'query',
        query: query
      };
      sendMessage(JSON.stringify(message));
      return true;
    }
    console.error('WebSocket is not connected');
    return false;
  }, [readyState, sendMessage]);

  return {
    sendQuery,
    lastMessage,
    readyState,
    getWebSocket,
    isConnected: readyState === ReadyState.OPEN,
  };
};
