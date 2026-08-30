import Constants from 'expo-constants';

const BACKEND_PORT = 8000;

/**
 * Works out the base URL for the FastAPI backend running on your PC.
 *
 * When the app is running inside Expo Go, Expo's dev server already knows
 * the IP address your phone used to reach your PC -- that's literally how
 * the app got onto your phone when you scanned the QR code. It's exposed
 * here as `hostUri`, e.g. "192.168.1.23:8081" (8081 is Expo's own dev
 * server port). We reuse that same IP address, just on the backend's port
 * (8000) instead. This means:
 *   - you don't have to find and hardcode your PC's IP address by hand
 *   - it keeps working automatically if you switch WiFi networks and your
 *     PC gets a different IP next time
 *
 * Falls back to 127.0.0.1 for cases where hostUri isn't available (e.g. an
 * Expo web build running in a browser on the same machine as the backend).
 */
function resolveApiBaseUrl(): string {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    return `http://${host}:${BACKEND_PORT}`;
  }
  return `http://127.0.0.1:${BACKEND_PORT}`;
}

export const API_BASE_URL = resolveApiBaseUrl();

// ---- Response shapes -------------------------------------------------
// These mirror backend/app/schemas.py exactly. Keeping them here (rather
// than re-declaring them in every screen) means every screen agrees on
// what a "Company" or "Article" looks like, and TypeScript will flag it
// immediately if the backend's shape ever changes and a screen wasn't
// updated to match.

export type Company = {
  id: number;
  ticker: string;
  name: string;
  sector: string | null;
};

export type CompanySentiment = {
  ticker: string;
  name: string;
  score: number | null;
  article_count: number;
};

export type Article = {
  id: number;
  source: string;
  source_url: string;
  headline: string;
  snippet: string;
  published_at: string;
  label: string | null;
  confidence: number | null;
};

export type TrendingCompany = {
  ticker: string;
  name: string;
  article_count: number;
};

export type SentimentHistoryPoint = {
  date: string; // "YYYY-MM-DD"
  score: number | null;
  article_count: number;
};

// ---- Fetch helpers -----------------------------------------------------

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`${path} failed: HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function getCompanies(): Promise<Company[]> {
  return getJson<Company[]>('/companies');
}

export function getCompanySentiment(ticker: string, days?: number): Promise<CompanySentiment> {
  const query = days !== undefined ? `?days=${days}` : '';
  return getJson<CompanySentiment>(`/companies/${ticker}/sentiment${query}`);
}

export function getCompanyNews(ticker: string, limit = 20, days?: number): Promise<Article[]> {
  const daysParam = days !== undefined ? `&days=${days}` : '';
  return getJson<Article[]>(`/companies/${ticker}/news?limit=${limit}${daysParam}`);
}

export function getTrending(limit = 5, days?: number): Promise<TrendingCompany[]> {
  // `days` is optional -- omit it to rank by all-time article volume, or
  // pass e.g. 7 to match the Trending screen's adjustable day-range filter.
  const daysParam = days !== undefined ? `&days=${days}` : '';
  return getJson<TrendingCompany[]>(`/trending?limit=${limit}${daysParam}`);
}

export function getCompanySentimentHistory(
  ticker: string,
  days = 14
): Promise<SentimentHistoryPoint[]> {
  return getJson<SentimentHistoryPoint[]>(`/companies/${ticker}/sentiment/history?days=${days}`);
}
