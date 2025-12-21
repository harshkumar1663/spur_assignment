/**
 * API Configuration
 * 
 * Handles API URL configuration for different environments:
 * - Development: Uses proxy (/api) to avoid CORS
 * - Production: Uses relative URLs (same origin) since backend serves frontend
 */

// Always call through the same-origin API route. During development, Vite proxy
// rewrites /api → backend; on Vercel the serverless route lives at /api/*.
export const API_URL = '/api';

// Helper to construct API endpoints
export function getApiUrl(path: string): string {
  return `${API_URL}${path}`;
}

// Export individual endpoints
export const ENDPOINTS = {
  chatMessage: () => getApiUrl('/chat/message'),
  chatHistory: () => getApiUrl('/chat/history'),
  health: () => getApiUrl('/health'),
} as const;
