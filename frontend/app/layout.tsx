import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/auth/clerkAppearance";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#0d9488",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "Invozen GST — GST Invoicing & Compliance for Indian Businesses",
  description:
    "The simplest GST invoicing and compliance workspace for India's small businesses. Create compliant invoices, auto-calculate GST, prepare GSTR-1/3B data, and send WhatsApp payment reminders.",
  keywords: [
    "GST invoice software India",
    "GST billing software",
    "GSTR-1 filing",
    "GSTR-3B",
    "e-invoice India",
    "small business GST",
  ],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Invozen GST",
  },
  openGraph: {
    title: "Invozen GST — GST Invoicing Made Simple",
    description:
      "Create GST-ready invoices, auto-calculate taxes, and send WhatsApp reminders. Built for Indian shops, freelancers, and small businesses.",
    type: "website",
    locale: "en_IN",
    siteName: "Invozen GST",
  },
  twitter: {
    card: "summary_large_image",
    title: "Invozen GST — The Simplest GST Workspace",
    description: "Invoice. Calculate GST. File. Get paid.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-IN" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col bg-white">
        <ClerkProvider
          appearance={clerkAppearance}
          signInUrl="/login"
          signUpUrl="/signup"
          signInFallbackRedirectUrl="/dashboard"
          signUpFallbackRedirectUrl="/onboarding"
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
