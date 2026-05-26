import { createBrowserClient } from "@supabase/ssr";

/**
 * ブラウザ（Client Component）用 Supabase クライアント
 * 認証状態はCookieで管理される
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
