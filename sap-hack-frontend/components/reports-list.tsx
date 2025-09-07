"use client";

import { useState, useEffect, useCallback } from 'react';
import { fetchReports, Report, ReportsFilters, ReportsResponse } from '@/lib/utils/reports';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';

interface ReportsListProps {
  filters?: ReportsFilters;
  onFiltersChange?: (filters: ReportsFilters) => void;
}

export function ReportsList({ filters: externalFilters, onFiltersChange }: ReportsListProps = {}) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<ReportsResponse['pagination'] | null>(null);
  const [internalFilters, setInternalFilters] = useState<ReportsFilters>({ page: 1, limit: 10 });
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set());

  const filters = externalFilters || internalFilters;
  const setFilters = onFiltersChange || setInternalFilters;

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchReports(filters);
      setReports(response.reports);
      setPagination(response.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handlePageChange = (newPage: number) => {
    setFilters({ ...filters, page: newPage });
  };

  const toggleReportExpansion = (reportId: string) => {
    setExpandedReports(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reportId)) {
        newSet.delete(reportId);
      } else {
        newSet.add(reportId);
      }
      return newSet;
    });
  };

  const expandAllReports = () => {
    setExpandedReports(new Set(reports.map(report => report.id)));
  };

  const collapseAllReports = () => {
    setExpandedReports(new Set());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading reports...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">No reports found. Try generating some reports through the Career Coach chatbot.</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Your Reports</h2>
        <div className="flex items-center gap-2">
          <Button
            onClick={expandAllReports}
            variant="outline"
            size="sm"
          >
            Expand All
          </Button>
          <Button
            onClick={collapseAllReports}
            variant="outline"
            size="sm"
          >
            Collapse All
          </Button>
          <Button onClick={loadReports} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {reports.map((report) => (
          <Card key={report.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg mb-2">
                    {report.session_title || 'Career Guidance Report'}
                  </CardTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="default" className="bg-green-600">
                      📊 Career Guidance Report
                    </Badge>
                    <Badge variant="secondary">{report.conversation_type}</Badge>
                    {report.tool_name && (
                      <Badge variant="outline">Tool: {report.tool_name}</Badge>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 mt-2">
                    Created: {new Date(report.created_at).toLocaleDateString()}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleReportExpansion(report.id)}
                  className="flex items-center gap-1 hover:bg-gray-100"
                >
                  {expandedReports.has(report.id) ? (
                    <>
                      <ChevronUpIcon size={16} />
                      Hide Report
                    </>
                  ) : (
                    <>
                      <ChevronDownIcon size={16} />
                      Show Report
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            {expandedReports.has(report.id) && (
              <CardContent>
                <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-code:text-blue-600 prose-pre:bg-gray-100 prose-blockquote:border-l-green-500 prose-ul:text-gray-700 prose-ol:text-gray-700">
                  <div className="bg-green-50 p-6 rounded-md border border-green-200">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw, rehypeSanitize]}
                      components={{
                        h1: ({ children }) => <h1 className="text-2xl font-bold text-gray-900 mb-4 mt-6 first:mt-0">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-xl font-semibold text-gray-900 mb-3 mt-5">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-lg font-medium text-gray-900 mb-2 mt-4">{children}</h3>,
                        h4: ({ children }) => <h4 className="text-base font-medium text-gray-900 mb-2 mt-3">{children}</h4>,
                        p: ({ children }) => <p className="text-gray-700 mb-3 leading-relaxed">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc list-inside text-gray-700 mb-3 space-y-1 ml-4">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside text-gray-700 mb-3 space-y-1 ml-4">{children}</ol>,
                        li: ({ children }) => <li className="text-gray-700">{children}</li>,
                        strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                        em: ({ children }) => <em className="italic text-gray-700">{children}</em>,
                        code: ({ children }) => <code className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>,
                        pre: ({ children }) => <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto text-sm font-mono text-gray-900 my-3">{children}</pre>,
                        blockquote: ({ children }) => <blockquote className="border-l-4 border-green-500 pl-4 italic text-gray-600 my-4 bg-green-25 p-3 rounded-r-md">{children}</blockquote>,
                        table: ({ children }) => <table className="min-w-full divide-y divide-gray-300 my-4">{children}</table>,
                        thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
                        tbody: ({ children }) => <tbody className="bg-white divide-y divide-gray-200">{children}</tbody>,
                        tr: ({ children }) => <tr>{children}</tr>,
                        th: ({ children }) => <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{children}</th>,
                        td: ({ children }) => <td className="px-3 py-2 text-sm text-gray-900">{children}</td>,
                        a: ({ children, href }) => <a href={href} className="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                        hr: () => <hr className="border-gray-300 my-6" />,
                      }}
                    >
                      {report.content || 'No content available'}
                    </ReactMarkdown>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} reports
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              <ChevronLeftIcon size={16} />
              Previous
            </Button>
            <span className="text-sm">
              Page {pagination.page} of {pagination.total_pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.total_pages}
            >
              Next
              <ChevronRightIcon size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
