/**
 * API Configuration
 * 
 * Handles API URL configuration for different environments:
 * - Development: Uses proxy (/api) to avoid CORS
 * - Production: Uses PUBLIC_API_URL environment variable
 */

// Get the API URL from environment or use default
export const API_URL = import.meta.env.PUBLIC_API_URL || '';

// Helper to construct API endpoints
export function getApiUrl(path: string): string {
  // In development with proxy, use relative URL
  if (!API_URL || API_URL === '') {
    return `/api${path}`;
  }
  
  // In production, use full URL
  return `${API_URL}${path}`;
}

// Export individual endpoints
export const ENDPOINTS = {
  chatMessage: () => getApiUrl('/chat/message'),
  chatHistory: () => getApiUrl('/chat/history'),
  health: () => getApiUrl('/health'),
} as const;
