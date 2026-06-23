-- 在庫アトミックデクリメント関数
CREATE OR REPLACE FUNCTION decrement_stock(p_product_id UUID, p_quantity INT)
RETURNS void AS $$
  UPDATE products
  SET stock_quantity = GREATEST(0, stock_quantity - p_quantity)
  WHERE id = p_product_id AND stock_quantity IS NOT NULL;
$$ LANGUAGE sql;

-- products/orders の updated_at 自動更新トリガー
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['products', 'orders']
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION update_updated_at();',
      t, t
    );
  END LOOP;
END $$;

-- リマインダー重複送信防止: reminder_sent_at カラムを追加
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_reservations_reminder ON reservations(status, reserved_at) WHERE reminder_sent_at IS NULL;
