-- customer_subscriptions.stripe_subscription_id にUNIQUE制約を追加
-- これにより handleCustomerSubscriptionCreated の upsert が正しく機能する
-- （Stripeのwebhookリトライ時に重複レコードが作成されなくなる）
ALTER TABLE customer_subscriptions
  ALTER COLUMN stripe_subscription_id SET NOT NULL;

ALTER TABLE customer_subscriptions
  ADD CONSTRAINT uq_customer_subscriptions_stripe_id
  UNIQUE (stripe_subscription_id);
