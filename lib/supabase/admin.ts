import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * service_role クライアント（RLSをバイパス）
 * Webhook処理・管理バッチ・サーバー側の特権操作にのみ使用
 * ⚠️ クライアントサイドには絶対に公開しないこと
 *
 * 遅延初期化: モジュール読み込み時ではなく最初の利用時に生成する。
 * これにより環境変数が無い環境（CIのビルド等）でも import 自体は失敗しない。
 */
let _client: SupabaseClient | null = null;

function getAdminClient(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
      );
    }
    _client = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _client;
}

export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getAdminClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
