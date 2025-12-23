/**
 * API Configuration
 * 
 * Handles API URL configuration for different environments:
 * - Development: Uses proxy (/api) to avoid CORS
 * - Production: Uses relative URLs (same origin) since backend serves frontend
 */

// Prefer external backend URL if provided; fallback to same-origin /api
// - At dev time, Vite proxy rewrites /api → backend
// - In prod (separate deployments), set PUBLIC_API_URL to your backend base URL
import { PUBLIC_API_URL } from '$env/static/public';
export const API_URL = PUBLIC_API_URL?.replace(/\/$/, '') || '/api';

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
