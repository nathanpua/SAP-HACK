'use client';

import { Bot, User, Settings, MessageSquare, BookOpen, Target, LogOut, UserCircle, Clock, History } from "lucide-react";
import { useRouter } from "next/navigation";
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
  id: string;
  employeeId: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  fullName: string;
  hireDate: string | null;
  terminationDate: string | null;
  employmentStatus: string;
  yearsOfExperience: number;
  sapUserId: string | null;
  sapPersonnelNumber: string | null;
  costCenter: string | null;
  companyCode: string | null;
  department: {
    id: string;
    name: string;
    code: string;
    description: string | null;
    location: string | null;
    business_unit: string | null;
  } | null;
  role: {
    id: string;
    title: string;
    code: string;
    description: string | null;
    career_level: string;
    min_experience_years: number | null;
    max_experience_years: number | null;
  } | null;
  manager: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  bio: string | null;
  linkedinUrl: string | null;
  preferredLanguage: string;
  timezone: string;
  skills: Array<{
    id: string;
    self_assessed_proficiency: string;
    manager_assessed_proficiency: string | null;
    final_proficiency: string | null;
    years_of_experience: number | null;
    skill: {
      id: string;
      name: string;
      category: string;
      description: string | null;
      skill_type: string;
    };
  }>;
  certifications: Array<{
    id: string;
    status: string;
    issue_date: string | null;
    expiry_date: string | null;
    certificate_number: string | null;
    certification: {
      id: string;
      name: string;
      code: string;
      description: string | null;
      issuing_authority: string;
      certification_level: string | null;
    };
  }>;
  currentProjects: Array<{
    id: string;
    role_in_project: string;
    allocation_percentage: number;
    start_date: string;
    end_date: string | null;
    project: {
      id: string;
      name: string;
      code: string;
      description: string | null;
      status: string;
      start_date: string | null;
      planned_end_date: string | null;
      sap_module: string | null;
    };
  }>;
  latestPerformanceReview: {
    id: string;
    review_date: string;
    overall_rating: number;
    achievements: string | null;
    areas_for_improvement: string | null;
    reviewer: {
      first_name: string;
      last_name: string;
    };
  } | null;
  trainingHistory: Array<{
    id: string;
    enrollment_date: string;
    completion_date: string | null;
    status: string;
    completion_percentage: number | null;
    training_program: {
      id: string;
      name: string;
      code: string;
      description: string | null;
      provider: string;
      duration_hours: number | null;
      sap_module: string | null;
    };
  }>;
  profilePictureUrl: string | null;
  onboardingStatus: string;
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

interface AppSidebarProps {
  userProfile: UserProfile | null;
  isLoadingProfile: boolean;
  profileError: string | null;
  recentConversations?: Conversation[];
  isLoadingConversations?: boolean;
  currentConversation?: CurrentConversation | null;
  activePage?: string;
}

export default function AppSidebar({
  userProfile,
  isLoadingProfile,
  profileError,
  recentConversations = [],
  isLoadingConversations = false,
  currentConversation = null,
  activePage = 'chatbot'
}: AppSidebarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await cacheManager.invalidateUserCaches();
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  const handleViewProfile = () => {
    router.push("/profile");
  };

  const handleConversationClick = (sessionId: string) => {
    router.push(`/chatbot?sessionId=${sessionId}`);
  };

  const navigationItems = [
    {
      id: 'chatbot',
      label: 'Chat',
      icon: MessageSquare,
      path: '/chatbot'
    },
    {
      id: 'chat-history',
      label: 'Chat History',
      icon: History,
      path: '/chat-history'
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: BookOpen,
      path: '/reports'
    },
    {
      id: 'career-goals',
      label: 'Goals',
      icon: Target,
      path: '/career-goals'
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      path: '/profile'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      path: '#'
    }
  ];

  return (
    <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Sidebar Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Deep SAP</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">AI Assistant</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 p-4">
        <nav className="space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;

            return (
              <div
                key={item.id}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                onClick={() => item.path !== '#' ? router.push(item.path) : null}
              >
                <Icon className="w-5 h-5" />
                <span className={isActive ? 'font-medium' : ''}>{item.label}</span>
              </div>
            );
          })}
        </nav>

        {/* Current Conversation */}
        {currentConversation && activePage === 'chatbot' && (
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
  );
}
