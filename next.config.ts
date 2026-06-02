import type { NextConfig } from "next";

function buildAllowedOrigins(): string[] {
  const origins = new Set<string>(["localhost:3000"]);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    try {
      const { host } = new URL(appUrl);
      if (host) origins.add(host);
    } catch {
      // ignore invalid URL
    }
  }

  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN;
  if (appDomain) {
    origins.add(appDomain);
    origins.add(`*.${appDomain}`);
  }

  return Array.from(origins);
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: buildAllowedOrigins(),
    },
  },
};

export default nextConfig;
