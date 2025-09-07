import { useState, useEffect, useCallback } from 'react';
import { cacheManager } from '@/lib/cache-manager';

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
    } | null;
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

interface UseCachedUserProfileReturn {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  invalidateCache: () => Promise<void>;
}

/**
 * Custom hook for fetching and caching user profile data
 * Automatically uses HTTP caching and provides cache management
 */
export function useCachedUserProfile(): UseCachedUserProfileReturn {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      setError(null);

      const headers: Record<string, string> = {};

      if (forceRefresh) {
        // Force cache invalidation
        headers['Cache-Control'] = 'no-cache';
        headers['Pragma'] = 'no-cache';
      }

      const response = await fetch('/api/user-profile', { headers });

      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }

      const data = await response.json();
      setProfile(data);

      // Log cache status for debugging
      if (typeof window !== 'undefined') {
        const cacheControl = response.headers.get('cache-control');
        console.log('🔄 Profile fetch completed:', {
          cached: cacheControl?.includes('s-maxage') || false,
          cacheControl,
          forcedRefresh: forceRefresh
        });
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch profile');
      console.error('❌ Profile fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refetch = useCallback(async () => {
    await fetchProfile(false);
  }, [fetchProfile]);

  const invalidateCache = useCallback(async () => {
    await cacheManager.invalidateUserProfileCache();
    await fetchProfile(true);
  }, [fetchProfile]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    isLoading,
    error,
    refetch,
    invalidateCache
  };
}
