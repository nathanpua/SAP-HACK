/**
 * Centralized WebSocket configuration for SAP Career Coach
 *
 * This file centralizes all WebSocket-related configuration to make it
 * easy to change the URL across the entire application.
 */

// WebSocket Configuration
export const WEBSOCKET_CONFIG = {
  // Default WebSocket URL - can be overridden by environment variables
  DEFAULT_URL: 'ws://0.0.0.0:8080/ws',

  // Environment variable names (for easy reference)
  ENV_VARS: {
    // For client-side usage (must have NEXT_PUBLIC_ prefix)
    CLIENT: 'NEXT_PUBLIC_CAREER_COACH_WS_URL',
    // For server-side usage
    SERVER: 'CAREER_COACH_WS_URL'
  }
} as const;

/**
 * Get the WebSocket URL for client-side usage
 * Uses NEXT_PUBLIC_CAREER_COACH_WS_URL if available, otherwise defaults to ws://0.0.0.0:8080/ws
 */
export function getClientWebSocketUrl(): string {
  return process.env.NEXT_PUBLIC_CAREER_COACH_WS_URL || WEBSOCKET_CONFIG.DEFAULT_URL;
}

/**
 * Get the WebSocket URL for server-side usage
 * Uses CAREER_COACH_WS_URL if available, otherwise defaults to ws://0.0.0.0:8080/ws
 */
export function getServerWebSocketUrl(): string {
  return process.env.CAREER_COACH_WS_URL || WEBSOCKET_CONFIG.DEFAULT_URL;
}

/**
 * Validate WebSocket URL format
 */
export function isValidWebSocketUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'ws:' || parsedUrl.protocol === 'wss:';
  } catch {
    return false;
  }
}
