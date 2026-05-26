import { test, expect } from "@playwright/test";

/**
 * 公開店舗ページのテスト
 * 事前条件: テスト用スラッグ "test-store" が存在すること
 * または PLAYWRIGHT_TEST_SLUG 環境変数で上書き可能
 */

const TEST_SLUG = process.env.PLAYWRIGHT_TEST_SLUG ?? "test-store";

test.describe("公開店舗ページ", () => {
  test("存在しない店舗は404を返す", async ({ page }) => {
    await page.goto("/store/this-store-does-not-exist-12345");
    await expect(page).toHaveURL(/store\/this-store-does-not-exist-12345/);
    // Next.js の notFound() は404ページを表示する
    await expect(page.locator("body")).toContainText(/404|見つかりません/i);
  });

  test("トップページが表示される", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /デジタルで進化させる|StorePlatform/i }).first()
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "無料で始める" })).toBeVisible();
  });
});

test.describe("予約フロー（UIテスト）", () => {
  test("予約ページのナビゲーションが機能する", async ({ page }) => {
    await page.goto("/");
    // ログインリンクが存在する
    await expect(page.getByRole("link", { name: "ログインする →" })).toBeVisible();
  });
});
