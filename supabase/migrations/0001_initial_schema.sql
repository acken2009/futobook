-- ============================================================
-- 0001_initial_schema.sql
-- マルチテナント店舗プラットフォーム 初期スキーマ
-- ============================================================

-- UUID拡張有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PLATFORM LAYER
-- ============================================================

CREATE TABLE platforms (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                 TEXT NOT NULL DEFAULT 'StorePlatform',
  transaction_fee_pct  NUMERIC(5,4) NOT NULL DEFAULT 0.05, -- 5%
  stripe_account_id    TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- プラットフォームは1行のみ
INSERT INTO platforms (name, transaction_fee_pct)
VALUES ('StorePlatform', 0.05);

-- ============================================================
-- TENANT / STORE LAYER
-- ============================================================

CREATE TABLE stores (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id                  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                      TEXT NOT NULL,
  slug                      TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{3,50}$'),
  status                    TEXT NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active','suspended','pending')),
  stripe_account_id         TEXT,
  stripe_account_status     TEXT NOT NULL DEFAULT 'not_connected'
                              CHECK (stripe_account_status IN ('not_connected','pending','active','restricted')),
  platform_subscription_id  TEXT,
  platform_plan_id          UUID,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stores_owner_id ON stores(owner_id);
CREATE INDEX idx_stores_slug     ON stores(slug);

CREATE TABLE store_customizations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id          UUID NOT NULL UNIQUE REFERENCES stores(id) ON DELETE CASCADE,
  logo_url          TEXT,
  cover_image_url   TEXT,
  primary_color     TEXT NOT NULL DEFAULT '#3B82F6',
  secondary_color   TEXT NOT NULL DEFAULT '#1E40AF',
  font_family       TEXT NOT NULL DEFAULT 'inter',
  description       TEXT,
  address           TEXT,
  phone             TEXT,
  website_url       TEXT,
  instagram_url     TEXT,
  twitter_url       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE service_items (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id         UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  description      TEXT,
  price            INTEGER,            -- 円。NULL = 無料
  duration_minutes INTEGER,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_service_items_store_id ON service_items(store_id);

CREATE TABLE reservation_settings (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id                UUID NOT NULL UNIQUE REFERENCES stores(id) ON DELETE CASCADE,
  slot_duration_minutes   INTEGER NOT NULL DEFAULT 60,
  max_party_size          INTEGER NOT NULL DEFAULT 4,
  advance_booking_days    INTEGER NOT NULL DEFAULT 30,
  cancellation_hours      INTEGER NOT NULL DEFAULT 24,
  requires_payment        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- OPERATIONS LAYER
-- ============================================================

CREATE TABLE availability_schedules (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id     UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  day_of_week  INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_time    TIME NOT NULL DEFAULT '09:00',
  close_time   TIME NOT NULL DEFAULT '18:00',
  is_closed    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, day_of_week)
);

CREATE TABLE availability_overrides (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  is_closed   BOOLEAN NOT NULL DEFAULT TRUE,
  open_time   TIME,
  close_time  TIME,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, date)
);

CREATE TABLE customers (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id           UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  auth_user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- nullable: ゲスト可
  email              TEXT NOT NULL,
  name               TEXT NOT NULL,
  phone              TEXT,
  stripe_customer_id TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, email)
);

CREATE INDEX idx_customers_store_id     ON customers(store_id);
CREATE INDEX idx_customers_auth_user_id ON customers(auth_user_id);

CREATE TABLE reservations (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id         UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_id      UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  service_item_id  UUID REFERENCES service_items(id) ON DELETE SET NULL,
  reserved_at      TIMESTAMPTZ NOT NULL,
  party_size       INTEGER NOT NULL DEFAULT 1,
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','confirmed','cancelled','completed','no_show')),
  notes            TEXT,
  payment_id       UUID,  -- payments.id (後で外部キー追加)
  total_amount     INTEGER,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 同時刻の予約競合を防ぐ（確定済みのみ）
CREATE UNIQUE INDEX idx_reservations_no_double_book
  ON reservations(store_id, reserved_at)
  WHERE status = 'confirmed';

CREATE INDEX idx_reservations_store_id    ON reservations(store_id);
CREATE INDEX idx_reservations_customer_id ON reservations(customer_id);
CREATE INDEX idx_reservations_reserved_at ON reservations(reserved_at);

CREATE TABLE notification_log (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id         UUID REFERENCES stores(id) ON DELETE SET NULL,
  recipient_email  TEXT NOT NULL,
  type             TEXT NOT NULL,
  subject          TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','failed')),
  error            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- BILLING LAYER
-- ============================================================

CREATE TABLE store_subscription_plans (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id         UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  description      TEXT,
  price            INTEGER NOT NULL,  -- 円/月
  interval         TEXT NOT NULL DEFAULT 'month' CHECK (interval IN ('month','year')),
  stripe_price_id  TEXT,
  stripe_product_id TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  features         JSONB NOT NULL DEFAULT '[]',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_store_subscription_plans_store_id ON store_subscription_plans(store_id);

CREATE TABLE customer_subscriptions (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id                UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_id             UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  plan_id                 UUID NOT NULL REFERENCES store_subscription_plans(id) ON DELETE RESTRICT,
  stripe_subscription_id  TEXT,
  status                  TEXT NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active','past_due','cancelled','trialing','incomplete')),
  current_period_start    TIMESTAMPTZ,
  current_period_end      TIMESTAMPTZ,
  cancelled_at            TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customer_subscriptions_store_id    ON customer_subscriptions(store_id);
CREATE INDEX idx_customer_subscriptions_customer_id ON customer_subscriptions(customer_id);

CREATE TABLE platform_subscription_plans (
  id                            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                          TEXT NOT NULL,
  price                         INTEGER NOT NULL,  -- 円/月
  stripe_price_id               TEXT NOT NULL,
  stripe_product_id             TEXT NOT NULL,
  max_reservations_per_month    INTEGER,  -- NULL = 無制限
  transaction_fee_pct           NUMERIC(5,4) NOT NULL DEFAULT 0.05,
  is_active                     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- デフォルトプランを挿入（Stripe設定後に更新）
INSERT INTO platform_subscription_plans
  (name, price, stripe_price_id, stripe_product_id, max_reservations_per_month, transaction_fee_pct)
VALUES
  ('Starter', 2980, 'price_placeholder_starter', 'prod_placeholder', 100, 0.05),
  ('Pro',     9800, 'price_placeholder_pro',     'prod_placeholder', NULL, 0.03),
  ('Enterprise', 29800, 'price_placeholder_ent', 'prod_placeholder', NULL, 0.02);

CREATE TABLE store_platform_subscriptions (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id                UUID NOT NULL UNIQUE REFERENCES stores(id) ON DELETE CASCADE,
  plan_id                 UUID NOT NULL REFERENCES platform_subscription_plans(id),
  stripe_subscription_id  TEXT NOT NULL,
  status                  TEXT NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active','past_due','cancelled','trialing','incomplete')),
  current_period_start    TIMESTAMPTZ,
  current_period_end      TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payments (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id                  UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_id               UUID REFERENCES customers(id) ON DELETE SET NULL,
  type                      TEXT NOT NULL
                              CHECK (type IN ('reservation','subscription','platform_fee','refund')),
  status                    TEXT NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','succeeded','failed','refunded')),
  amount                    INTEGER NOT NULL,        -- 円
  platform_fee              INTEGER NOT NULL DEFAULT 0,
  stripe_payment_intent_id  TEXT,
  stripe_charge_id          TEXT,
  metadata                  JSONB NOT NULL DEFAULT '{}',
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_store_id ON payments(store_id);

-- reservations.payment_id の外部キーを追加
ALTER TABLE reservations
  ADD CONSTRAINT fk_reservations_payment
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL;

CREATE TABLE webhook_events (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_event_id  TEXT NOT NULL UNIQUE,  -- 冪等性保証
  type             TEXT NOT NULL,
  processed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- updated_at 自動更新トリガー
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 各テーブルにトリガーを設定
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'platforms','stores','store_customizations','service_items',
    'reservation_settings','availability_schedules',
    'customers','reservations',
    'store_subscription_plans','customer_subscriptions',
    'platform_subscription_plans','store_platform_subscriptions',
    'payments'
  ]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at
       BEFORE UPDATE ON %s
       FOR EACH ROW EXECUTE FUNCTION update_updated_at();',
      t, t
    );
  END LOOP;
END $$;
