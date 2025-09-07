"use client";

import { useState } from "react";
import { ReportsList } from "@/components/reports-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FilterIcon, RefreshCwIcon } from "lucide-react";

export default function ReportsPage() {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    type: "",
    page: 1,
    limit: 10
  });
  const [refreshKey, setRefreshKey] = useState(0);

  const handleFilterChange = (key: string, value: string | number) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key === 'page' ? value : 1 // Reset to page 1 when filters change
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

  return (
    <div className="flex-1 w-full flex flex-col gap-8">
      <div className="w-full">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Reports Dashboard</h1>
            <p className="text-gray-600 mt-2">
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
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FilterIcon size={18} />
              Filter Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Report Type</Label>
                <Select value={filters.type} onValueChange={(value) => handleFilterChange('type', value)}>
                  <SelectTrigger>
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
                <Label htmlFor="limit">Items Per Page</Label>
                <Select value={filters.limit.toString()} onValueChange={(value) => handleFilterChange('limit', parseInt(value))}>
                  <SelectTrigger>
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
          onFiltersChange={setFilters}
        />
      </div>
    </div>
  );
}
