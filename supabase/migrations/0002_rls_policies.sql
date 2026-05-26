-- ============================================================
-- 0002_rls_policies.sql
-- Row Level Security ポリシー設定
-- ============================================================

-- ============================================================
-- platforms: 全員読み取り可、更新はservice_roleのみ
-- ============================================================
ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platforms_public_read" ON platforms
  FOR SELECT USING (true);

-- ============================================================
-- stores
-- ============================================================
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

-- 公開: slugとstatusで公開店舗を参照可
CREATE POLICY "stores_public_read" ON stores
  FOR SELECT USING (status = 'active');

-- オーナー: 自分の店舗を全操作可
CREATE POLICY "stores_owner_all" ON stores
  FOR ALL USING (owner_id = auth.uid());

-- ============================================================
-- store_customizations
-- ============================================================
ALTER TABLE store_customizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "store_customizations_public_read" ON store_customizations
  FOR SELECT USING (
    store_id IN (SELECT id FROM stores WHERE status = 'active')
  );

CREATE POLICY "store_customizations_owner_all" ON store_customizations
  FOR ALL USING (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  );

-- ============================================================
-- service_items
-- ============================================================
ALTER TABLE service_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_items_public_read" ON service_items
  FOR SELECT USING (
    is_active = TRUE AND
    store_id IN (SELECT id FROM stores WHERE status = 'active')
  );

CREATE POLICY "service_items_owner_all" ON service_items
  FOR ALL USING (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  );

-- ============================================================
-- reservation_settings
-- ============================================================
ALTER TABLE reservation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reservation_settings_public_read" ON reservation_settings
  FOR SELECT USING (
    store_id IN (SELECT id FROM stores WHERE status = 'active')
  );

CREATE POLICY "reservation_settings_owner_all" ON reservation_settings
  FOR ALL USING (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  );

-- ============================================================
-- availability_schedules / availability_overrides
-- ============================================================
ALTER TABLE availability_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "availability_schedules_public_read" ON availability_schedules
  FOR SELECT USING (
    store_id IN (SELECT id FROM stores WHERE status = 'active')
  );

CREATE POLICY "availability_schedules_owner_all" ON availability_schedules
  FOR ALL USING (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  );

ALTER TABLE availability_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "availability_overrides_public_read" ON availability_overrides
  FOR SELECT USING (
    store_id IN (SELECT id FROM stores WHERE status = 'active')
  );

CREATE POLICY "availability_overrides_owner_all" ON availability_overrides
  FOR ALL USING (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  );

-- ============================================================
-- customers: オーナーが自分の店舗の顧客を管理
-- ============================================================
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- 自分自身のレコードを参照可（ログイン顧客）
CREATE POLICY "customers_self_read" ON customers
  FOR SELECT USING (auth_user_id = auth.uid());

-- オーナーが自分の店舗の顧客を全操作可
CREATE POLICY "customers_owner_all" ON customers
  FOR ALL USING (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  );

-- ============================================================
-- reservations
-- ============================================================
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- 顧客: 自分の予約を参照・作成可
CREATE POLICY "reservations_customer_select" ON reservations
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "reservations_customer_insert" ON reservations
  FOR INSERT WITH CHECK (
    customer_id IN (SELECT id FROM customers WHERE auth_user_id = auth.uid()) OR
    -- ゲスト予約はservice_roleで処理するためここでは許可しない
    FALSE
  );

-- オーナー: 自分の店舗の予約を全操作可
CREATE POLICY "reservations_owner_all" ON reservations
  FOR ALL USING (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  );

-- ============================================================
-- store_subscription_plans
-- ============================================================
ALTER TABLE store_subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "store_subscription_plans_public_read" ON store_subscription_plans
  FOR SELECT USING (
    is_active = TRUE AND
    store_id IN (SELECT id FROM stores WHERE status = 'active')
  );

CREATE POLICY "store_subscription_plans_owner_all" ON store_subscription_plans
  FOR ALL USING (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  );

-- ============================================================
-- customer_subscriptions
-- ============================================================
ALTER TABLE customer_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_subscriptions_self_read" ON customer_subscriptions
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "customer_subscriptions_owner_all" ON customer_subscriptions
  FOR ALL USING (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  );

-- ============================================================
-- platform_subscription_plans: 全員読み取り可
-- ============================================================
ALTER TABLE platform_subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_subscription_plans_public_read" ON platform_subscription_plans
  FOR SELECT USING (is_active = TRUE);

-- ============================================================
-- store_platform_subscriptions: オーナー自分の情報のみ
-- ============================================================
ALTER TABLE store_platform_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "store_platform_subscriptions_owner_read" ON store_platform_subscriptions
  FOR SELECT USING (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  );

-- ============================================================
-- payments: オーナーが自分の店舗の決済を参照
-- ============================================================
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_owner_read" ON payments
  FOR SELECT USING (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  );

CREATE POLICY "payments_customer_read" ON payments
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE auth_user_id = auth.uid())
  );

-- ============================================================
-- webhook_events / notification_log: service_roleのみ
-- ============================================================
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

-- RLSを有効化しつつ、アプリからはservice_roleクライアント経由でアクセス
-- 一般ユーザーからのアクセスは全て拒否（ポリシーなし = deny by default）
