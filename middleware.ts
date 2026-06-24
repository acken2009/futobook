import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * サブドメインからstoreスラッグを解決する
 * 例: cafe-yamada.storeplatform.jp → "cafe-yamada"
 */
function getSlugFromSubdomain(request: NextRequest): string | null {
  const hostname = request.headers.get("host") ?? "";
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN ?? "localhost:3000";

  // ローカル開発ではサブドメイン解決をスキップ
  if (hostname === appDomain || hostname === "localhost:3000") return null;

  // サブドメインを抽出 (例: cafe-yamada.storeplatform.jp → cafe-yamada)
  const subdomain = hostname.replace(`.${appDomain}`, "");
  if (subdomain && subdomain !== hostname && /^[a-z0-9-]+$/.test(subdomain)) {
    return subdomain;
  }

  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let supabaseResponse = NextResponse.next({ request });

  // ============================================================
  // サブドメインルーティング
  // /store/[slug] へリライト
  // ============================================================
  const slugFromSubdomain = getSlugFromSubdomain(request);
  if (slugFromSubdomain) {
    // /api や /_next は除く
    if (!pathname.startsWith("/_next") && !pathname.startsWith("/api")) {
      const url = request.nextUrl.clone();
      // /  → /store/[slug]
      // /reserve → /store/[slug]/reserve  など
      url.pathname = `/store/${slugFromSubdomain}${pathname === "/" ? "" : pathname}`;
      supabaseResponse = NextResponse.rewrite(url);
      supabaseResponse.headers.set("x-store-slug", slugFromSubdomain);
      return supabaseResponse;
    }
  }

  // ============================================================
  // Supabase セッション更新
  // ============================================================
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ============================================================
  // 認証ガード
  // ============================================================

  // 店舗ダッシュボード
  if (pathname.startsWith("/dashboard")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  // プラットフォーム管理
  if (pathname.startsWith("/admin")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  // ログイン済みならダッシュボードへ
  if (pathname === "/login" || pathname === "/signup") {
    if (user) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // ============================================================
  // テナント解決: /store/[slug] のslugをヘッダーに注入
  // ============================================================
  const storeMatch = pathname.match(/^\/store\/([a-z0-9-]+)/);
  if (storeMatch) {
    supabaseResponse.headers.set("x-store-slug", storeMatch[1]);
  }

  // ============================================================
  // セキュリティヘッダー
  // ============================================================
  supabaseResponse.headers.set("X-Content-Type-Options", "nosniff");
  supabaseResponse.headers.set("X-Frame-Options", "DENY");
  supabaseResponse.headers.set("X-XSS-Protection", "1; mode=block");
  supabaseResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  supabaseResponse.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
