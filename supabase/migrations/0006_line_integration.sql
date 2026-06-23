-- LINE連携フィールドをstoresテーブルに追加
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS line_channel_access_token TEXT,
  ADD COLUMN IF NOT EXISTS line_channel_secret TEXT;

-- LINE user IDをcustomersテーブルに追加
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS line_user_id TEXT;
