"use client";

import { useEffect, useState } from "react";

export default function Loading() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => (prev + 1) % 100);
    }, 30); // Faster progress for larger component

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="w-full max-w-4xl mx-4">
        <div className="text-center space-y-8">
          {/* Logo/Brand */}
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 4v-4z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Deep SAP
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Loading AI Assistant...
              </p>
            </div>
          </div>

          {/* Loading Animation */}
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="relative">
                {/* Outer ring */}
                <div className="w-20 h-20 border-4 border-blue-200 dark:border-blue-800 rounded-full"></div>
                {/* Inner spinning ring */}
                <div className="absolute top-0 left-0 w-20 h-20 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
                {/* Center icon */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Loading text */}
            <div className="space-y-4">
              <h2 className="text-xl font-medium text-gray-900 dark:text-white">
                Initializing AI Assistant
              </h2>
              <div className="flex justify-center">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-3 h-3 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  <div className="w-3 h-3 bg-pink-600 rounded-full animate-bounce" style={{ animationDelay: '450ms' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="space-y-4">
            <div className="w-full max-w-md mx-auto bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 h-3 rounded-full transition-all duration-200 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Loading advanced AI capabilities...
              </p>
              <div className="flex justify-center space-x-4 text-xs text-gray-400 dark:text-gray-500">
                <span className="flex items-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                  WebSocket
                </span>
                <span className="flex items-center">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse"></div>
                  AI Models
                </span>
                <span className="flex items-center">
                  <div className="w-2 h-2 bg-purple-400 rounded-full mr-2 animate-pulse"></div>
                  Components
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
