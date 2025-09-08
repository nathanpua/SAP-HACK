"use client";

import AppSidebar from "@/components/app-sidebar";
import { ChevronLeft, ChevronRight, MessageSquare, Clock } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUserProfile } from "@/lib/hooks/use-user-profile";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export default function ChatHistoryPage() {
  const { userProfile, isLoadingProfile, profileError, isAuthenticated } = useUserProfile();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 12,
    total: 0,
    total_pages: 0
  });
  const router = useRouter();


  const handleNavigateToChat = () => {
    router.push("/chatbot");
  };

  // Function to fetch conversations with pagination
  const fetchConversations = useCallback(async (page: number = 1, limit: number = 12) => {
    console.log(`🔄 Fetching conversations for page ${page}...`);
    try {
      setIsLoadingConversations(true);
      const response = await fetch(`/api/conversations?page=${page}&limit=${limit}`);
      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }

      const data = await response.json();
      console.log(`📋 Fetched ${data.conversations?.length || 0} conversations for page ${page}`);
      return data;
    } catch (error) {
      console.error('❌ Error fetching conversations:', error);
      return { conversations: [], pagination: { page, limit, total: 0, total_pages: 0 } };
    } finally {
      setIsLoadingConversations(false);
    }
  }, []);

  // Function to handle clicking on a conversation card
  const handleConversationClick = useCallback((sessionId: string) => {
    router.push(`/chatbot?sessionId=${sessionId}`);
  }, [router]);

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.total_pages) {
      fetchConversations(newPage, pagination.limit).then((data) => {
        setConversations(data.conversations || []);
        setPagination(data.pagination);
      });
    }
  };

  useEffect(() => {
    if (isAuthenticated === false) {
      router.push('/auth/login');
      return;
    }

    // Load initial conversations
    if (isAuthenticated === true) {
      fetchConversations(1, 12).then((data) => {
        setConversations(data.conversations || []);
        setPagination(data.pagination);
      });
    }
  }, [isAuthenticated, router, fetchConversations]);

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
      <AppSidebar
        userProfile={userProfile}
        isLoadingProfile={isLoadingProfile}
        profileError={profileError}
        activePage="chat-history"
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Chat History</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                View and manage all your past conversations
              </p>
            </div>
            <Button onClick={handleNavigateToChat} className="bg-blue-600 hover:bg-blue-700">
              <MessageSquare className="w-4 h-4 mr-2" />
              Start New Chat
            </Button>
          </div>
        </div>

        {/* Conversations Content - Full Height */}
        <div className="flex-1 flex flex-col">
          {/* Fixed Header Section */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            {/* Conversation Stats */}
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Showing {conversations.length} of {pagination.total} conversations
              </p>
            </div>
          </div>

          {/* Scrollable Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {isLoadingConversations ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">Loading conversations...</p>
                </div>
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex items-center justify-center py-12 px-6">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No conversations yet</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">Start your first conversation to see it here.</p>
                  <Button onClick={handleNavigateToChat} className="bg-blue-600 hover:bg-blue-700">
                    Start New Chat
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-3">
                {conversations.map((conversation) => (
                  <Card
                    key={conversation.id}
                    className="cursor-pointer hover:shadow-md transition-all duration-200 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
                    onClick={() => handleConversationClick(conversation.session_id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                          <MessageSquare className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-base font-semibold text-gray-900 dark:text-white leading-relaxed break-words mb-2">
                                {conversation.title.replace(/^["']|["']$/g, '')}
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-gray-400" />
                                  <p className="text-gray-600 dark:text-gray-400">
                                    Started: {new Date(conversation.started_at).toLocaleDateString()} {new Date(conversation.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-gray-400" />
                                  <p className="text-gray-600 dark:text-gray-400">
                                    Last: {new Date(conversation.last_message_at).toLocaleDateString()} {new Date(conversation.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                              <MessageSquare className="w-4 h-4" />
                              <span>{conversation.message_count} messages</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Pagination - Bottom */}
                {pagination.total_pages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                        let pageNum;
                        if (pagination.total_pages <= 5) {
                          pageNum = i + 1;
                        } else if (pagination.page <= 3) {
                          pageNum = i + 1;
                        } else if (pagination.page >= pagination.total_pages - 2) {
                          pageNum = pagination.total_pages - 4 + i;
                        } else {
                          pageNum = pagination.page - 2 + i;
                        }

                        return (
                          <Button
                            key={pageNum}
                            variant={pageNum === pagination.page ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.total_pages}
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
