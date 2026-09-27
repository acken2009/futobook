-- ============================================================
-- 0010_site_config.sql
-- 店舗サイトビルダー: テンプレート・テーマ・セクション構成を保存する
-- 形式は lib/site/config.ts の SiteConfig（アプリ側で検証してから保存）
-- NULL の店舗は「シンプル」テンプレート（従来の店舗ページと同じ構成）で表示される
-- ============================================================

ALTER TABLE store_customizations
  ADD COLUMN IF NOT EXISTS site_config JSONB;
