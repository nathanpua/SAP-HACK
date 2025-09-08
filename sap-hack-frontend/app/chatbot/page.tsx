"use client";

import { CareerCoachChatbot } from "@/components/career-coach-chatbot";
import AppSidebar from "@/components/app-sidebar";
import { useUserProfile } from "@/lib/hooks/use-user-profile";
import { useConversations } from "@/lib/hooks/use-conversations";
import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ChatbotPageContent() {
  const { userProfile, isLoadingProfile, profileError, isAuthenticated } = useUserProfile();
  const { recentConversations, isLoadingConversations, currentConversation, setCurrentConversation, fetchRecentConversations } = useConversations();
  const [hasLoadedFromUrl, setHasLoadedFromUrl] = useState(false);
  const chatbotRef = useRef<{ loadConversation: (sessionId: string) => void } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();


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
  }, [setCurrentConversation]);

  useEffect(() => {
    if (isAuthenticated === false) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);

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
      <AppSidebar
        userProfile={userProfile}
        isLoadingProfile={isLoadingProfile}
        profileError={profileError}
        recentConversations={recentConversations}
        isLoadingConversations={isLoadingConversations}
        currentConversation={currentConversation}
        activePage="chatbot"
      />

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

export default function ChatbotPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading chatbot...</p>
        </div>
      </div>
    }>
      <ChatbotPageContent />
    </Suspense>
  );
}
