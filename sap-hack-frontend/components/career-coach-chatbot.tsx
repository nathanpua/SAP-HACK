"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Bot, User, Loader2, CheckCircle, XCircle, Sparkles, BookOpen, Briefcase, Target, Minimize2, Maximize2, Download, X } from "lucide-react";
import { ChatMessage, WebUIEvent, ToolCallMessage } from "@/lib/websocket-service";
import useWebSocket, { ReadyState } from 'react-use-websocket';


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
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

import rehypeSanitize from 'rehype-sanitize';

interface CareerCoachChatbotProps {
  wsUrl?: string;
}

// Helper function to format time consistently
const formatTime = (date: Date) => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

// Type definitions for markdown components
interface MarkdownComponentProps {
  children?: React.ReactNode;
  [key: string]: unknown;
}

// Custom markdown components for better rendering
const markdownComponents: Record<string, React.ComponentType<MarkdownComponentProps>> = {
  // Code blocks
  code: ({ inline, className, children, ...props }) => {
    const match = /language-(\w+)/.exec((className as string) || '');
    return !inline && match ? (
      <pre className="bg-gray-100 dark:bg-gray-800 rounded-md p-4 overflow-x-auto my-4">
        <code className={`${className || ''} text-sm`} {...props}>
          {children}
        </code>
      </pre>
    ) : (
      <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm font-mono" {...props}>
        {children}
      </code>
    );
  },
  // Blockquotes
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-blue-500 pl-4 italic my-4 text-gray-700 dark:text-gray-300">
      {children}
    </blockquote>
  ),
  // Tables
  table: ({ children }) => (
    <div className="overflow-x-auto my-4">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-gray-50 dark:bg-gray-800">
      {children}
    </thead>
  ),
  tbody: ({ children }) => (
    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
      {children}
    </tbody>
  ),
  tr: ({ children }) => (
    <tr>
      {children}
    </tr>
  ),
  th: ({ children }) => (
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
      {children}
    </td>
  ),
  // Lists
  ul: ({ children }) => (
    <ul className="list-disc list-inside my-4 space-y-2">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside my-4 space-y-2">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="text-gray-900 dark:text-gray-100">
      {children}
    </li>
  ),
  // Headings
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold mb-4 mt-6 text-gray-900 dark:text-gray-100">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-bold mb-3 mt-5 text-gray-900 dark:text-gray-100">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-lg font-semibold mb-2 mt-4 text-gray-900 dark:text-gray-100">
      {children}
    </h3>
  ),
  // Links
  a: ({ children, href }) => (
    <a
      href={href as string}
      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  // Paragraphs
  p: ({ children }) => (
    <p className="mb-4 text-gray-900 dark:text-gray-100 leading-relaxed">
      {children}
    </p>
  ),
  // Strong/Bold
  strong: ({ children }) => (
    <strong className="font-semibold text-gray-900 dark:text-gray-100">
      {children}
    </strong>
  ),
  // Emphasis/Italic
  em: ({ children }) => (
    <em className="italic text-gray-900 dark:text-gray-100">
      {children}
    </em>
  ),
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
  const [isReportMinimized, setIsReportMinimized] = useState(true);
  const [latestReportContent, setLatestReportContent] = useState<string>('');
  const [currentAgent, setCurrentAgent] = useState<string>('SAP Career');
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  const lastMessageIdRef = useRef<string | null>(null);

  const { sendMessage, lastMessage, readyState } = useWebSocket(wsUrl, {
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

  const isConnected = readyState === ReadyState.OPEN;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);



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


  const handleRawEvent = useCallback((event: WebUIEvent) => {
    const data = event.data;

    if (!data || !('type' in data)) return;

    setMessages(prev => {
      const lastMessage = prev[prev.length - 1];

      if (data.type === "tool_call" && 'delta' in data && 'callid' in data) {
        // Only create tool call message if delta is not empty
        if (!data.delta || data.delta.trim() === "") {
          return prev;
        }

        const toolCallMessage: ChatMessage = {
          id: Date.now(),
          content: {
            toolName: data.delta || "",
            toolCallArgument: ('argument' in data ? data.argument : "") || "",
            toolCallOutput: "",
            callid: data.callid || "",
          },
          sender: 'assistant',
          timestamp: new Date(),
          type: "tool_call",
          inprogress: true,
          requireConfirm: event.requireConfirm,
          callid: data.callid,
        };

        return [...prev, toolCallMessage];
      }

      if (data.type === "tool_call_output" && 'callid' in data && 'delta' in data) {
        // Only update tool call output if delta is not empty
        if (!data.delta || data.delta.trim() === "") {
          return prev;
        }

        const toolCallId = data.callid;
        const messageIndex = prev.findIndex(msg => msg.callid === toolCallId && msg.type === "tool_call");

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
            requireConfirm: event.requireConfirm,
          };
          return updatedMsgs;
        }
        return prev;
      }

      if ((data.type === "text" || data.type === "reason") && 'delta' in data) {
        // Only process if delta is not empty
        if (!data.delta || data.delta.trim() === "") {
          return prev;
        }

        if (lastMessage && lastMessage.sender === 'assistant' &&
            lastMessage.type === data.type && lastMessage.inprogress) {
          // Update existing message
          const updatedMessages = [...prev];
          updatedMessages[updatedMessages.length - 1] = {
            ...lastMessage,
            content: (lastMessage.content as string) + data.delta,
          };
          return updatedMessages;
        } else {
          // Create new message
          const newMessage: ChatMessage = {
            id: Date.now(),
            content: data.delta,
            sender: 'assistant',
            timestamp: new Date(),
            type: data.type,
            inprogress: true,
          };
          return [...prev, newMessage];
        }
      }

      return prev;
    });
  }, []);

  const handleOrchestraEvent = useCallback((event: WebUIEvent) => {
    const data = event.data;

    if (!data || !('type' in data) || !('item' in data)) return;

    setMessages(prev => {
      const item = data.item as string | PlanItem | WorkerItem | ReportItem;

      // Check if the item has meaningful content
      let hasContent = false;
      if (typeof item === 'string') {
        hasContent = item.trim() !== "";
      } else if (typeof item === 'object' && item !== null) {
        // Type guard checks for known item types
        if ('output' in item && typeof (item as ReportItem).output === 'string') {
          hasContent = (item as ReportItem).output.trim() !== "";
        } else if ('task' in item && typeof (item as WorkerItem).task === 'string') {
          hasContent = (item as WorkerItem).task.trim() !== "";
        } else if ('analysis' in item && typeof (item as PlanItem).analysis === 'string') {
          hasContent = (item as PlanItem).analysis.trim() !== "";
        }
      }

      // Don't create message if no meaningful content
      if (!hasContent) {
        return prev;
      }

      let messageContent: string | PlanItem | WorkerItem | ReportItem = item;
      let messageType: ChatMessage['type'] = 'text';

      switch (data.type) {
        case 'plan':
          messageType = 'plan';
          break;
        case 'worker':
          messageType = 'worker';
          break;
        case 'report':
          messageType = 'report';
          // Store the report content for download
          if (typeof item === 'object' && 'output' in item) {
            setLatestReportContent(item.output);
          }
          setIsReportMinimized(true); // Default to minimized when report is generated
          break;
        default:
          messageContent = JSON.stringify(item);
      }

      const newMessage: ChatMessage = {
        id: Date.now(),
        content: messageContent,
        sender: 'assistant',
        timestamp: new Date(),
        type: messageType,
      };
      return [...prev, newMessage];
    });
  }, []);

  const handleNewAgentEvent = useCallback((event: WebUIEvent) => {
    const data = event.data;

    if (!data || !('name' in data)) return;

    // Don't create message if agent name is empty
    if (!data.name || data.name.trim() === "") {
      return;
    }

    // Update current agent
    setCurrentAgent(data.name);

    setMessages(prev => {
      const newMessage: ChatMessage = {
        id: Date.now(),
        content: `🔄 **Switching to SAP Agent: ${data.name}**`,
        sender: 'assistant',
        timestamp: new Date(),
        type: 'new_agent',
      };
      return [...prev, newMessage];
    });
  }, []);

  // Create stable references to handlers using useRef
  const handleRawEventRef = useRef(handleRawEvent);
  const handleOrchestraEventRef = useRef(handleOrchestraEvent);
  const handleNewAgentEventRef = useRef(handleNewAgentEvent);

  // Update refs when handlers change
  useEffect(() => {
    handleRawEventRef.current = handleRawEvent;
    handleOrchestraEventRef.current = handleOrchestraEvent;
    handleNewAgentEventRef.current = handleNewAgentEvent;
  }, [handleRawEvent, handleOrchestraEvent, handleNewAgentEvent]);

  const handleWebUIEvent = useCallback((event: WebUIEvent) => {
    console.log('Received event:', event);

    switch (event.type) {
      case 'raw':
        handleRawEventRef.current(event);
        break;

      case 'orchestra':
        handleOrchestraEventRef.current(event);
        break;

      case 'new':
        handleNewAgentEventRef.current(event);
        break;

      case 'finish':
        setIsModelResponding(false);
        setCurrentAgent('SAP Career'); // Reset to default agent when finished
        break;

      default:
        console.log('Unhandled event type:', event.type);
    }
  }, []); // Stable callback using refs

  // Handle incoming WebSocket messages with deduplication
  useEffect(() => {
    if (lastMessage?.data) {
      // Create a unique message ID based on timestamp and data
      const messageId = `${lastMessage.timeStamp}-${lastMessage.data}`;

      // Skip if we've already processed this message
      if (lastMessageIdRef.current === messageId) {
        return;
      }

      lastMessageIdRef.current = messageId;

      try {
        const event: WebUIEvent = JSON.parse(lastMessage.data);
        handleWebUIEvent(event);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
        // Reset the ref on error to allow retry
        lastMessageIdRef.current = null;
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
    setCurrentAgent('SAP Career'); // Reset to default agent for new request

    if (readyState === ReadyState.OPEN) {
      const message = {
        type: 'query',
        query: inputValue
      };
      sendMessage(JSON.stringify(message));
    } else {
      setIsModelResponding(false);
      // Add error message
      const errorMessage: ChatMessage = {
        id: Date.now() + 1,
        content: '❌ Failed to send message. Please check your connection to the Career Coach agent.',
        sender: 'assistant',
        timestamp: new Date(),
        type: 'error'
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleStopMessage = () => {
    setIsModelResponding(false);
    setCurrentAgent('SAP Career'); // Reset to default agent

    // Send stop signal to backend if connected
    if (readyState === ReadyState.OPEN) {
      const stopMessage = {
        type: 'stop'
      };
      sendMessage(JSON.stringify(stopMessage));
    }
  };


  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleConfirmAction = (messageId: number, confirmed: boolean) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId
          ? { ...msg, confirmedStatus: confirmed ? 'confirmed' : 'rejected' }
          : msg
      )
    );
  };

  const handleDownloadReport = () => {
    if (!latestReportContent) return;

    // Create a blob with the report content
    const blob = new Blob([latestReportContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);

    // Create a temporary anchor element and trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = `sap-career-assessment-report-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();

    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };


  const handleRestoreReport = () => {
    setIsReportMinimized(false);
  };

  const handleMinimizeReport = () => {
    setIsReportMinimized(true);
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
          {message.type === 'tool_call' ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <div className="font-medium text-sm text-green-600 dark:text-green-400">
                  🔧 SAP Agent Tool Execution
                </div>
              </div>
              <div className="text-sm">
                <div className="font-medium">{(message.content as ToolCallMessage).toolName}</div>
                {(message.content as ToolCallMessage).toolCallArgument && (
                  <div className="text-xs opacity-80 mt-1">
                    <strong>Parameters:</strong> {(message.content as ToolCallMessage).toolCallArgument}
                  </div>
                )}
                {(message.content as ToolCallMessage).toolCallOutput && (
                  <div className="text-xs opacity-80 mt-2 bg-black/5 dark:bg-white/5 p-2 rounded">
                    <strong>Output:</strong> {(message.content as ToolCallMessage).toolCallOutput}
                  </div>
                )}
                {message.inprogress && (
                  <div className="flex items-center gap-2 text-xs opacity-70 mt-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Executing...
                  </div>
                )}
              </div>
            </div>
          ) : message.type === 'plan' ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-500" />
                <div className="font-medium text-sm text-blue-600 dark:text-blue-400">
                  📋 SAP Career Development Plan
                </div>
              </div>
              <div className="text-sm space-y-2">
                <div className="font-medium prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex, rehypeSanitize]}
                    components={markdownComponents}
                  >
                    {(message.content as PlanItem).analysis}
                  </ReactMarkdown>
                </div>
                <div className="space-y-1">
                  {(message.content as PlanItem).todo.map((item: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-0.5" />
                      <div className="prose prose-xs max-w-none dark:prose-invert">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkMath]}
                          rehypePlugins={[rehypeKatex, rehypeSanitize]}
                          components={markdownComponents}
                        >
                          {item}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : message.type === 'worker' ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-purple-500" />
                <div className="font-medium text-sm text-purple-600 dark:text-purple-400">
                  👨‍💼 SAP Specialist Task
                </div>
              </div>
              <div className="text-sm">
                <div className="font-medium mb-1 prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex, rehypeSanitize]}
                    components={markdownComponents}
                  >
                    {(message.content as WorkerItem).task}
                  </ReactMarkdown>
                </div>
                <div className="text-xs opacity-80 prose prose-xs max-w-none dark:prose-invert">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex, rehypeSanitize]}
                    components={markdownComponents}
                  >
                    {(message.content as WorkerItem).output}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          ) : message.type === 'report' ? (
            isReportMinimized ? (
              // Collapsed/Minimized Report View
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-green-500" />
                    <div className="font-medium text-sm text-green-600 dark:text-green-400">
                      📊 SAP Career Assessment Report
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      (Minimized)
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleDownloadReport}
                      className="h-6 px-2 text-xs hover:bg-green-50 dark:hover:bg-green-900/20"
                      title="Download Report"
                    >
                      <Download className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleRestoreReport}
                      className="h-6 px-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      title="Expand Report"
                    >
                      <Maximize2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <div className="font-medium mb-1">Report Summary:</div>
                    <div className="text-xs">
                      • Career assessment completed
                      • Personalized recommendations generated
                      • Skill development roadmap created
                    </div>
                    <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 font-medium">
                      Click expand to view full report
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Full Report View
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-green-500" />
                    <div className="font-medium text-sm text-green-600 dark:text-green-400">
                      📊 SAP Career Assessment Report
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleDownloadReport}
                      className="h-6 px-2 text-xs hover:bg-green-50 dark:hover:bg-green-900/20"
                      title="Download Report"
                    >
                      <Download className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleMinimizeReport}
                      className="h-6 px-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      title="Minimize Report"
                    >
                      <Minimize2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="text-sm prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex, rehypeSanitize]}
                    components={markdownComponents}
                  >
                    {(message.content as ReportItem).output}
                  </ReactMarkdown>
                </div>
              </div>
            )
          ) : message.type === 'new_agent' ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-500" />
                <div className="font-medium text-sm text-yellow-600 dark:text-yellow-400">
                  Agent Switch
                </div>
              </div>
              <div className="text-sm prose prose-sm max-w-none dark:prose-invert">
                {typeof message.content === 'string' ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex, rehypeSanitize]}
                    components={markdownComponents}
                  >
                    {message.content}
                  </ReactMarkdown>
                ) : (
                  JSON.stringify(message.content, null, 2)
                )}
              </div>
            </div>
          ) : message.type === 'error' ? (
            <div className="space-y-2">
              <div className="text-red-600 dark:text-red-400 font-medium text-sm">
                ❌ Error
              </div>
              <div className="text-sm prose prose-sm max-w-none dark:prose-invert">
                {typeof message.content === 'string' ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex, rehypeSanitize]}
                    components={markdownComponents}
                  >
                    {message.content}
                  </ReactMarkdown>
                ) : (
                  JSON.stringify(message.content, null, 2)
                )}
              </div>
            </div>
          ) : (
            <div className="text-sm leading-relaxed">
              {typeof message.content === 'string' ? (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex, rehypeSanitize]}
                    components={markdownComponents}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              ) : (
                JSON.stringify(message.content, null, 2)
              )}
            </div>
          )}

          {message.requireConfirm && !message.confirmedStatus && (
            <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-xs bg-green-50 hover:bg-green-100 border-green-300 text-green-700"
                onClick={() => handleConfirmAction(message.id, true)}
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-xs bg-red-50 hover:bg-red-100 border-red-300 text-red-700"
                onClick={() => handleConfirmAction(message.id, false)}
              >
                <XCircle className="w-3 h-3 mr-1" />
                Reject
              </Button>
            </div>
          )}

          {message.confirmedStatus && (
            <div className={`text-xs mt-2 px-2 py-1 rounded ${
              message.confirmedStatus === 'confirmed'
                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
            }`}>
              {message.confirmedStatus === 'confirmed' ? '✓ Approved' : '✗ Rejected'}
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
                        {currentAgent} is analyzing your career request...
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
