/**
 * API Client
 * Handles all API requests to the backend
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/** Abort slow requests so login/dashboard do not hang indefinitely if the API is wedged. */
const API_REQUEST_TIMEOUT_MS = 45_000;

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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (e: unknown) {
    if (e instanceof Error && e.name === 'AbortError') {
      const err = new Error(
        'Request timed out. The API may be overloaded or the database is busy — try again in a minute.'
      );
      (err as { status?: number }).status = 408;
      throw err;
    }
    if (e instanceof TypeError) {
      const err = new Error(
        `Cannot reach API at ${API_URL}. Set NEXT_PUBLIC_API_URL to your backend URL (e.g. Railway API) and redeploy the frontend.`
      );
      (err as { status?: number }).status = 0;
      throw err;
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }

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
    (err as { status?: number }).status = response.status;
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

  changePassword: async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
    return apiRequest('/api/v1/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
  },

  /** GDPR erasure: permanently delete the account. Requires the password. */
  deleteAccount: async (password: string): Promise<{ message: string }> => {
    return apiRequest('/api/v1/auth/account', {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    });
  },
};

// Market Data
export const marketApi = {
  getDealScores: async (params?: {
    limit?: number;
    min_score?: number;
    category?: string;
    set_slug?: string;
    product_set?: string;
    product_name?: string;
  }): Promise<DealScore[]> => {
    const entries = Object.entries(params || {})
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => [k, String(v)] as [string, string]);
    const query = new URLSearchParams(entries).toString();
    const path = query ? `/api/v1/deal_scores?${query}` : '/api/v1/deal_scores';
    return apiRequest<DealScore[]>(path);
  },

  getPriceHistory: async (cardName: string, days = 30): Promise<PriceHistoryResponse> => {
    const query = new URLSearchParams({ card_name: cardName, days: String(days) }).toString();
    return apiRequest<PriceHistoryResponse>(`/api/v1/price_history?${query}`);
  },

  /** Batch sparkline data: { [cardName]: avgPricePerDay[] } */
  getSparklines: async (cardNames: string[], days = 7): Promise<Record<string, number[]>> => {
    if (!cardNames.length) return {};
    const params = new URLSearchParams({ days: String(days) });
    cardNames.forEach(n => params.append('card_names', n));
    return apiRequest<Record<string, number[]>>(`/api/v1/price_sparklines?${params.toString()}`);
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

// Sealed Prices
export interface SealedPrice {
  product_name: string;
  source: string;
  source_url?: string;
  min_price: number;
  avg_price: number;
  max_price: number;
  listing_count: number;
  last_seen?: string;
}

export const sealedApi = {
  getPrices: async (setSlugOrName: string, days = 14, useSlug = true): Promise<SealedPrice[]> => {
    const key = useSlug ? 'set_slug' : 'set_name';
    const q = new URLSearchParams({ [key]: setSlugOrName, days: String(days) }).toString();
    return apiRequest<SealedPrice[]>(`/api/v1/sealed_prices?${q}`);
  },
};

// ── Sets registry (canonical source of truth for set list) ────────
export interface PokemonSetInfo {
  slug: string;
  name: string;
  set_code: string | null;
  era: string;
  tcg_api_id: string | null;
  cardmarket_slug: string | null;
  deal_count: number;
  cheapest_sealed: number | null;
}

export interface EraInfo {
  id: string;
  label: string;
}

export interface SetsResponse {
  eras: EraInfo[];
  sets: PokemonSetInfo[];
  total: number;
}

export const setsApi = {
  list: async (hasData = false): Promise<SetsResponse> => {
    const q = hasData ? '?has_data=true' : '';
    return apiRequest<SetsResponse>(`/api/v1/sets${q}`);
  },
};

// Public (no auth required)
export const publicApi = {
  /** Top deals for the landing page — no login required. */
  getTopDeals: async (): Promise<DealScore[]> => {
    try {
      const res = await fetch(`${API_URL}/api/v1/public/top_deals`);
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  },
};

// Notification Preferences
export interface NotificationPrefs {
  alerts_enabled: boolean;
  alert_email?: string;
  telegram_chat_id?: string;
}

// Backend notification preferences (new endpoints)
export interface BackendNotifPrefs {
  email_digest_enabled: boolean;
  telegram_connected: boolean;
}

export interface WatchlistItem {
  id: number;
  card_name: string;
  card_set?: string | null;
  target_price: number;
  current_price?: number | null;
  is_active: boolean;
  notified_at?: string | null;
  created_at: string;
}

export interface TelegramConnectResponse {
  token: string;
  deep_link: string;
  expires_in: number;
}

export const notificationApi = {
  /** Legacy: update signal-alert preferences stored in user profile */
  updatePrefs: async (prefs: Partial<NotificationPrefs>): Promise<NotificationPrefs> => {
    return apiRequest<NotificationPrefs>('/api/v1/auth/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify(prefs),
    });
  },

  /** Get backend notification preferences (email digest + telegram status) */
  getNotifPrefs: async (): Promise<BackendNotifPrefs> => {
    return apiRequest<BackendNotifPrefs>('/api/v1/notifications/preferences');
  },

  /** Patch email digest toggle */
  patchNotifPrefs: async (payload: { email_digest_enabled: boolean }): Promise<BackendNotifPrefs> => {
    return apiRequest<BackendNotifPrefs>('/api/v1/notifications/preferences', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  /** Generate a Telegram deep-link connect token */
  getTelegramLink: async (): Promise<TelegramConnectResponse> => {
    return apiRequest<TelegramConnectResponse>('/api/v1/telegram/connect');
  },

  /** Get the user's active watchlist items */
  getWatchlist: async (): Promise<WatchlistItem[]> => {
    return apiRequest<WatchlistItem[]>('/api/v1/watchlist');
  },

  /** Add a card to the backend watchlist */
  addWatchlistItem: async (payload: { card_name: string; card_set?: string; target_price: number }): Promise<WatchlistItem> => {
    return apiRequest<WatchlistItem>('/api/v1/watchlist', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /** Remove (soft-delete) a watchlist item */
  removeWatchlistItem: async (id: number): Promise<void> => {
    await apiRequest<void>(`/api/v1/watchlist/${id}`, { method: 'DELETE' });
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
