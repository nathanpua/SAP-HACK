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
}

// Helper function to format time consistently
const formatTime = (date: Date) => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};


export function CareerCoachChatbot({ wsUrl = 'ws://127.0.0.1:8848/ws' }: CareerCoachChatbotProps) {

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      content: `👋 Welcome to your SAP Career Coach!

I'm here to help you navigate your SAP career journey with personalized guidance, certification recommendations, and strategic planning.

💡 **Example questions you can ask:**
• "I'm an SAP consultant with 3 years experience wanting to become a Solution Architect. What's my path?"
• "I specialize in SAP HCM and want to transition to SAP SuccessFactors. How should I plan this?"
• "What SAP certifications should I pursue for a senior technical role?"

Let's build your SAP career roadmap together! 🚀`,
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


  const { sendQuery, lastMessage, readyState } = useChatWebSocket(wsUrl);

  const isConnected = readyState === ReadyState.OPEN;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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



  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      // Scroll the messages container directly
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isConnected) {
      setConnectionStatus('connected');
    } else {
      setConnectionStatus('disconnected');
    }
  }, [isConnected]);





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
            const lastMessage = prev[prev.length - 1];

            // Handle tool calls
            if (data.type === 'tool_call' && data.delta && data.callid) {
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
              return [...prev, newMessage];
            }

            // Handle tool call outputs
            if (data.type === 'tool_call_output' && data.delta && data.callid) {
              const toolCallMessage = prev.find(msg => msg.callid === data.callid && msg.type === 'tool_call');
              if (toolCallMessage) {
                const messageIndex = prev.findIndex(msg => msg.callid === data.callid && msg.type === 'tool_call');
                if (messageIndex !== -1) {
                  const updatedMsgs = [...prev];
                  const toolMessage = updatedMsgs[messageIndex];
                  updatedMsgs[messageIndex] = {
                    ...toolMessage,
                    content: {
                      ...(toolMessage.content as ToolCallMessage),
                      toolCallOutput: data.delta,
                    },
                    inprogress: false,
                  };
                  return updatedMsgs;
                }
              }
              return prev;
            }

            // Handle streaming text updates
            if (lastMessage && lastMessage.sender === 'assistant' &&
                lastMessage.type === data.type && lastMessage.inprogress && data.delta) {
              const updatedMessages = [...prev];
              updatedMessages[updatedMessages.length - 1] = {
                ...lastMessage,
                content: (lastMessage.content as string) + data.delta,
                inprogress: data.inprogress,
              };
              return updatedMessages;
            } else if (data.delta) {
              // Create new message for text/reasoning
              const newMessage: ChatMessage = {
                id: Date.now(),
                content: data.delta,
                sender: 'assistant',
                timestamp: new Date(),
                type: (data.type as ChatMessage['type']) || 'text',
                inprogress: data.inprogress,
              };
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
          setMessages(prev => {
            let content = '';
            let messageType: ChatMessage['type'] = 'text';

            if (data.type === 'plan' && 'analysis' in data.item && 'todo' in data.item) {
              const item = data.item as PlanItem;
              content = `📋 **Plan Generated**\n\n${item.analysis}\n\n**Tasks:**\n${item.todo.map((task: string) => `• ${task}`).join('\n')}`;
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
            return [...prev, newMessage];
          });
        }
        break;

      case 'new':
        // Handle new agent notifications
        if (event.data && typeof event.data === 'object' && 'name' in event.data) {
          const data = event.data as { name: string };
          setMessages(prev => {
            const newMessage: ChatMessage = {
              id: Date.now(),
              content: `🔄 **Agent Update**: ${data.name}`,
              sender: 'assistant',
              timestamp: new Date(),
              type: 'new_agent',
            };
            return [...prev, newMessage];
          });
        }
        break;

      case 'finish':
        setIsModelResponding(false);
        break;

      default:
        console.log('Unhandled event type:', event.type);
    }
  }, []);

  // Handle incoming WebSocket messages
  useEffect(() => {
    if (lastMessage?.data) {
      try {
        const event: WebUIEvent = JSON.parse(lastMessage.data);
        handleWebUIEvent(event);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    }
  }, [lastMessage, handleWebUIEvent]);

  const handleSendMessage = () => {
    if (!inputValue.trim() || isModelResponding || !isConnected) return;

    const userMessage: ChatMessage = {
      id: Date.now(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsModelResponding(true);

    sendQuery(inputValue);
  };

  const handleStopMessage = () => {
    setIsModelResponding(false);
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



  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Card className="flex-1 flex flex-col shadow-2xl border-0 bg-white dark:bg-gray-900">
        <CardHeader className="border-b bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white rounded-t-xl">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">SAP Career Coach</h1>
                <p className="text-sm opacity-90">Multi-Agent SAP Career Guidance System</p>
              </div>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 p-0">
          <div className="h-full flex flex-col">
            {/* Messages Area */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-6 space-y-1"
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
                        AI is analyzing your career request...
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>


            {/* Input Area */}
            <div className="border-t p-6 bg-gray-50/50 dark:bg-gray-800/50 rounded-b-xl">
              <div className="flex gap-3">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about your SAP career path, certifications, or job transitions..."
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
                  {connectionStatus === 'connected' ? 'Connected to SAP Career Coach' :
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
