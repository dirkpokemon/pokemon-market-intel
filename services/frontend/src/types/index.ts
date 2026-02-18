/**
 * TypeScript Type Definitions
 */

export interface User {
  id: string;
  email: string;
  subscription_tier: 'free' | 'pro' | 'enterprise';
  created_at: string;
}

export interface Price {
  id: string;
  card_name: string;
  card_set: string;
  price: number;
  currency: string;
  source: string;
  url: string;
  timestamp: string;
}

export interface PriceHistory {
  card_id: string;
  card_name: string;
  prices: Array<{
    date: string;
    price: number;
  }>;
  statistics: {
    average: number;
    min: number;
    max: number;
    volatility: number;
  };
}

export interface DealScore {
  card_id: string;
  card_name: string;
  current_price: number;
  average_price: number;
  score: number;
  deal_quality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface Alert {
  id: string;
  user_id: string;
  card_name: string;
  condition: 'price_drop' | 'price_target' | 'availability';
  threshold: number;
  active: boolean;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  tier: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'cancelled' | 'past_due';
  current_period_end: string;
}
