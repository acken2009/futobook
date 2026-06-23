-- 商品テーブル
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL CHECK (price >= 0),
  stock_quantity INTEGER CHECK (stock_quantity >= 0),
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 注文テーブル
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  total_amount INTEGER NOT NULL,
  platform_fee INTEGER NOT NULL DEFAULT 0,
  stripe_checkout_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 注文明細テーブル
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(store_id, is_active);
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON orders(store_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active products" ON products
  FOR SELECT USING (is_active = true);

CREATE POLICY "Store owner manage products" ON products
  FOR ALL USING (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  );

CREATE POLICY "Store owner view orders" ON orders
  FOR SELECT USING (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  );

CREATE POLICY "Store owner view order items" ON order_items
  FOR SELECT USING (
    order_id IN (
      SELECT o.id FROM orders o
      JOIN stores s ON s.id = o.store_id
      WHERE s.owner_id = auth.uid()
    )
  );
