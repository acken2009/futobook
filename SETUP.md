# StorePlatform セットアップガイド

## 前提条件

- Node.js 20以上
- [Supabase](https://supabase.com) アカウント
- [Stripe](https://stripe.com/jp) アカウント
- [Resend](https://resend.com) アカウント（メール送信）
- [Sentry](https://sentry.io) アカウント（任意・エラー監視）

---

## 1. ローカル開発環境のセットアップ

```bash
# リポジトリをクローン
cd C:\Users\acken\source\repos\store-platform

# 依存パッケージのインストール（Node.js要インストール）
npm install

# 環境変数ファイルを作成
copy .env.local.example .env.local
```

---

## 2. Supabase の設定

### 2-1. プロジェクト作成

1. [supabase.com](https://supabase.com) にログイン
2. 「New Project」→ 名前・パスワード・リージョン(Northeast Asia)を設定
3. 作成後、「Project Settings」→「API」から以下を取得：
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

### 2-2. マイグレーション実行

```bash
# Supabase CLIをインストール（初回のみ）
npm install -g supabase

# ログイン
supabase login

# プロジェクトをリンク
supabase link --project-ref YOUR_PROJECT_REF

# マイグレーション実行
supabase db push
```

または Supabase ダッシュボードの「SQL Editor」で以下を順番に実行：
1. `supabase/migrations/0001_initial_schema.sql`
2. `supabase/migrations/0002_rls_policies.sql`

### 2-3. Supabase Auth の設定

- 「Authentication」→「URL Configuration」
  - Site URL: `http://localhost:3000`（本番は `https://yourdomain.com`）
  - Redirect URLs: `http://localhost:3000/api/auth/callback`

---

## 3. Stripe の設定

### 3-1. APIキー取得

1. [Stripe ダッシュボード](https://dashboard.stripe.com) にログイン
2. 「開発者」→「APIキー」から取得
3. テストモードで作業すること（`sk_test_...`, `pk_test_...`）

### 3-2. Connect の有効化

1. 「Connect」→「設定」で有効化
2. プラットフォーム名・サポートURL等を設定

### 3-3. Webhook の設定

```bash
# Stripe CLI のインストール（Windows）
# https://github.com/stripe/stripe-cli/releases から stripe_windows_x86_64.zip をダウンロード

# ローカルWebhookの転送
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# → STRIPE_WEBHOOK_SECRET を .env.local に設定

stripe listen --forward-to localhost:3000/api/webhooks/stripe-connect --events payment_intent.succeeded,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted
# → STRIPE_CONNECT_WEBHOOK_SECRET を .env.local に設定
```

### 3-4. プラットフォームプランの Price ID 設定

Stripe ダッシュボードで以下を作成し、DBのplaceholderを更新：

```sql
-- Stripe Price ID を設定（Supabase SQL Editor で実行）
UPDATE platform_subscription_plans
SET stripe_price_id = 'price_実際のID', stripe_product_id = 'prod_実際のID'
WHERE name = 'Starter';
```

---

## 4. Resend の設定

1. [resend.com](https://resend.com) でアカウント作成
2. 「API Keys」から取得 → `RESEND_API_KEY`
3. 送信元ドメインを設定 → `EMAIL_FROM`

---

## 5. 環境変数の設定

`.env.local` に以下を設定：

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_...

RESEND_API_KEY=re_...
EMAIL_FROM=noreply@yourdomain.com

NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_DOMAIN=localhost:3000
NEXT_PUBLIC_APP_NAME=StorePlatform

# 任意
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
```

---

## 6. 開発サーバーの起動

```bash
npm run dev
# → http://localhost:3000
```

---

## 7. 本番デプロイ（Vercel）

```bash
# Vercel CLI のインストール
npm install -g vercel

# デプロイ
vercel

# 環境変数を Vercel に設定
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# （すべての環境変数を同様に設定）
```

### Vercel の設定

1. Vercel ダッシュボードでドメインを設定
2. Stripe Webhook の本番URLを更新：
   - `https://yourdomain.com/api/webhooks/stripe`
   - `https://yourdomain.com/api/webhooks/stripe-connect`
3. Supabase の Redirect URLs に本番URLを追加

### サブドメイン設定（Phase 3機能）

1. DNSで `*.yourdomain.com` をVercelにポイント
2. Vercel でワイルドカードドメインを追加
3. `vercel.json` の `yourdomain.com` を実際のドメインに変更
4. `.env.local` の `NEXT_PUBLIC_APP_DOMAIN=yourdomain.com` を設定

---

## 8. E2Eテスト

```bash
# Playwright のインストール
npx playwright install

# テスト実行
npx playwright test

# UIモードで実行
npx playwright test --ui
```

---

## トラブルシューティング

### 予約が作成されない
→ Supabase のRLSポリシーを確認。`supabase_admin` クライアントを使っているか確認。

### Stripe Webhook が届かない
→ `stripe listen` が起動しているか確認。署名シークレットが正しいか確認。

### メールが届かない
→ Resend APIキーと送信元ドメインを確認。`notification_log` テーブルでエラーを確認。
