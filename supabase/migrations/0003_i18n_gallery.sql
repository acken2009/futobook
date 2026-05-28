-- ============================================================
-- 0003_i18n_gallery.sql
-- 多言語対応 + ギャラリー機能
-- ============================================================

-- store_customizations に英語フィールドを追加
ALTER TABLE store_customizations
  ADD COLUMN IF NOT EXISTS name_en       TEXT,
  ADD COLUMN IF NOT EXISTS description_en TEXT;

-- service_items に英語フィールドを追加
ALTER TABLE service_items
  ADD COLUMN IF NOT EXISTS name_en        TEXT,
  ADD COLUMN IF NOT EXISTS description_en TEXT;

-- store_subscription_plans に英語フィールドを追加
ALTER TABLE store_subscription_plans
  ADD COLUMN IF NOT EXISTS name_en        TEXT,
  ADD COLUMN IF NOT EXISTS description_en TEXT;

-- store_images テーブル（ギャラリー）
CREATE TABLE IF NOT EXISTS store_images (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  storage_path TEXT,          -- Supabase Storage のパス
  alt_text    TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_images_store_id ON store_images(store_id);

-- RLS
ALTER TABLE store_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "store_images_public_read" ON store_images
  FOR SELECT USING (
    store_id IN (SELECT id FROM stores WHERE status = 'active')
  );

CREATE POLICY "store_images_owner_all" ON store_images
  FOR ALL USING (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  );
