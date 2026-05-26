import { test, expect } from "@playwright/test";

test.describe("認証フロー", () => {
  test("未ログインでダッシュボードにアクセスするとログインページへリダイレクト", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("ログインページが表示される", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "ログイン" })).toBeVisible();
    await expect(page.getByPlaceholder("you@example.com")).toBeVisible();
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();
  });

  test("新規登録ページが表示される", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByRole("heading", { name: "新規登録" })).toBeVisible();
  });

  test("ログインページからサインアップへ遷移できる", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "新規登録" }).click();
    await expect(page).toHaveURL("/signup");
  });
});
