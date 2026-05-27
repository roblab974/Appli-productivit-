import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import { ClerkProvider } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "PersonalDash",
  description: "Mon dashboard personnel",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PersonalDash",
  },
};

export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#3B82F6",
          colorBackground: "#0F172A",
          colorText: "#F8FAFC",
          colorTextSecondary: "#94A3B8",
          colorInputBackground: "#1E293B",
          colorInputText: "#F8FAFC",
          colorNeutral: "#334155",
          colorDanger: "#EF4444",
          colorSuccess: "#22C55E",
          colorWarning: "#F59E0B",
          borderRadius: "0.75rem",
        },
        elements: {
          card: "bg-surface border border-border shadow-card",
          headerTitle: "text-foreground",
          headerSubtitle: "text-foreground-muted",
          socialButtonsBlockButton: "border-border bg-surface-2 text-foreground hover:bg-surface",
          dividerLine: "bg-border",
          dividerText: "text-foreground-muted",
          formFieldLabel: "text-foreground-muted",
          formFieldInput: "bg-surface-2 border-border text-foreground",
          formButtonPrimary: "bg-gradient-accent hover:opacity-90 normal-case",
          footerActionText: "text-foreground-muted",
          footerActionLink: "text-accent-blue hover:text-accent-purple",
          identityPreviewText: "text-foreground",
          identityPreviewEditButton: "text-accent-blue",
        },
      }}
    >
      <html lang="fr" className="dark">
        <head>
          <link rel="apple-touch-icon" href="/icons/icon-192.png" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="mobile-web-app-capable" content="yes" />
        </head>
        <body className="min-h-dvh bg-background">
          <main className="pb-20">{children}</main>
          <BottomNav />
        </body>
      </html>
    </ClerkProvider>
  );
}
