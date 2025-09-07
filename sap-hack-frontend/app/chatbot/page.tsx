"use client";

import { CareerCoachChatbot } from "@/components/career-coach-chatbot";
import { Bot, User, Settings, MessageSquare, BookOpen, Target, LogOut, UserCircle, Clock, History } from "lucide-react";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cacheManager } from "@/lib/cache-manager";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";

interface UserProfile {
  firstName: string | null;
  lastName: string | null;
  email: string;
  fullName: string;
  role?: {
    title: string;
    code: string;
    career_level: string;
  } | null;
}

interface Conversation {
  id: string;
  session_id: string;
  title: string;
  started_at: string;
  last_message_at: string;
  message_count: number;
  status: string;
  conversation_type: string;
}

interface CurrentConversation {
  sessionId: string;
  title: string;
  started_at: string;
  message_count: number;
}

export default function ChatbotPage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [recentConversations, setRecentConversations] = useState<Conversation[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [currentConversation, setCurrentConversation] = useState<CurrentConversation | null>(null);
  const [hasLoadedFromUrl, setHasLoadedFromUrl] = useState(false);
  const chatbotRef = useRef<{ loadConversation: (sessionId: string) => void } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleLogout = async () => {
    // Invalidate caches before logout
    await cacheManager.invalidateUserCaches();

    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  const handleViewProfile = () => {
    router.push("/profile");
  };

  // Function to fetch recent conversations
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

  // Function to handle clicking on a conversation card
  const handleConversationClick = useCallback((sessionId: string) => {
    if (chatbotRef.current) {
      chatbotRef.current.loadConversation(sessionId);
      // Clear current conversation when switching to another conversation
      setCurrentConversation(null);
    }
  }, []);

  // Function to handle when a new conversation is created
  const handleConversationCreated = useCallback(() => {
    console.log('New conversation created, refreshing conversations list');
    fetchRecentConversations();
  }, [fetchRecentConversations]);

  // Function to handle when conversation title is updated
  const handleConversationTitleUpdated = useCallback(() => {
    console.log('Conversation title updated, refreshing conversations list');
    fetchRecentConversations();
  }, [fetchRecentConversations]);

  // Function to update current conversation title
  const handleCurrentConversationTitleUpdate = useCallback(async (sessionId: string) => {
    try {
      console.log('Fetching updated conversation details for sessionId:', sessionId);
      const response = await fetch(`/api/conversations/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.conversation) {
          const conversation = data.conversation;
          setCurrentConversation({
            sessionId: conversation.session_id,
            title: conversation.title,
            started_at: conversation.started_at,
            message_count: conversation.message_count
          });
          console.log('Updated current conversation title to:', conversation.title);
        }
      }
    } catch (error) {
      console.error('Error fetching updated conversation:', error);
    }
  }, []);

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setIsAuthenticated(false);
          router.push('/auth/login');
          return;
        }

        setIsAuthenticated(true);

        // Fetch user profile after confirming authentication
        const fetchUserProfile = async () => {
          try {
            const response = await fetch('/api/user-profile');
            if (!response.ok) {
              throw new Error('Failed to fetch user profile');
            }
            const data = await response.json();
            setUserProfile(data);
          } catch (error) {
            console.error('Error fetching user profile:', error);
            setProfileError('Failed to load user profile');
          } finally {
            setIsLoadingProfile(false);
          }
        };

        fetchUserProfile();
        fetchRecentConversations();
      } catch (error) {
        console.error('Error checking authentication:', error);
        setIsAuthenticated(false);
        router.push('/auth/login');
      }
    };

    checkAuthentication();
  }, [router, fetchRecentConversations]);

  // Handle loading conversation from URL parameters
  useEffect(() => {
    const sessionId = searchParams.get('sessionId');

    if (sessionId && !hasLoadedFromUrl && chatbotRef.current && isAuthenticated) {
      console.log('Loading conversation from URL parameter:', sessionId);

      // Load the conversation
      chatbotRef.current.loadConversation(sessionId);

      // Fetch conversation details for the current conversation state
      const fetchConversationDetails = async () => {
        try {
          const response = await fetch(`/api/conversations/${sessionId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.conversation) {
              const conversation = data.conversation;
              setCurrentConversation({
                sessionId: conversation.session_id,
                title: conversation.title,
                started_at: conversation.started_at,
                message_count: conversation.message_count
              });
              console.log('Updated current conversation from URL:', conversation.title);
            }
          }
        } catch (error) {
          console.error('Error fetching conversation details from URL:', error);
        }
      };

      fetchConversationDetails();
      setHasLoadedFromUrl(true);

      // Clear the URL parameter to prevent re-loading on navigation
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('sessionId');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [searchParams, hasLoadedFromUrl, isAuthenticated]);

  // Show loading while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (isAuthenticated === false) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Mock Sidebar */}
      <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">SAP Career Coach</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">AI Assistant</p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 p-4">
          <nav className="space-y-2">
            <div className="flex items-center gap-3 px-3 py-2 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <MessageSquare className="w-5 h-5" />
              <span className="font-medium">Chat</span>
            </div>

            <div className="flex items-center gap-3 px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg cursor-pointer" onClick={() => router.push('/chat-history')}>
              <History className="w-5 h-5" />
              <span>Chat History</span>
            </div>

            <div className="flex items-center gap-3 px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg cursor-pointer" onClick={() => router.push('/reports')}>
              <BookOpen className="w-5 h-5" />
              <span>Reports</span>
            </div>

            <div className="flex items-center gap-3 px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg cursor-pointer">
              <Target className="w-5 h-5" />
              <span>Goals</span>
            </div>

            <div className="flex items-center gap-3 px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg cursor-pointer">
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </div>
          </nav>

          {/* Current Conversation */}
          {currentConversation && (
            <div className="mt-8">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Current Chat
              </h3>
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white leading-relaxed break-words">
                        {currentConversation.title.replace(/^["']|["']$/g, '')}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(currentConversation.started_at).toLocaleDateString()} {new Date(currentConversation.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recent Chats */}
          <div className="mt-8">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Recent Chats</h3>
            <div className="space-y-2">
              {isLoadingConversations ? (
                <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                  Loading conversations...
                </div>
              ) : recentConversations.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                  No recent conversations
                </div>
              ) : (
                recentConversations
                  .filter(conversation => conversation.session_id !== currentConversation?.sessionId)
                  .map((conversation) => (
                  <Card
                    key={conversation.id}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-gray-200 dark:border-gray-700"
                    onClick={() => handleConversationClick(conversation.session_id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white leading-relaxed break-words">
                            {conversation.title.replace(/^["']|["']$/g, '')}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(conversation.last_message_at).toLocaleDateString()} {new Date(conversation.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-teal-600 flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {isLoadingProfile ? (
                      "Loading..."
                    ) : profileError ? (
                      "User"
                    ) : (
                      userProfile?.fullName || "User"
                    )}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {isLoadingProfile ? (
                      "Loading..."
                    ) : profileError ? (
                      "Offline"
                    ) : userProfile?.role?.title ? (
                      userProfile.role.title
                    ) : (
                      "Employee"
                    )}
                  </p>
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={handleViewProfile}>
                <UserCircle className="w-4 h-4 mr-2" />
                View Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <CareerCoachChatbot
          loadConversationRef={chatbotRef}
          onConversationCreated={handleConversationCreated}
          onConversationTitleUpdated={handleConversationTitleUpdated}
          onCurrentConversationTitleUpdate={handleCurrentConversationTitleUpdate}
        />
      </div>
    </div>
  );
}
