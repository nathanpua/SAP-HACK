"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ReportsList } from "@/components/reports-list";
import AppSidebar from "@/components/app-sidebar";
import { useUserProfile } from "@/lib/hooks/use-user-profile";
import { useConversations } from "@/lib/hooks/use-conversations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FilterIcon, RefreshCwIcon } from "lucide-react";



export default function ReportsPage() {
  const { userProfile, isLoadingProfile, profileError, isAuthenticated } = useUserProfile();
  const { recentConversations, isLoadingConversations } = useConversations();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    type: "",
    page: 1,
    limit: 10
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const router = useRouter();


  const handleFilterChange = (key: string, value: string | number) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key === 'page' ? (typeof value === 'string' ? parseInt(value) : value) : 1 // Reset to page 1 when filters change
    }));
  };

  const resetFilters = () => {
    setFilters({
      startDate: "",
      endDate: "",
      type: "",
      page: 1,
      limit: 10
    });
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  useEffect(() => {
    if (isAuthenticated === false) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);

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
        activePage="reports"
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 w-full flex flex-col gap-8 p-6">
          <div className="w-full">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reports Dashboard</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  View all reports generated from your conversations with the Career Coach.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2"
                >
                  <FilterIcon size={16} />
                  Filters
                </Button>
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={handleRefresh}
                >
                  <RefreshCwIcon size={16} />
                  Refresh
                </Button>
              </div>
            </div>
          </div>

          {showFilters && (
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-gray-900 dark:text-white">
                  <FilterIcon size={18} />
                  Filter Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate" className="text-gray-700 dark:text-gray-300">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => handleFilterChange('startDate', e.target.value)}
                      className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate" className="text-gray-700 dark:text-gray-300">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => handleFilterChange('endDate', e.target.value)}
                      className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type" className="text-gray-700 dark:text-gray-300">Report Type</Label>
                    <Select value={filters.type} onValueChange={(value) => handleFilterChange('type', value)}>
                      <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Types</SelectItem>
                        <SelectItem value="career_assessment">Career Assessment</SelectItem>
                        <SelectItem value="skill_analysis">Skill Analysis</SelectItem>
                        <SelectItem value="job_recommendation">Job Recommendation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="limit" className="text-gray-700 dark:text-gray-300">Items Per Page</Label>
                    <Select value={filters.limit.toString()} onValueChange={(value) => handleFilterChange('limit', parseInt(value))}>
                      <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" onClick={resetFilters}>
                    Reset Filters
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="w-full">
            <ReportsList
              key={refreshKey}
              filters={filters}
              onFiltersChange={(newFilters) => {
                setFilters({
                  startDate: newFilters.startDate || "",
                  endDate: newFilters.endDate || "",
                  type: newFilters.type || "",
                  page: newFilters.page || 1,
                  limit: newFilters.limit || 10
                });
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
