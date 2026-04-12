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
  category?: string;
  current_price?: number;
  market_avg_price?: number;
  deal_score?: number;
  description?: string;
  signal_metadata?: string;
  confidence?: number;
  priority: number;
  detected_at: string;
  expires_at?: string;
}

export interface SetTrend {
  product_set: string;
  avg_trend: number;
  avg_volume_trend: number;
  card_count: number;
  avg_price: number;
}

export interface MarketDigest {
  total_cards_tracked: number;
  total_sets: number;
  total_listings: number;
  last_analysis_at?: string;
  /** Max scraped_at from raw_prices — scraper health */
  last_scrape_at?: string;
  signal_counts: Record<string, number>;
  signal_highlights: Signal[];
  top_rising_sets: SetTrend[];
  top_declining_sets: SetTrend[];
}

export interface PriceHistoryPoint {
  date: string;
  avg_price: number;
  min_price: number;
  max_price: number;
  listing_count: number;
}

export interface ConditionBreakdown {
  condition: string;
  count: number;
  avg_price: number;
}

export interface PriceHistoryResponse {
  card_name: string;
  history: PriceHistoryPoint[];
  conditions: ConditionBreakdown[];
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
    let message = 'API request failed';
    try {
      const body = (await response.json()) as { detail?: unknown };
      const d = body?.detail;
      if (typeof d === 'string') message = d;
      else if (Array.isArray(d)) {
        message = d
          .map((x: { msg?: string }) => (typeof x?.msg === 'string' ? x.msg : ''))
          .filter(Boolean)
          .join(' ') || message;
      }
    } catch {
      /* ignore non-JSON error bodies */
    }
    const err = new Error(message);
    (err as any).status = response.status;
    throw err;
  }
  
  return response.json();
}

// Authentication
export const authApi = {
  register: async (email: string, password: string, full_name?: string): Promise<{ message: string; email: string; email_sent?: boolean; verify_url?: string }> => {
    return apiRequest<{ message: string; email: string; email_sent?: boolean; verify_url?: string }>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name }),
    });
  },

  verifyEmail: async (token: string): Promise<{ message: string; verified?: boolean; already_verified?: boolean }> => {
    return apiRequest<{ message: string; verified?: boolean; already_verified?: boolean }>(`/api/v1/auth/verify?token=${encodeURIComponent(token)}`);
  },

  resendVerification: async (email: string, password: string): Promise<{ message: string }> => {
    return apiRequest<{ message: string }>('/api/v1/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
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
    product_set?: string;
    product_name?: string;
  }): Promise<DealScore[]> => {
    const entries = Object.entries(params || {})
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => [k, String(v)] as [string, string]);
    const query = new URLSearchParams(entries).toString();
    return apiRequest<DealScore[]>(`/api/v1/deal_scores?${query}`);
  },

  getMarketDigest: async (): Promise<MarketDigest> => {
    return apiRequest<MarketDigest>('/api/v1/market_digest');
  },

  getPriceHistory: async (cardName: string, days = 30): Promise<PriceHistoryResponse> => {
    const query = new URLSearchParams({ card_name: cardName, days: String(days) }).toString();
    return apiRequest<PriceHistoryResponse>(`/api/v1/price_history?${query}`);
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

// News
export interface NewsArticle {
  title: string;
  link: string;
  source: string;
  published?: string;
  description?: string;
  image_url?: string;
}

export const newsApi = {
  getNews: async (limit: number = 10): Promise<NewsArticle[]> => {
    return apiRequest<NewsArticle[]>(`/api/v1/news?limit=${limit}`);
  },
};

// Notification Preferences
export interface NotificationPrefs {
  alerts_enabled: boolean;
  alert_email?: string;
  telegram_chat_id?: string;
}

export const notificationApi = {
  getPrefs: async (): Promise<NotificationPrefs> => {
    return apiRequest<NotificationPrefs>('/api/v1/auth/notifications/preferences');
  },
  updatePrefs: async (prefs: Partial<NotificationPrefs>): Promise<NotificationPrefs> => {
    return apiRequest<NotificationPrefs>('/api/v1/auth/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify(prefs),
    });
  },
};

export interface FeedbackSubmitResponse {
  ok: boolean;
  email_sent: boolean;
}

export const feedbackApi = {
  submit: async (payload: { type: 'idea' | 'bug' | 'other'; message: string }): Promise<FeedbackSubmitResponse> => {
    return apiRequest<FeedbackSubmitResponse>('/api/v1/feedback', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

// Subscriptions
export interface AdminScrapeLogRow {
  source?: string | null;
  status?: string | null;
  items_scraped?: number | null;
  errors_count?: number | null;
  started_at?: string | null;
  completed_at?: string | null;
  error_message?: string | null;
}

export interface AdminUserSummary {
  id: number;
  email: string;
  role: string;
  is_verified: boolean;
  created_at?: string | null;
}

export interface AdminStatsResponse {
  users_total: number;
  users_verified: number;
  users_by_role: Record<string, number>;
  raw_prices_count: number;
  raw_distinct_cards: number;
  signals_active: number;
  deal_scores_active: number;
  last_scrapes: AdminScrapeLogRow[];
  recent_users: AdminUserSummary[];
}

export const adminApi = {
  getStats: async (): Promise<AdminStatsResponse> => {
    return apiRequest<AdminStatsResponse>('/api/v1/admin/stats');
  },
};

export interface PlanPricesResponse {
  stripe_price_paid?: string | null;
  stripe_price_pro?: string | null;
}

export const subscriptionApi = {
  /** Public: Stripe price IDs from backend (works when NEXT_PUBLIC_STRIPE_* missing at build). */
  getPlanPrices: async (): Promise<PlanPricesResponse> => {
    return apiRequest<PlanPricesResponse>('/api/v1/subscriptions/plan-prices');
  },

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

  /** Plus → Business: swap Stripe subscription price (proration). */
  upgradeToBusiness: async () => {
    return apiRequest<{ status: string; role: string }>('/api/v1/subscriptions/upgrade-to-business', {
      method: 'POST',
    });
  },
};
