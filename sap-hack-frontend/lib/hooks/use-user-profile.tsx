'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cacheManager } from '@/lib/cache-manager';

export interface UserProfile {
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

export interface UseUserProfileReturn {
  userProfile: UserProfile | null;
  isLoadingProfile: boolean;
  profileError: string | null;
  isAuthenticated: boolean | null;
  refreshProfile: () => Promise<void>;
}

export function useUserProfile(): UseUserProfileReturn {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const fetchUserProfile = useCallback(async () => {
    try {
      setIsLoadingProfile(true);
      setProfileError(null);

      // Check if we have cached profile data
      const cachedProfile = cacheManager.getUserProfile();
      if (cachedProfile) {
        setUserProfile(cachedProfile as unknown as UserProfile);
        setIsLoadingProfile(false);
        return;
      }

      const response = await fetch('/api/user-profile');
      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }

      const data = await response.json();
      setUserProfile(data);

      // Cache the profile data
      cacheManager.setUserProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setProfileError('Failed to load user profile');
    } finally {
      setIsLoadingProfile(false);
    }
  }, []);

  const checkAuthentication = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setIsAuthenticated(false);
        setIsLoadingProfile(false);
        return;
      }

      setIsAuthenticated(true);
      await fetchUserProfile();
    } catch (error) {
      console.error('Error checking authentication:', error);
      setIsAuthenticated(false);
      setIsLoadingProfile(false);
    }
  }, [fetchUserProfile]);

  const refreshProfile = useCallback(async () => {
    // Clear cache and refetch
    cacheManager.clearUserProfile();
    await fetchUserProfile();
  }, [fetchUserProfile]);

  useEffect(() => {
    checkAuthentication();
  }, [checkAuthentication]);

  return {
    userProfile,
    isLoadingProfile,
    profileError,
    isAuthenticated,
    refreshProfile
  };
}
