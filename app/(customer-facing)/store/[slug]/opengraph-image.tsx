import { ImageResponse } from "next/og";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "edge";
export const alt = "店舗ページ";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: { slug: string };
}) {
  const { data: store } = await supabaseAdmin
    .from("stores")
    .select("name, store_customizations(primary_color, description)")
    .eq("slug", params.slug)
    .single();

  const name = store?.name ?? params.slug;
  const custom = (store?.store_customizations as any);
  const color = custom?.primary_color ?? "#3B82F6";
  const description = custom?.description ?? "予約・サブスク・決済対応店舗";

  return new ImageResponse(
    (
      <div
        style={{
          background: color,
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          color: "white",
          padding: "80px",
        }}
      >
        <div style={{ fontSize: 80, fontWeight: "bold", marginBottom: 24 }}>
          {name}
        </div>
        {description && (
          <div
            style={{
              fontSize: 28,
              opacity: 0.9,
              textAlign: "center",
              maxWidth: 900,
              lineHeight: 1.6,
            }}
          >
            {description}
          </div>
        )}
        <div
          style={{
            marginTop: 48,
            fontSize: 20,
            opacity: 0.7,
            background: "rgba(255,255,255,0.2)",
            padding: "12px 24px",
            borderRadius: 8,
          }}
        >
          Futobook
        </div>
      </div>
    ),
    { ...size }
  );
}
