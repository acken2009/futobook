-- ============================================================
-- 0004_reservation_cancel_token.sql
-- 予約キャンセルトークン機能の追加
-- ============================================================

ALTER TABLE reservations
  ADD COLUMN cancel_token          TEXT UNIQUE,
  ADD COLUMN cancel_token_expires_at TIMESTAMPTZ;

-- 既存の予約にはトークンを付与しない（NULL のまま）
-- 新規予約作成時にアプリ側でトークンを生成する

COMMENT ON COLUMN reservations.cancel_token IS
  '顧客がメールリンクで予約をキャンセルするためのワンタイムトークン';
COMMENT ON COLUMN reservations.cancel_token_expires_at IS
  'キャンセル受付期限 = reserved_at の 2 時間前';
