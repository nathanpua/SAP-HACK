"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Bot, User, Loader2, Sparkles, X, ChevronDown, ChevronUp, CheckCircle } from "lucide-react";
import { ChatMessage, WebUIEvent, ToolCallMessage } from "@/lib/websocket-service";
import { useChatWebSocket } from "@/components/services/websocket.service";
import { ReadyState } from 'react-use-websocket';
import SafeMarkdown from "@/components/services/SafeMarkdown";



interface PlanItem {
  analysis: string;
  todo: string[];
}

interface WorkerItem {
  task: string;
  output: string;
}

interface ReportItem {
  output: string;
}

interface OrchestraEventData {
  type: 'plan' | 'worker' | 'report';
  item: PlanItem | WorkerItem | ReportItem;
}

interface CareerCoachChatbotProps {
  wsUrl?: string;
  loadConversationRef?: React.MutableRefObject<{ loadConversation: (sessionId: string) => void } | null>;
  onConversationCreated?: () => void;
  onConversationTitleUpdated?: () => void;
  onCurrentConversationTitleUpdate?: (sessionId: string) => void;
  isLoadingExistingChat?: boolean;
}

// Helper function to format time consistently
const formatTime = (date: Date) => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};


import { getClientWebSocketUrl } from '@/lib/websocket-config';

export function CareerCoachChatbot({ wsUrl, loadConversationRef, onConversationCreated, onConversationTitleUpdated, onCurrentConversationTitleUpdate, isLoadingExistingChat = false }: CareerCoachChatbotProps) {
  // Use provided URL or get from centralized config
  const finalWsUrl = wsUrl || getClientWebSocketUrl();

  // State for conversation management
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: Date.now(),
      content: `👋 Hi, I'm Deep SAP!`,
      sender: 'assistant',
      timestamp: new Date(),
      type: 'text'
    }
  ]);

  const [inputValue, setInputValue] = useState('');
  const [isModelResponding, setIsModelResponding] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [expandedToolOutputs, setExpandedToolOutputs] = useState<Set<number>>(new Set());
  const [expandedReports, setExpandedReports] = useState<Set<number>>(new Set());
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [isExpanded, setIsExpanded] = useState(isLoadingExistingChat);

  // Update component state when isLoadingExistingChat changes
  useEffect(() => {
    if (isLoadingExistingChat) {
      setIsExpanded(true);
    } else {
      // Reset state for new chat
      setIsExpanded(false);
      setCurrentSessionId(null);
      setConversationStarted(false);
      setMessages([
        {
          id: Date.now(),
          content: `👋 Hi, I'm Deep SAP!`,
          sender: 'assistant',
          timestamp: new Date(),
          type: 'text'
        }
      ]);
      setInputValue('');
      setIsModelResponding(false);
      setExpandedToolOutputs(new Set());
      setExpandedReports(new Set());
    }
  }, [isLoadingExistingChat]);

  const { sendQuery, sendFinishEvent, lastMessage, readyState } = useChatWebSocket(finalWsUrl);

  const isConnected = readyState === ReadyState.OPEN;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Function to create a new conversation session
  const createNewConversation = useCallback(async (title?: string): Promise<string | null> => {
    try {
      setError(null);
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title // Let the API handle the default title
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create conversation');
      }

      const data = await response.json();
      const sessionId = data.conversation.session_id;
      setCurrentSessionId(sessionId);
      // Don't set conversationStarted to true here - let the first message handler do it
      console.log('Conversation created with sessionId:', sessionId);

      // Notify parent component that a new conversation was created
      if (onConversationCreated) {
        onConversationCreated();
      }

      return sessionId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create conversation';
      console.error('Error creating conversation:', error);
      setError(errorMessage);
      return null;
    }
  }, [onConversationCreated]);

  // Flag to prevent concurrent message logging
  const isLoggingMessage = useRef(false);

  // Function to log a message to the database
  const logMessage = useCallback(async (messageType: 'user' | 'assistant', content: string, metadata?: Record<string, unknown>, sessionId?: string): Promise<void> => {
    const targetSessionId = sessionId || currentSessionId;

    if (!targetSessionId) {
      console.log('logMessage: No sessionId available, skipping message logging');
      return;
    }

    // Prevent concurrent logging
    if (isLoggingMessage.current) {
      console.log('Message logging already in progress, queuing...');
      return;
    }

    isLoggingMessage.current = true;

    try {
      const response = await fetch(`/api/conversations/${targetSessionId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message_type: messageType,
          content: content,
          metadata: metadata || {},
          tool_name: metadata?.tool_name,
          tool_input: metadata?.tool_input,
          tool_output: metadata?.tool_output
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to log message to database:', errorData.error || 'Unknown error', errorData.details);
        // Don't set error state for individual message logging failures to avoid disrupting the chat
      }
    } catch (error) {
      console.error('Error logging message:', error);
      // Don't set error state for individual message logging failures to avoid disrupting the chat
    } finally {
      isLoggingMessage.current = false;
    }
  }, [currentSessionId]);

  // Function to update conversation title
  const updateConversationTitle = useCallback(async (message: string, sessionId?: string) => {
    const targetSessionId = sessionId || currentSessionId;

    console.log('updateConversationTitle called with message:', message.substring(0, 50) + '...');
    console.log('Using sessionId for title update:', targetSessionId);

    if (!targetSessionId) {
      console.log('No sessionId available for title update, skipping');
      return;
    }

    console.log('Making API call to update title for sessionId:', targetSessionId);

    try {
      const response = await fetch('/api/conversations/generate-title', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          sessionId: targetSessionId
        }),
      });

      console.log('API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to update conversation title:', response.status, errorText);
      } else {
        const data = await response.json();
        console.log('Conversation title updated successfully to:', data.title);

        // Notify parent component that conversation title was updated
        if (onConversationTitleUpdated) {
          console.log('Notifying parent component of title update');
          onConversationTitleUpdated();
        }

        // Notify parent component of current conversation title update
        if (onCurrentConversationTitleUpdate && targetSessionId) {
          console.log('Notifying parent component of current conversation title update');
          onCurrentConversationTitleUpdate(targetSessionId);
        }
      }
    } catch (error) {
      console.error('Network error updating conversation title:', error);
    }
  }, [currentSessionId, onConversationTitleUpdated, onCurrentConversationTitleUpdate]);



  // Function to load a specific conversation by session ID
  const loadConversationById = useCallback(async (sessionId: string) => {
    try {
      setError(null);
      setCurrentSessionId(sessionId);

      // Load messages for this conversation
      const messagesResponse = await fetch(`/api/conversations/${sessionId}/messages`);
      if (messagesResponse.ok) {
        const messagesData = await messagesResponse.json();

        if (messagesData.messages && messagesData.messages.length > 0) {
          setConversationStarted(true);

          // Convert database messages to ChatMessage format
          const conversationMessages: ChatMessage[] = messagesData.messages.map((msg: {
            message_type: string;
            content: string;
            created_at: string;
            metadata?: Record<string, unknown>;
            tool_name?: string;
            tool_input?: string;
            tool_output?: string;
          }, index: number) => {
            const messageId = Date.now() + index;

            // Handle tool call messages
            if (msg.metadata?.type === 'tool_call') {
              return {
                id: messageId,
                content: {
                  toolName: msg.tool_name || msg.metadata.tool_name,
                  toolCallArgument: msg.tool_input || msg.metadata.tool_input || '',
                  toolCallOutput: '',
                  callid: msg.metadata.callid,
                },
                sender: 'assistant',
                timestamp: new Date(msg.created_at),
                type: 'tool_call',
                inprogress: false,
                callid: msg.metadata.callid,
              } as ChatMessage;
            }

            // Handle tool result messages
            if (msg.metadata?.type === 'tool_result') {
              return {
                id: messageId,
                content: {
                  toolName: msg.tool_name || msg.metadata.tool_name,
                  toolCallArgument: msg.tool_input || msg.metadata.tool_input || '',
                  toolCallOutput: msg.tool_output || msg.metadata.tool_output || msg.content,
                  callid: msg.metadata.callid,
                },
                sender: 'assistant',
                timestamp: new Date(msg.created_at),
                type: 'tool_call',
                inprogress: false,
                callid: msg.metadata.callid,
              } as ChatMessage;
            }

            // Handle regular text messages
            return {
              id: messageId,
              content: msg.content,
              sender: msg.message_type === 'user' ? 'user' : 'assistant',
              timestamp: new Date(msg.created_at),
              type: msg.message_type === 'user' ? 'text' : (msg.metadata?.event_type || 'text'),
            } as ChatMessage;
          });

          // Replace the welcome message with conversation history
          setMessages(conversationMessages);
        } else {
          // If no messages, start fresh conversation
          setConversationStarted(false);
          setMessages([
            {
              id: Date.now(),
              content: `👋 Hi, I'm Deep SAP! Welcome back!`,
              sender: 'assistant',
              timestamp: new Date(),
              type: 'text'
            }
          ]);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load conversation';
      console.error('Error loading conversation:', error);
      setError(errorMessage);
    }
  }, []);

  // Helper function to truncate text to 3 lines (handles both plain text and JSON)
  const truncateText = (text: string | null | undefined, maxLines: number = 3): { truncated: string; isTruncated: boolean } => {
    if (!text || typeof text !== 'string') {
      return { truncated: '', isTruncated: false };
    }

    // Try to detect if this is JSON
    const trimmedText = text.trim();
    if ((trimmedText.startsWith('{') && trimmedText.endsWith('}')) ||
        (trimmedText.startsWith('[') && trimmedText.endsWith(']'))) {
      try {
        // Parse and pretty-print JSON for better truncation
        const parsed = JSON.parse(trimmedText);

        // Special handling for tool responses that contain nested JSON in text field
        if (parsed.type === 'text' && parsed.text) {
          const textContent = parsed.text;

          // Check if the text content is pure JSON
          if (textContent.trim().startsWith('[') || textContent.trim().startsWith('{')) {
            try {
              const innerParsed = JSON.parse(textContent.trim());
              const prettyInnerJson = JSON.stringify(innerParsed, null, 2);
              const lines = prettyInnerJson.split('\n');

              if (lines.length <= maxLines) {
                return { truncated: prettyInnerJson, isTruncated: false };
              }

              // For nested JSON, show first few lines plus summary
              const truncatedLines = lines.slice(0, maxLines);
              let truncatedJson = truncatedLines.join('\n');

              // Try to close JSON structure properly
              if (prettyInnerJson.startsWith('{') && !truncatedJson.endsWith('}')) {
                truncatedJson += '\n}';
              } else if (prettyInnerJson.startsWith('[') && !truncatedJson.endsWith(']')) {
                truncatedJson += '\n]';
              }

              return {
                truncated: truncatedJson + '\n...',
                isTruncated: true
              };
            } catch {
              // If JSON parsing fails, fall back to text truncation
            }
          }

          // Handle text content that may contain embedded JSON
          const textLines = textContent.split('\n');

          // Check if any line contains a JSON array or object
          const jsonLineIndex = textLines.findIndex((line: string) =>
            line.trim().startsWith('[') || line.trim().startsWith('{')
          );

          if (jsonLineIndex !== -1) {
            const jsonLine = textLines[jsonLineIndex].trim();
            if (jsonLine.startsWith('[') || jsonLine.startsWith('{')) {
              try {
                const jsonData = JSON.parse(jsonLine);
                const prettyJson = JSON.stringify(jsonData, null, 2);
                const jsonLines = prettyJson.split('\n');

                // Calculate how many lines we have before the JSON (excluding empty lines)
                const nonEmptyLinesBefore = textLines.slice(0, jsonLineIndex).filter((line: string) => line.trim().length > 0).length;
                const availableLinesForJson = Math.max(1, maxLines - nonEmptyLinesBefore);

                if (nonEmptyLinesBefore >= maxLines) {
                  // JSON comes after max lines, just truncate text normally
                  return {
                    truncated: textLines.slice(0, maxLines).join('\n') + '\n...',
                    isTruncated: true
                  };
                }

                if (jsonLines.length <= availableLinesForJson && textLines.length <= maxLines) {
                  return { truncated: textContent, isTruncated: false };
                }

                // Build truncated content with pretty JSON
                let resultLines: string[] = [];

                // Add non-empty lines before JSON
                const linesBefore = textLines.slice(0, jsonLineIndex);
                resultLines.push(...linesBefore.filter((line: string) => line.trim().length > 0));

                // Add JSON content (limited by available space)
                const remainingSpace = maxLines - resultLines.length;
                if (remainingSpace > 0) {
                  if (jsonLines.length <= remainingSpace) {
                    resultLines.push(...jsonLines);

                    // Add remaining lines after JSON if space allows
                    const linesAfter = textLines.slice(jsonLineIndex + 1);
                    const nonEmptyAfter = linesAfter.filter((line: string) => line.trim().length > 0);
                    const spaceForAfter = maxLines - resultLines.length;
                    if (spaceForAfter > 0 && nonEmptyAfter.length > 0) {
                      resultLines.push(...nonEmptyAfter.slice(0, spaceForAfter));
                    }
                  } else {
                    resultLines.push(...jsonLines.slice(0, remainingSpace));
                  }
                }

                // Ensure we don't exceed max lines
                if (resultLines.length > maxLines) {
                  resultLines = resultLines.slice(0, maxLines);
                }

                const truncatedContent = resultLines.join('\n') + (resultLines.length >= maxLines ? '\n...' : '');

                return {
                  truncated: truncatedContent,
                  isTruncated: true
                };
              } catch {
                // If JSON parsing fails, fall back to text truncation
              }
            }
          }

          // Regular text truncation
          if (textLines.length <= maxLines) {
            return { truncated: textContent, isTruncated: false };
          }

          return {
            truncated: textLines.slice(0, maxLines).join('\n') + '\n...',
            isTruncated: true
          };
        }

        const prettyJson = JSON.stringify(parsed, null, 2);
        const lines = prettyJson.split('\n');

        if (lines.length <= maxLines) {
          return { truncated: prettyJson, isTruncated: false };
        }

        // For JSON, show first few lines plus summary
        const truncatedLines = lines.slice(0, maxLines);

        // Try to close JSON structure properly
        let truncatedJson = truncatedLines.join('\n');
        if (!truncatedJson.endsWith('}')) {
          truncatedJson += '\n}';
        }

        return {
          truncated: truncatedJson + '\n...',
          isTruncated: true
        };
      } catch {
        // If JSON parsing fails, fall back to text truncation
      }
    }

    // Handle regular text
    const lines = text.split('\n');
    if (lines.length <= maxLines) {
      return { truncated: text, isTruncated: false };
    }
    return {
      truncated: lines.slice(0, maxLines).join('\n') + '\n...',
      isTruncated: true
    };
  };

  // Toggle expand/collapse for tool outputs
  const toggleToolOutput = (messageId: number) => {
    setExpandedToolOutputs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  // Toggle expand/collapse for reports
  const toggleReport = (messageId: number) => {
    setExpandedReports(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  // Download report as text file
  const downloadReport = (content: string, messageId: number) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sap-report-${messageId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };



  // Check if user is near the bottom of the scroll area
  const checkIfNearBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      const isNear = distanceFromBottom < 100; // Consider "near bottom" if within 100px
      setIsNearBottom(isNear);
      setShowScrollToBottom(!isNear && messages.length > 1);
      return isNear;
    }
    return true;
  }, [messages.length]);

  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current && isNearBottom) {
      // Scroll the messages container directly
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      setShowScrollToBottom(false);
    }
  }, [isNearBottom]);

  // Handle scroll events to detect user intent
  const handleScroll = useCallback(() => {
    checkIfNearBottom();
  }, [checkIfNearBottom]);

  // Add scroll event listener
  useEffect(() => {
    const scrollContainer = messagesContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });

      // Initial check
      checkIfNearBottom();

      return () => {
        scrollContainer.removeEventListener('scroll', handleScroll);
      };
    }
  }, [handleScroll, checkIfNearBottom]);

  // Auto-scroll only when user is near bottom
  useEffect(() => {
    if (isNearBottom) {
      scrollToBottom();
    }
  }, [messages, isNearBottom, scrollToBottom]);

  // Focus input field when in collapsed mode
  useEffect(() => {
    if (!isExpanded && inputRef.current && isConnected) {
      // Small delay to ensure the component is rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isExpanded, isConnected]);

  // When streaming starts, if user is near bottom, ensure we stay at bottom
  useEffect(() => {
    if (isModelResponding && isNearBottom) {
      // Small delay to ensure new content has been rendered
      const timeoutId = setTimeout(() => {
        scrollToBottom();
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [isModelResponding, isNearBottom, scrollToBottom]);

  useEffect(() => {
    if (isConnected) {
      setConnectionStatus('connected');
    } else {
      setConnectionStatus('disconnected');
    }
  }, [isConnected]);

  // Default to new chat - no automatic conversation loading
  // Users can manually load previous conversations if needed

  // Track the previous message state to detect completion
  const [, setPreviousMessages] = useState<ChatMessage[]>([]);

  // Effect to detect when messages are completed and log them
  useEffect(() => {
    setPreviousMessages(currentPrev => {
      // Compare current messages with previous state to find completed messages
      if (currentPrev.length > 0 && messages.length > 0) {
        // Find messages that were previously in progress but are now complete
        const completedMessages = messages.filter(currentMsg => {
          const previousMsg = currentPrev.find(prev => prev.id === currentMsg.id);
          // Message was in progress before but is now complete
          return previousMsg && previousMsg.inprogress === true && currentMsg.inprogress === false;
        });

        // Log completed messages
        completedMessages.forEach(message => {
          if (conversationStarted && message.sender === 'assistant') {
            console.log('Logging completed message:', message.id, 'Type:', message.type, 'Content type:', typeof message.content);

            // Handle different message content types
            let contentToLog: string;
            if (typeof message.content === 'string') {
              contentToLog = message.content;
            } else {
              // For complex message types, create a readable string representation
              contentToLog = JSON.stringify(message.content, null, 2);
            }

            console.log('Logging completed message:', message.id, 'Content length:', contentToLog.length);
            logMessage('assistant', contentToLog, {
              type: message.type,
              completed_at: new Date().toISOString(),
              final_content: true
            });
          }
        });

        // Also check for stale in-progress messages (fallback for missed finish events)
        const now = Date.now();
        const staleMessages = messages.filter(currentMsg => {
          // Find messages that have been in progress for more than 30 seconds
          return currentMsg.sender === 'assistant' &&
                 currentMsg.inprogress === true &&
                 (now - currentMsg.timestamp.getTime()) > 30000; // 30 seconds
        });

        // Log stale messages as completed (fallback mechanism)
        staleMessages.forEach(message => {
          if (conversationStarted && message.sender === 'assistant') {
            console.log('Logging stale message (fallback):', message.id, 'Type:', message.type);

            let contentToLog: string;
            if (typeof message.content === 'string') {
              contentToLog = message.content;
            } else {
              contentToLog = JSON.stringify(message.content, null, 2);
            }

            logMessage('assistant', contentToLog, {
              type: message.type,
              completed_at: new Date().toISOString(),
              final_content: true,
              fallback_logging: true,
              reason: 'stale_message_timeout'
            });

            // Mark the message as completed in the UI
            setMessages(prev => prev.map(msg =>
              msg.id === message.id ? { ...msg, inprogress: false } : msg
            ));
          }
        });
      }

      // Return new previous messages state
      return messages;
    });
  }, [messages, conversationStarted, logMessage]);

  const handleWebUIEvent = useCallback((event: WebUIEvent) => {
    console.log('Received event:', event);

    switch (event.type) {
      case 'raw':
        // Handle raw events (text, reasoning, tool calls)
        if (event.data && typeof event.data === 'object') {
          const data = event.data as {
            type?: string;
            delta?: string;
            inprogress?: boolean;
            callid?: string;
            argument?: string;
          };

          setMessages(prev => {
            console.log('WebSocket event processing, current messages count:', prev.length);
            const lastMessage = prev[prev.length - 1];

            // Handle tool calls
            if (data.type === 'tool_call' && data.delta && data.callid) {
              console.log('Processing tool_call event:', data.callid);
              const newMessage: ChatMessage = {
                id: Date.now(),
                content: {
                  toolName: data.delta,
                  toolCallArgument: data.argument || '',
                  toolCallOutput: '',
                  callid: data.callid,
                },
                sender: 'assistant',
                timestamp: new Date(),
                type: 'tool_call',
                inprogress: data.inprogress,
                callid: data.callid,
              };

              // Log tool call to database
              if (conversationStarted) {
                logMessage('assistant', `Tool Call: ${data.delta}`, {
                  type: 'tool_call',
                  callid: data.callid,
                  tool_name: data.delta,
                  tool_input: data.argument
                });
              }

              return [...prev, newMessage];
            }

            // Handle tool call outputs
            if (data.type === 'tool_call_output' && data.delta && data.callid) {
              console.log('Processing tool_call_output event:', data.callid);
              const toolCallMessage = prev.find(msg => msg.callid === data.callid && msg.type === 'tool_call');
              if (toolCallMessage) {
                const messageIndex = prev.findIndex(msg => msg.callid === data.callid && msg.type === 'tool_call');
                if (messageIndex !== -1) {
                  const updatedMsgs = [...prev];
                  const toolMessage = updatedMsgs[messageIndex];
                  const updatedContent = {
                    ...(toolMessage.content as ToolCallMessage),
                    toolCallOutput: data.delta,
                  };

                  updatedMsgs[messageIndex] = {
                    ...toolMessage,
                    content: updatedContent,
                    inprogress: false,
                  };

                  // Log tool call output to database when complete
                  if (conversationStarted) {
                    logMessage('assistant', `Tool Result: ${data.delta}`, {
                      type: 'tool_result',
                      callid: data.callid,
                      tool_name: (toolMessage.content as ToolCallMessage).toolName,
                      tool_output: data.delta
                    });
                  }

                  return updatedMsgs;
                }
              }
              return prev;
            }

            // Handle streaming text updates
            if (lastMessage && lastMessage.sender === 'assistant' &&
                lastMessage.inprogress && data.delta &&
                ['text', 'reason', 'raw'].includes(data.type || '')) {
              console.log('Processing streaming text update');
              const updatedMessages = [...prev];
              updatedMessages[updatedMessages.length - 1] = {
                ...lastMessage,
                content: (lastMessage.content as string) + data.delta,
                inprogress: data.inprogress,
              };
              return updatedMessages;
            } else if (data.delta) {
              console.log('Creating new assistant message:', data.type);
              // Create new message for text/reasoning
              const newMessage: ChatMessage = {
                id: Date.now(),
                content: data.delta,
                sender: 'assistant',
                timestamp: new Date(),
                type: (data.type as ChatMessage['type']) || 'text',
                inprogress: data.inprogress,
              };

              // Don't log here - wait for message completion
              return [...prev, newMessage];
            }

            return prev;
          });
        }
        break;

      case 'orchestra':
        // Handle orchestra events (planner, worker, report)
        if (event.data && typeof event.data === 'object' && 'type' in event.data && 'item' in event.data) {
          const data = event.data as OrchestraEventData;
          console.log('Processing orchestra event:', data.type);
          setMessages(prev => {
            console.log('Orchestra event - current messages count:', prev.length);
            let content = '';
            let messageType: ChatMessage['type'] = 'text';

            if (data.type === 'plan' && 'analysis' in data.item && 'todo' in data.item) {
              const item = data.item as PlanItem;
              // Preserve the original markdown format from the planner
              content = `## Query Analysis\n\n${item.analysis}\n\n## Agent Action Plan\n\n${item.todo}`;
              messageType = 'plan';
            } else if (data.type === 'worker' && 'task' in data.item && 'output' in data.item) {
              const item = data.item as WorkerItem;
              content = `👨‍💼 **Task Completed**\n\n**Task:** ${item.task}\n\n**Output:** ${item.output}`;
              messageType = 'worker';
            } else if (data.type === 'report' && 'output' in data.item) {
              const item = data.item as ReportItem;
              content = `📊 **Report Generated**\n\n${item.output}`;
              messageType = 'report';
            }

            const newMessage: ChatMessage = {
              id: Date.now(),
              content: content,
              sender: 'assistant',
              timestamp: new Date(),
              type: messageType,
            };

            console.log('Adding orchestra message:', messageType);

            // Log orchestra events to database
            if (conversationStarted) {
              logMessage('assistant', content, {
                event_type: data.type,
                item: data.item
              });
            }

            return [...prev, newMessage];
          });
        }
        break;

      case 'new':
        // Handle new agent notifications
        if (event.data && typeof event.data === 'object' && 'name' in event.data) {
          const data = event.data as { name: string };
          const content = `🔄 **Agent Update**: ${data.name}`;
          setMessages(prev => {
            const newMessage: ChatMessage = {
              id: Date.now(),
              content: content,
              sender: 'assistant',
              timestamp: new Date(),
              type: 'new_agent',
            };

            // Log agent update to database
            if (conversationStarted) {
              logMessage('assistant', content, {
                type: 'new_agent',
                agent_name: data.name
              });
            }

            return [...prev, newMessage];
          });
        }
        break;

      case 'finish':
        setIsModelResponding(false);
        // Mark the last assistant message as completed
        setMessages(prev => {
          if (prev.length > 0) {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage.sender === 'assistant' && lastMessage.inprogress) {
              const updatedMessages = [...prev];
              updatedMessages[updatedMessages.length - 1] = {
                ...lastMessage,
                inprogress: false
              };
              return updatedMessages;
            }
          }
          return prev;
        });
        break;

      default:
        console.log('Unhandled event type:', event.type);
    }
  }, [conversationStarted]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle incoming WebSocket messages
  useEffect(() => {
    if (lastMessage?.data) {
      try {
        const event: WebUIEvent = JSON.parse(lastMessage.data);

        console.log('Processing WebSocket event:', event.type, event.data);
        handleWebUIEvent(event);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    }
  }, [lastMessage, handleWebUIEvent]);

  // Expose loadConversationById function to parent component via ref
  useEffect(() => {
    if (loadConversationRef) {
      loadConversationRef.current = {
        loadConversation: loadConversationById
      };
    }
  }, [loadConversationRef, loadConversationById]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isModelResponding || !isConnected) return;

    console.log('Sending message, conversationStarted:', conversationStarted, 'currentSessionId:', currentSessionId);

    // Expand the chatbot interface when sending the first message
    if (!isExpanded) {
      setIsExpanded(true);
    }

    let sessionIdForTitleUpdate = currentSessionId;

    // Create a new conversation if this is the first message
    if (!conversationStarted) {
      console.log('Creating new conversation...');
      const newSessionId = await createNewConversation();
      if (!newSessionId) {
        console.error('Failed to create conversation');
        return;
      }
      console.log('Conversation created successfully with sessionId:', newSessionId);
      sessionIdForTitleUpdate = newSessionId;
    } else {
      console.log('Using existing conversation, sessionId:', currentSessionId);
    }

    const userMessage: ChatMessage = {
      id: Date.now(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    console.log('Adding user message to state:', userMessage);
    setMessages(prev => {
      console.log('Previous messages count:', prev.length);
      return [...prev, userMessage];
    });

    // Log user message to database
    await logMessage('user', inputValue, undefined, sessionIdForTitleUpdate || undefined);

    // Update conversation title from first user message if this is the first message
    console.log('Checking title update conditions:', {
      conversationStarted,
      currentSessionId,
      sessionIdForTitleUpdate,
      inputValue: inputValue.substring(0, 50) + '...'
    });

    if (!conversationStarted) {
      if (sessionIdForTitleUpdate) {
        console.log('Calling updateConversationTitle with sessionId:', sessionIdForTitleUpdate);
        await updateConversationTitle(inputValue, sessionIdForTitleUpdate);
        // Now mark conversation as started after title update
        setConversationStarted(true);
        console.log('Conversation marked as started after title update');
      } else {
        console.error('ERROR: Conversation was created but sessionId is still null!');
        console.log('This indicates a timing issue with React state updates');
        // Fallback: try using currentSessionId from state (might work if state updated)
        if (currentSessionId) {
          console.log('Fallback: Using currentSessionId from state:', currentSessionId);
          await updateConversationTitle(inputValue, currentSessionId);
          setConversationStarted(true);
        }
      }
    } else {
      console.log('Conversation already started, skipping title update');
    }

    setInputValue('');
    setIsModelResponding(true);

    // Pass conversation history for context (exclude the current message and initial welcome message)
    const conversationHistory = messages.filter(msg =>
      msg.id !== userMessage.id &&
      !(typeof msg.content === 'string' &&
        (msg.content.includes('👋 **New Chat Started**') ||
         msg.content.includes("👋 Hi, I'm Deep SAP")))
    );
    sendQuery(inputValue, conversationHistory);
  };

  const handleStopMessage = () => {
    console.log('Stop button clicked - sending finish event');
    console.log('WebSocket connected:', isConnected);
    console.log('Is model responding:', isModelResponding);

    // Send finish event to server (same as Ctrl+C)
    const success = sendFinishEvent();
    console.log('Send finish event result:', success);

    // Set local state
    setIsModelResponding(false);
    console.log('Set isModelResponding to false');
  };


  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };



  const renderMessage = (message: ChatMessage) => {
    const isUser = message.sender === 'user';

    return (
      <div key={message.id} className={`flex items-start gap-3 ${isUser ? "justify-end" : "justify-start"} mb-4`}>
        {!isUser && (
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <Bot className="w-4 h-4 text-white" />
          </div>
        )}

        <div className={`max-w-[75%] p-4 rounded-2xl shadow-sm ${
          isUser
            ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white ml-auto"
            : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700"
        }`}>
          {message.type === 'report' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="text-lg">📊</div>
                  <div className="font-semibold text-sm">Report Generated</div>
                  <div className="text-xs opacity-70">
                    {expandedReports.has(message.id) ? 'Expanded' : 'Minimized'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleReport(message.id)}
                    className="h-8 px-3 text-xs hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  >
                    {expandedReports.has(message.id) ? (
                      <>
                        <ChevronUp className="w-4 h-4 mr-1" />
                        Minimize
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4 mr-1" />
                        Expand
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => downloadReport(typeof message.content === 'string' ? message.content : JSON.stringify(message.content, null, 2), message.id)}
                    className="h-8 px-3 text-xs hover:bg-green-50 dark:hover:bg-green-900/20"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download
                  </Button>
                </div>
              </div>
              {expandedReports.has(message.id) && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert">
                    {typeof message.content === 'string' ? (
                      <SafeMarkdown>
                        {message.content}
                      </SafeMarkdown>
                    ) : (
                      JSON.stringify(message.content, null, 2)
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : message.type === 'tool_call' ? (
            <div className="space-y-4 border-l-4 border-green-400 pl-4 bg-gradient-to-r from-green-50/50 to-transparent dark:from-green-950/20 dark:to-transparent rounded-r-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 text-green-500">
                  {message.inprogress ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-lg">🔧</div>
                  <div className="font-semibold text-sm text-green-700 dark:text-green-300">
                    {(message.content as ToolCallMessage).toolName}
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {(message.content as ToolCallMessage).toolCallArgument && (
                  <div className="mb-3">
                    <div className="font-medium text-xs opacity-80 mb-1">Arguments:</div>
                    <div className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-950/50 dark:to-gray-950/50 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                      <div className="text-xs font-mono text-slate-700 dark:text-slate-300 break-all">
                        {(message.content as ToolCallMessage).toolCallArgument}
                      </div>
                    </div>
                  </div>
                )}
                {(message.content as ToolCallMessage).toolCallOutput && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-medium text-xs opacity-80">Output:</div>
                      {(() => {
                        const { isTruncated } = truncateText((message.content as ToolCallMessage).toolCallOutput);
                        return isTruncated ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleToolOutput(message.id)}
                            className="h-6 px-2 text-xs hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                          >
                            {expandedToolOutputs.has(message.id) ? (
                              <>
                                <ChevronUp className="w-3 h-3 mr-1" />
                                Show less
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-3 h-3 mr-1" />
                                Show more
                              </>
                            )}
                          </Button>
                        ) : null;
                      })()}
                    </div>
                    <div className={`bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-950/30 dark:to-blue-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 ${(() => {
                      const { isTruncated } = truncateText((message.content as ToolCallMessage).toolCallOutput);
                      const isExpanded = expandedToolOutputs.has(message.id);
                      return isTruncated && !isExpanded ? 'relative' : '';
                    })()}`}>
                      {(() => {
                        const output = (message.content as ToolCallMessage).toolCallOutput;
                        const { truncated, isTruncated } = truncateText(output);
                        const isExpanded = expandedToolOutputs.has(message.id);
                        const displayText = (isExpanded || !isTruncated ? output : truncated) || '';
                        return (
                          <>
                            <div className="text-xs font-mono leading-relaxed">
                              <SafeMarkdown>
                                {displayText}
                              </SafeMarkdown>
                            </div>
                            {/* Fade overlay for truncated content */}
                            {isTruncated && !isExpanded && (
                              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-emerald-50 to-transparent dark:from-emerald-950/30 dark:to-transparent pointer-events-none rounded-b-lg"></div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}
                {message.inprogress && (
                  <div className="flex items-center gap-2 text-xs opacity-70 mt-3 p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                    <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                    <span className="text-blue-600 dark:text-blue-400 font-medium">
                      Executing {(message.content as ToolCallMessage).toolName}...
                    </span>
                  </div>
                )}

              </div>
            </div>
          ) : (
            <div className="text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert">
              {typeof message.content === 'string' ? (
                <SafeMarkdown>
                  {message.content}
                </SafeMarkdown>
              ) : (
                JSON.stringify(message.content, null, 2)
              )}
            </div>
          )}

          {message.inprogress && message.type !== 'tool_call' && (
            <div className="flex items-center gap-2 text-xs opacity-70 mt-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              Processing...
            </div>
          )}

          <div className="text-xs opacity-60 mt-2">
            {formatTime(message.timestamp)}
          </div>
        </div>

        {isUser && (
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-teal-600 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-white" />
          </div>
        )}
      </div>
    );
  };



  // Collapsed input-only interface
  if (!isExpanded) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden">
        <div className="w-full max-w-4xl mx-4">
          {/* Centered branding and input */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full px-6 py-3 mb-6 shadow-lg">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Deep SAP
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Multi-Agent SAP Career Guidance System
                </p>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
              👋 Hi, I&apos;m Deep SAP!
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
              Ask me anything about SAP careers, certifications, job transitions, and strategic planning
            </p>
          </div>

          {/* Input area */}
          <Card className="shadow-2xl border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="flex gap-4">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="What SAP career advice are you looking for today?"
                  className="flex-1 border-gray-300 dark:border-gray-600 focus:border-blue-500 h-14 text-lg px-6 rounded-full shadow-sm"
                  disabled={!isConnected}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || !isConnected}
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 h-14 rounded-full shadow-lg disabled:opacity-50"
                  title="Send message"
                >
                  <Send className="w-6 h-6" />
                </Button>
              </div>

              {/* Connection status */}
              <div className="text-center mt-6">
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <div className={`w-2 h-2 rounded-full ${
                    connectionStatus === 'connected' ? 'bg-green-400' :
                    connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' :
                    'bg-red-400'
                  }`} />
                  {connectionStatus === 'connected' ? 'Ready to assist' :
                   connectionStatus === 'connecting' ? 'Connecting...' :
                   'Connection lost'}
                </div>
              </div>

              {/* Example prompts */}
              <div className="mt-8">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 text-center">Try asking:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {[
                    "What equipment will I receive on my first day at SAP?",
                    "How can I transition to data science roles within SAP?",
                    "Analyze my performance reviews and suggest how I can improve",
                    "What certifications should I pursue to achieve my career goals?"
                  ].map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setInputValue(prompt);
                        // Small delay to ensure input value is set before sending
                        setTimeout(() => handleSendMessage(), 10);
                      }}
                      className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm"
                      disabled={!isConnected}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Expanded full chatbot interface
  return (
    <div className="h-screen flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95 duration-500">
      <Card className="flex-1 flex flex-col shadow-2xl border-0 bg-white dark:bg-gray-900">
        <CardHeader className="border-b bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white rounded-t-xl">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Deep SAP</h1>
                <p className="text-sm opacity-90">Multi-Agent SAP Career Guidance System</p>
              </div>
            </div>
            <Button
              onClick={() => setIsExpanded(false)}
              size="sm"
              variant="ghost"
              className="text-white/80 hover:text-white hover:bg-white/10 rounded-full p-2"
              title="Minimize to input mode"
            >
              <X className="w-4 h-4" />
            </Button>
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 p-0">
          <div className="h-full flex flex-col">
            {/* Error Banner */}
            {error && (
              <div className="bg-red-50 dark:bg-red-950/30 border-l-4 border-red-400 p-4 m-6 rounded-r-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <X className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700 dark:text-red-300">
                      {error}
                    </p>
                  </div>
                  <div className="ml-auto pl-3">
                    <button
                      onClick={() => setError(null)}
                      className="inline-flex rounded-md bg-red-50 dark:bg-red-950/30 p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50"
                    >
                      <span className="sr-only">Dismiss</span>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 relative">
              <div
                ref={messagesContainerRef}
                className="overflow-y-auto p-6 space-y-1"
                style={{
                  scrollBehavior: 'smooth',
                  overscrollBehavior: 'contain',
                  maxHeight: 'calc(100vh - 200px)' // Ensure it doesn't exceed viewport
                }}
              >
              {messages.map(renderMessage)}

              {isModelResponding && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Deep SAP is analyzing your career request...
                      </span>
                    </div>
                  </div>
                </div>
              )}

                <div ref={messagesEndRef} />
              </div>

              {/* Scroll to Bottom Button */}
              {showScrollToBottom && (
                <div className="absolute bottom-24 right-6 z-10">
                <Button
                  onClick={() => {
                    setIsNearBottom(true);
                    scrollToBottom();
                  }}
                  size="sm"
                  className="rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white h-12 w-12 p-0"
                  title="Scroll to bottom"
                >
                  <ChevronDown className="w-5 h-5" />
                </Button>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="border-t p-6 bg-gray-50/50 dark:bg-gray-800/50 rounded-b-xl">
              <div className="flex gap-3">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about your SAP career path, certifications, or job transitions with Deep SAP..."
                  className="flex-1 border-gray-300 dark:border-gray-600 focus:border-blue-500 h-12 text-base"
                  disabled={isModelResponding || !isConnected}
                />
                <Button
                  onClick={isModelResponding ? handleStopMessage : handleSendMessage}
                  disabled={(!inputValue.trim() && !isModelResponding) || !isConnected}
                  size="lg"
                  className={isModelResponding
                    ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6"
                    : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6"
                  }
                  title={isModelResponding ? "Stop current response" : "Send message"}
                >
                  {isModelResponding ? (
                    <X className="w-5 h-5" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center flex items-center justify-center gap-4">
                <span>Press Enter to send</span>
                <span>•</span>
                <span>Shift+Enter for new line</span>
                <span>•</span>
                <span>Click stop to cancel</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${
                    connectionStatus === 'connected' ? 'bg-green-400' :
                    connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' :
                    'bg-red-400'
                  }`} />
                  {connectionStatus === 'connected' ? 'Connected to Deep SAP' :
                   connectionStatus === 'connecting' ? 'Connecting...' :
                   'Disconnected'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>


    </div>
  );
}
