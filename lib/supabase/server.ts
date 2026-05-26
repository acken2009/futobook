import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * サーバー（Server Component / Route Handler / Server Action）用 Supabase クライアント
 * Next.js の cookies() を利用してセッションを維持
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2]);
            });
          } catch {
            // Server Component内ではCookieの書き込みができない場合がある
            // middleware で処理されるため問題なし
          }
        },
      },
    }
  );
}
