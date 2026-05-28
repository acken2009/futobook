"use server";

import { cookies } from "next/headers";

export async function setDashboardLang(lang: string) {
  const cookieStore = await cookies();
  cookieStore.set("dashboard-lang", lang === "en" ? "en" : "ja", {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
}
