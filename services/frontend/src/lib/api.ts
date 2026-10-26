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
  /** Variant within the set (CardTrader blueprint id); same-named cards differ */
  card_number?: string | null;
  collector_number?: string | null;
  rarity?: string | null;
  current_price: number;
  market_avg_price?: number;
  deal_score: number;
  confidence?: number;
  /** Buy/wait signal: buy | wait | rising | falling | stable; null = too little history */
  market_signal?: string | null;
  floor_change_7d?: number | null;
  supply_change_7d?: number | null;
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

/** Key of a product in the getSparklines result. */
export const sparklineKey = (p: { product_name: string; card_number?: string | null }): string =>
  p.card_number ? `${p.product_name}#${p.card_number}` : p.product_name;

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

  /** Daily median and cheapest listing price of one product (variant when card_number is given). */
  getPriceHistory: async (
    cardName: string,
    days = 30,
    variant?: { product_set?: string | null; card_number?: string | null },
  ): Promise<PriceHistoryResponse> => {
    const params = new URLSearchParams({ card_name: cardName, days: String(days) });
    if (variant?.product_set) params.set('product_set', variant.product_set);
    if (variant?.card_number) params.set('card_number', variant.card_number);
    return apiRequest<PriceHistoryResponse>(`/api/v1/price_history?${params.toString()}`);
  },

  /** Batch sparkline data: { [sparklineKey(deal)]: medianPricePerDay[] } */
  getSparklines: async (
    products: { product_name: string; card_number?: string | null }[],
    days = 7,
  ): Promise<Record<string, number[]>> => {
    if (!products.length) return {};
    const params = new URLSearchParams({ days: String(days) });
    products.forEach(p => {
      params.append('card_names', p.product_name);
      params.append('card_numbers', p.card_number || '');
    });
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

// ── Price check (public, no login) ─────────────────────────────
export interface PriceCheckMatch {
  product_name: string;
  product_set?: string | null;
  category: 'single' | 'sealed';
  card_number?: string | null;
  collector_number?: string | null;
  rarity?: string | null;
  floor_price?: number | null;
  typical_price?: number | null;
  days_observed?: number | null;
}

export interface PriceCheckSearchResponse {
  terms: string[];
  detected_price?: number | null;
  results: PriceCheckMatch[];
}

export type PriceVerdictCode = 'suspicious_low' | 'below_floor' | 'normal' | 'high' | 'very_high';

export interface PriceCheckResponse {
  product_name: string;
  product_set?: string | null;
  category: 'single' | 'sealed';
  card_number?: string | null;
  collector_number?: string | null;
  rarity?: string | null;
  price: number;
  verdict: {
    code: PriceVerdictCode;
    pct_vs_floor: number;
    pct_vs_typical: number;
    fair_offer_low: number;
    fair_offer_high: number;
    low_data: boolean;
  };
  reference: {
    floor_price: number;
    typical_price: number;
    current_price?: number | null;
    min_price_30d?: number | null;
    max_price_30d?: number | null;
    price_trend_30d?: number | null;
    days_observed: number;
    observations: number;
    last_seen_at?: string | null;
    calculated_at?: string | null;
    market_signal?: string | null;
    floor_change_7d?: number | null;
    supply_change_7d?: number | null;
  };
  basis: string;
}

export const priceCheckApi = {
  /** Paste a card name or a whole listing; returns matches + the euro amount found in it. */
  search: async (q: string): Promise<PriceCheckSearchResponse> => {
    return apiRequest<PriceCheckSearchResponse>(`/api/v1/price-check/search?${new URLSearchParams({ q })}`);
  },

  check: async (match: PriceCheckMatch, price: number): Promise<PriceCheckResponse> => {
    const params = new URLSearchParams({ name: match.product_name, category: match.category, price: String(price) });
    if (match.product_set) params.set('set', match.product_set);
    if (match.card_number) params.set('card_number', match.card_number);
    return apiRequest<PriceCheckResponse>(`/api/v1/price-check?${params}`);
  },
};

// List price (roadmap #2): cheapest way to buy a want/deck list incl. estimated shipping
export interface ListPriceProduct {
  product_name: string;
  product_set?: string | null;
  category: string;
  card_number?: string | null;
  rarity?: string | null;
}

export interface ListPriceLine {
  query: string;
  quantity: number;
  matched: ListPriceProduct | null;
  alternatives: ListPriceProduct[];
  found: number;
  missing: number;
}

export interface ListPriceShipment {
  kind: 'seller' | 'zero';
  label: string;
  seller_country?: string | null;
  items: { line: number; product_name: string; product_set?: string | null; price: number; copies: number; url?: string | null }[];
  subtotal: number;
  shipping: number;
}

export interface ListPriceResponse {
  lines: ListPriceLine[];
  shipments: ListPriceShipment[];
  cards_total: number;
  shipping_total: number;
  total: number;
  naive_total: number;
  savings: number;
  line_limit: number;
  truncated: number;
  listings_as_of?: string | null;
  shipping_note: string;
}

export const listPriceApi = {
  calculate: async (body: { text: string; country: string; condition: 'nm' | 'lp' }): Promise<ListPriceResponse> => {
    return apiRequest<ListPriceResponse>('/api/v1/list-price', { method: 'POST', body: JSON.stringify(body) });
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
}

// Backend notification preferences (new endpoints)
export interface BackendNotifPrefs {
  email_digest_enabled: boolean;
}

export interface WatchlistItem {
  id: number;
  card_name: string;
  card_set?: string | null;
  card_number?: string | null;
  target_price: number;
  current_price?: number | null;
  is_active: boolean;
  notified_at?: string | null;
  created_at: string;
}

export const notificationApi = {
  /** Legacy: update signal-alert preferences stored in user profile */
  updatePrefs: async (prefs: Partial<NotificationPrefs>): Promise<NotificationPrefs> => {
    return apiRequest<NotificationPrefs>('/api/v1/auth/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify(prefs),
    });
  },

  /** Get backend notification preferences (email digest) */
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

  /** Get the user's active watchlist items */
  getWatchlist: async (): Promise<WatchlistItem[]> => {
    return apiRequest<WatchlistItem[]>('/api/v1/watchlist');
  },

  /** Add a card to the backend watchlist */
  addWatchlistItem: async (payload: { card_name: string; card_set?: string; card_number?: string; target_price: number }): Promise<WatchlistItem> => {
    return apiRequest<WatchlistItem>('/api/v1/watchlist', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /** One-click unsubscribe from the link in digest / alert emails (no login needed) */
  unsubscribe: async (payload: { u: number; k: string; t: string }): Promise<{ ok: boolean; kind: string }> => {
    return apiRequest<{ ok: boolean; kind: string }>('/api/v1/notifications/unsubscribe', {
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
  daily_prices_rows: number;
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
