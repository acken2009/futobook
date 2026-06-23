// ============================================================
// Supabase Database Types
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ---------- Enums ----------
export type StoreStatus = "active" | "suspended" | "pending";
export type ConnectAccountStatus =
  | "not_connected"
  | "pending"
  | "active"
  | "restricted";
export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no_show";
export type SubscriptionStatus =
  | "active"
  | "past_due"
  | "cancelled"
  | "trialing"
  | "incomplete";
export type PaymentType =
  | "reservation"
  | "subscription"
  | "product"
  | "platform_fee"
  | "refund";
export type OrderStatus = "pending" | "paid" | "cancelled";
export type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded";

// ---------- Tables ----------
export interface Platform {
  id: string;
  name: string;
  transaction_fee_pct: number; // e.g. 0.05 = 5%
  stripe_account_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Store {
  id: string;
  owner_id: string; // auth.users.id
  name: string;
  slug: string; // URL識別子 (unique)
  status: StoreStatus;
  stripe_account_id: string | null;
  stripe_account_status: ConnectAccountStatus;
  platform_subscription_id: string | null; // Stripeサブスクリプションid
  platform_plan_id: string | null;
  line_channel_access_token: string | null;
  line_channel_secret: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoreCustomization {
  id: string;
  store_id: string;
  logo_url: string | null;
  cover_image_url: string | null;
  primary_color: string; // hex e.g. "#3B82F6"
  secondary_color: string;
  font_family: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  website_url: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceItem {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  price: number | null; // null = 無料
  duration_minutes: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ReservationSettings {
  id: string;
  store_id: string;
  slot_duration_minutes: number; // 予約枠の長さ（分）
  max_party_size: number;
  advance_booking_days: number; // 何日前まで予約可能
  cancellation_hours: number; // 何時間前までキャンセル可能
  requires_payment: boolean;
  created_at: string;
  updated_at: string;
}

export interface AvailabilitySchedule {
  id: string;
  store_id: string;
  day_of_week: number; // 0=日, 1=月, ..., 6=土
  open_time: string; // "09:00"
  close_time: string; // "18:00"
  is_closed: boolean;
  created_at: string;
  updated_at: string;
}

export interface AvailabilityOverride {
  id: string;
  store_id: string;
  date: string; // "2025-12-31"
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
  note: string | null;
  created_at: string;
}

export interface Customer {
  id: string;
  store_id: string;
  auth_user_id: string | null; // nullable: ゲストOK
  email: string;
  name: string;
  phone: string | null;
  stripe_customer_id: string | null;
  line_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Reservation {
  id: string;
  store_id: string;
  customer_id: string;
  service_item_id: string | null;
  reserved_at: string; // ISO datetime
  party_size: number;
  status: ReservationStatus;
  notes: string | null;
  payment_id: string | null;
  total_amount: number | null;
  created_at: string;
  updated_at: string;
}

export interface StoreSubscriptionPlan {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  price: number; // 月額（円）
  interval: "month" | "year";
  stripe_price_id: string | null;
  stripe_product_id: string | null;
  is_active: boolean;
  features: Json; // string[]
  created_at: string;
  updated_at: string;
}

export interface CustomerSubscription {
  id: string;
  store_id: string;
  customer_id: string;
  plan_id: string;
  stripe_subscription_id: string | null;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlatformSubscriptionPlan {
  id: string;
  name: string; // e.g. "Starter", "Pro", "Enterprise"
  price: number; // 月額
  stripe_price_id: string;
  stripe_product_id: string;
  max_reservations_per_month: number | null; // null = unlimited
  transaction_fee_pct: number; // このプランでの手数料率
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StorePlatformSubscription {
  id: string;
  store_id: string;
  plan_id: string;
  stripe_subscription_id: string;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  store_id: string;
  customer_id: string | null;
  type: PaymentType;
  status: PaymentStatus;
  amount: number; // 円
  platform_fee: number;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface WebhookEvent {
  id: string;
  stripe_event_id: string; // UNIQUE
  type: string;
  processed_at: string;
  created_at: string;
}

export interface Product {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  price: number;
  stock_quantity: number | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  store_id: string;
  customer_id: string | null;
  customer_name: string;
  customer_email: string;
  status: OrderStatus;
  total_amount: number;
  platform_fee: number;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  created_at: string;
}

export interface NotificationLog {
  id: string;
  store_id: string | null;
  recipient_email: string;
  type: string;
  subject: string;
  status: "sent" | "failed";
  error: string | null;
  created_at: string;
}
