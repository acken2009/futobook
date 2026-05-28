import { cookies } from "next/headers";

export type Lang = "ja" | "en";

export async function getLang(): Promise<Lang> {
  const cookieStore = await cookies();
  return cookieStore.get("dashboard-lang")?.value === "en" ? "en" : "ja";
}
