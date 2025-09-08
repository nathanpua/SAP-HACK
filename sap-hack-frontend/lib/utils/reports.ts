// Utility functions for working with reports

export interface Report {
  id: string;
  session_id: string;
  session_title: string;
  conversation_type: string;
  message_type: string;
  content: string | null;
  tool_name: string | null;
  tool_output: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  session_started_at: string;
}

export interface ReportsResponse {
  reports: Report[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface ReportsFilters {
  page?: number;
  limit?: number;
  type?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Fetch user's reports from the API
 */
export async function fetchReports(filters: ReportsFilters = {}): Promise<ReportsResponse> {
  const params = new URLSearchParams();

  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.type) params.append('type', filters.type);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);

  const url = `/api/reports${params.toString() ? `?${params.toString()}` : ''}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch reports: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get a specific report by ID (placeholder for future implementation)
 */
export async function fetchReportById(id: string): Promise<Report> {
  const response = await fetch(`/api/reports/${id}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch report: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Filter reports by type
 */
export function filterReportsByType(reports: Report[], type: string): Report[] {
  return reports.filter(report => report.message_type === type);
}

/**
 * Filter reports by date range
 */
export function filterReportsByDateRange(
  reports: Report[],
  startDate: string,
  endDate: string
): Report[] {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();

  return reports.filter(report => {
    const reportDate = new Date(report.created_at).getTime();
    return reportDate >= start && reportDate <= end;
  });
}

/**
 * Sort reports by creation date (newest first)
 */
export function sortReportsByDate(reports: Report[]): Report[] {
  return [...reports].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

/**
 * Group reports by conversation type
 */
export function groupReportsByType(reports: Report[]): Record<string, Report[]> {
  return reports.reduce((groups, report) => {
    const type = report.conversation_type || 'unknown';
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(report);
    return groups;
  }, {} as Record<string, Report[]>);
}
