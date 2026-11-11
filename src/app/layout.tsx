import "@/lib/erp-api-client.setup";
import { AuthProvider } from "@/contexts/AuthContext";
import { DxConfigProvider } from "@/contexts/DxConfigProvider";
import { LocaleProvider } from "@/contexts/LocaleContext";
import { BrandProvider, getBrandConfig, getDefaultDeployConfig } from "@repo/ui/brand";
import type { Metadata } from "next";
import './globals.css';


export function generateMetadata(): Metadata {
  const brand = getBrandConfig();
  const iconHref = brand.icon?.dataUri || brand.icon?.url || brand.favicon || '/logo.svg';

  return {
    title: `ERP ${brand.name}`,
    description: `Sistema de gestión empresarial ${brand.name}`,
    icons: {
      icon: iconHref,
      shortcut: iconHref,
      apple: iconHref,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Resolve on the server so DEPLOY_ENV / APP_PORT work without NEXT_PUBLIC_*.
  const deploy = getDefaultDeployConfig();

  return (
    <html lang="es">
      <body
        className={`antialiased`}
      >
        <DxConfigProvider>
          <LocaleProvider>
            <AuthProvider>
              <BrandProvider deploy={deploy}>
                {children}
              </BrandProvider>
            </AuthProvider>
          </LocaleProvider>
        </DxConfigProvider>
      </body>
    </html>
  );
}
