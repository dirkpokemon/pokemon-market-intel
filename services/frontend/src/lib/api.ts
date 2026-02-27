/**
 * API Client
 * Handles all API requests to the backend
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface ApiError {
  detail: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface User {
  id: number;
  email: string;
  full_name?: string;
  role: string;
  is_active: boolean;
  subscription_status?: string;
}

export interface Signal {
  id: number;
  signal_type: string;
  signal_level: string;
  product_name: string;
  product_set?: string;
  current_price?: number;
  market_avg_price?: number;
  deal_score?: number;
  description?: string;
  priority: number;
  detected_at: string;
}

export interface DealScore {
  id: number;
  product_name: string;
  product_set?: string;
  category?: string;
  current_price: number;
  market_avg_price?: number;
  deal_score: number;
  confidence?: number;
  calculated_at: string;
}

export interface CardSearchResult {
  card_name: string;
  card_set?: string;
  min_price: number;
  avg_price: number;
  max_price: number;
  listings: number;
  condition?: string;
  source?: string;
  source_url?: string;
  last_seen: string;
  deal_score?: number;
  market_avg_price?: number;
}

export interface SearchResponse {
  query: string;
  total_results: number;
  results: CardSearchResult[];
  has_more: boolean;
}

/**
 * Get auth token from localStorage
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

/**
 * Make authenticated API request
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.detail || 'API request failed');
  }
  
  return response.json();
}

// Authentication
export const authApi = {
  register: async (email: string, password: string, full_name?: string): Promise<TokenResponse> => {
    return apiRequest<TokenResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name }),
    });
  },
  
  login: async (email: string, password: string): Promise<TokenResponse> => {
    return apiRequest<TokenResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
  
  getMe: async (): Promise<User> => {
    return apiRequest<User>('/api/v1/auth/me');
  },
};

// Market Data
export const marketApi = {
  getSignals: async (params?: {
    limit?: number;
    signal_type?: string;
    signal_level?: string;
  }): Promise<Signal[]> => {
    const query = new URLSearchParams(params as any).toString();
    return apiRequest<Signal[]>(`/api/v1/signals?${query}`);
  },
  
  getDealScores: async (params?: {
    limit?: number;
    min_score?: number;
    category?: string;
  }): Promise<DealScore[]> => {
    const query = new URLSearchParams(params as any).toString();
    return apiRequest<DealScore[]>(`/api/v1/deal_scores?${query}`);
  },
};

// Full Catalog Search (searches ALL 171K+ scraped cards)
export const searchApi = {
  search: async (params: {
    q: string;
    limit?: number;
    sort_by?: 'relevance' | 'price_asc' | 'price_desc' | 'listings';
  }): Promise<SearchResponse> => {
    const query = new URLSearchParams(params as any).toString();
    return apiRequest<SearchResponse>(`/api/v1/search?${query}`);
  },
};

// Subscriptions
export const subscriptionApi = {
  getStatus: async () => {
    return apiRequest('/api/v1/subscriptions/status');
  },
  
  createCheckoutSession: async (priceId: string) => {
    return apiRequest<{ checkout_url: string }>('/api/v1/subscriptions/checkout', {
      method: 'POST',
      body: JSON.stringify({ price_id: priceId }),
    });
  },
  
  createPortalSession: async () => {
    return apiRequest<{ portal_url: string }>('/api/v1/subscriptions/portal', {
      method: 'POST',
    });
  },
};
