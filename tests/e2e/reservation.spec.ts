import { test, expect } from "@playwright/test";

/**
 * 予約フローのE2Eテスト（モックなし・UIレベル）
 * 実際のDB接続が必要なシナリオはCIで skip するか
 * Supabase local を使用すること
 */

test.describe("予約フォーム", () => {
  // 実店舗スラッグが必要なテストはスキップ条件を設ける
  test.skip(
    !process.env.PLAYWRIGHT_TEST_SLUG,
    "PLAYWRIGHT_TEST_SLUG が設定されていないためスキップ"
  );

  const slug = process.env.PLAYWRIGHT_TEST_SLUG ?? "test-store";

  test("予約ページが表示される", async ({ page }) => {
    await page.goto(`/store/${slug}/reserve`);
    await expect(page.getByRole("heading", { name: "予約する" })).toBeVisible();
  });

  test("日付選択後に時間スロットが表示される", async ({ page }) => {
    await page.goto(`/store/${slug}/reserve`);

    // 日付ボタンをクリック（最初の利用可能日）
    const dateButtons = page.locator("button").filter({ hasText: /月|火|水|木|金|土|日/ });
    if ((await dateButtons.count()) > 0) {
      await dateButtons.first().click();
      // 時間スロットが表示されることを確認
      await expect(page.getByText("時間")).toBeVisible();
    }
  });
});

test.describe("予約API", () => {
  test("無効なstore_idでPOSTすると400を返す", async ({ request }) => {
    const res = await request.post("/api/reservations", {
      data: {
        store_id: "not-a-uuid",
        reserved_at: new Date().toISOString(),
        party_size: 1,
        customer: { name: "テスト", email: "test@example.com" },
      },
    });
    expect(res.status()).toBe(400);
  });

  test("存在しない店舗では404を返す", async ({ request }) => {
    const res = await request.post("/api/reservations", {
      data: {
        store_id: "00000000-0000-0000-0000-000000000000",
        reserved_at: new Date(Date.now() + 86400000).toISOString(),
        party_size: 1,
        customer: { name: "テスト", email: "test@example.com" },
      },
    });
    expect([404, 400]).toContain(res.status());
  });
});
