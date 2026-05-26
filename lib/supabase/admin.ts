import { createClient } from "@supabase/supabase-js";

/**
 * service_role クライアント（RLSをバイパス）
 * Webhook処理・管理バッチ・サーバー側の特権操作にのみ使用
 * ⚠️ クライアントサイドには絶対に公開しないこと
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
