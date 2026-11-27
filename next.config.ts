import type { NextConfig } from "next";

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
      fullUrl: false,
    },
  },
  productionBrowserSourceMaps: false,
  typescript: {
    ignoreBuildErrors: false,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
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
