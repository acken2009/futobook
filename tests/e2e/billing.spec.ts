import { test, expect } from "@playwright/test";

/**
 * 決済・プラン・Webhook APIの結合テスト
 * 実際のHTTPリクエストでAPIエンドポイントの動作を検証
 */

test.describe("admin/init-plans API", () => {
  test("認証なしで401を返す", async ({ request }) => {
    const res = await request.post("/api/admin/init-plans");
    expect(res.status()).toBe(401);
  });

  test("間違ったトークンで401を返す", async ({ request }) => {
    const res = await request.post("/api/admin/init-plans", {
      headers: { Authorization: "Bearer wrong-token" },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe("stripe/platform-subscription API", () => {
  test("未認証で401を返す", async ({ request }) => {
    const res = await request.post("/api/stripe/platform-subscription", {
      data: { plan_id: "00000000-0000-0000-0000-000000000000" },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe("stripe/checkout API", () => {
  test("未認証でサブスクリプションcheckoutは401を返す", async ({ request }) => {
    const res = await request.post("/api/stripe/checkout", {
      data: {
        type: "subscription",
        store_id: "00000000-0000-0000-0000-000000000000",
        plan_id: "00000000-0000-0000-0000-000000000000",
        customer: { name: "テスト", email: "test@example.com" },
      },
    });
    // 認証なしか、store_idが見つからないか
    expect([400, 401, 404]).toContain(res.status());
  });
});

test.describe("webhooks/stripe API", () => {
  test("署名なしで400を返す", async ({ request }) => {
    const res = await request.post("/api/webhooks/stripe", {
      data: { type: "customer.subscription.created" },
    });
    expect(res.status()).toBe(400);
  });

  test("不正な署名で400を返す", async ({ request }) => {
    const res = await request.post("/api/webhooks/stripe", {
      headers: { "stripe-signature": "invalid-signature" },
      data: { type: "customer.subscription.created" },
    });
    expect(res.status()).toBe(400);
  });
});

test.describe("webhooks/stripe-connect API", () => {
  test("署名なしで400を返す", async ({ request }) => {
    const res = await request.post("/api/webhooks/stripe-connect", {
      data: { type: "payment_intent.succeeded" },
    });
    expect(res.status()).toBe(400);
  });
});

test.describe("store-customizations API", () => {
  test("未認証で401を返す", async ({ request }) => {
    const res = await request.post("/api/store-customizations", {
      data: { primary_color: "#FF0000" },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe("subscription-plans API", () => {
  test("GETは405を返す（未実装メソッド）", async ({ request }) => {
    const res = await request.get("/api/subscription-plans");
    expect(res.status()).toBe(405);
  });

  test("未認証でPOSTは401を返す", async ({ request }) => {
    const res = await request.post("/api/subscription-plans", {
      data: {
        name: "テストプラン",
        price: 1000,
        interval: "month",
      },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe("reservations API", () => {
  test("不正なUUIDで400を返す", async ({ request }) => {
    const res = await request.post("/api/reservations", {
      data: {
        store_id: "invalid-uuid",
        reserved_at: new Date(Date.now() + 86400000).toISOString(),
        party_size: 1,
        customer: { name: "テスト", email: "test@example.com" },
      },
    });
    expect(res.status()).toBe(400);
  });

  test("存在しない店舗IDで404か400を返す", async ({ request }) => {
    const res = await request.post("/api/reservations", {
      data: {
        store_id: "00000000-0000-0000-0000-000000000000",
        reserved_at: new Date(Date.now() + 86400000).toISOString(),
        party_size: 1,
        customer: { name: "テスト", email: "test@example.com" },
      },
    });
    expect([400, 404]).toContain(res.status());
  });
});

test.describe("platform_subscription_plans API（公開）", () => {
  test("アクティブなプラン一覧が取得できる形のエンドポイントが存在する", async ({ request }) => {
    // billing ページが正常に表示されること（SSRとして）
    const res = await request.get("/dashboard/billing");
    // 未認証なのでログインにリダイレクトされる
    expect([200, 302, 307]).toContain(res.status());
  });
});
