"use client";

import AppSidebar from "@/components/app-sidebar";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserProfile } from "@/lib/hooks/use-user-profile";
import { useConversations } from "@/lib/hooks/use-conversations";
import { createClient } from "@/lib/supabase/client";
import CareerGoalsManager from '@/components/career-goals-manager';


export default function CareerGoalsPage() {
  const { userProfile, isLoadingProfile, profileError, isAuthenticated } = useUserProfile();
  const { recentConversations, isLoadingConversations } = useConversations();
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const router = useRouter();



  useEffect(() => {
    if (isAuthenticated === false) {
      router.push('/auth/login');
      return;
    }

    // Get employee ID for current user
    if (userProfile?.id) {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          supabase
            .from('employees')
            .select('id')
            .eq('auth_user_id', user.id)
            .single()
            .then(({ data: employee, error }) => {
              if (error) {
                console.error('Error fetching employee ID:', error);
              } else {
                setEmployeeId(employee?.id || null);
              }
            });
        }
      });
    }
  }, [isAuthenticated, router, userProfile?.id]);

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
        activePage="career-goals"
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">My Career Goals</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Set, track, and achieve your professional development objectives
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <CareerGoalsManager
              employeeId={employeeId || undefined}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
