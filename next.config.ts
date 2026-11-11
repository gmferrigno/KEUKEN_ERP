import type { NextConfig } from "next";

// Prefer explicit NEXT_PUBLIC_* (client-safe). Fall back to server-style names.
const themeSheet =
  process.env.NEXT_PUBLIC_THEME_SHEET ||
  process.env.THEME_SHEET ||
  "";
const appBrand =
  process.env.NEXT_PUBLIC_BRAND ||
  process.env.APP_BRAND ||
  process.env.BRAND ||
  "";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  // Expose both names so packages/ui and app code resolve the same values.
  env: {
    THEME_SHEET: themeSheet,
    APP_BRAND: appBrand,
    NEXT_PUBLIC_THEME_SHEET: themeSheet,
    NEXT_PUBLIC_BRAND: appBrand,
  },
  cacheComponents: true,
  cacheLife: {
    test: {
      revalidate: 5,
    }
  },
  reactCompiler: true,
  logging: {
    fetches: {
      fullUrl: true, // Muestra la URL completa para identificar mejor la request
    },
  },
  productionBrowserSourceMaps: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: '/dx.:theme.css',
        destination: '/dx/dx.:theme.css',
      },
    ];
  },
};

export default nextConfig;
