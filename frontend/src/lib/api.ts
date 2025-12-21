/**
 * API Configuration
 * 
 * Handles API URL configuration for different environments:
 * - Development: Uses proxy (/api) to avoid CORS
 * - Production: Uses relative URLs (same origin) since backend serves frontend
 */

// In production, frontend is served by backend, so use relative URLs
// In development, use the proxy or PUBLIC_API_URL if set
const isProd = import.meta.env.PROD;
export const API_URL = isProd ? '' : (import.meta.env.PUBLIC_API_URL || '');

// Helper to construct API endpoints
export function getApiUrl(path: string): string {
  // In production (same origin), use relative URL without /api prefix
  if (isProd) {
    return path;
  }
  
  // In development with proxy, use /api prefix
  if (!API_URL || API_URL === '') {
    return `/api${path}`;
  }
  
  // In development with explicit API URL
  return `${API_URL}${path}`;
}

// Export individual endpoints
export const ENDPOINTS = {
  chatMessage: () => getApiUrl('/chat/message'),
  chatHistory: () => getApiUrl('/chat/history'),
  health: () => getApiUrl('/health'),
} as const;
