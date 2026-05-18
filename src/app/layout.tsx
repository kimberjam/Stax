import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stax — Private AI hypertrophy coaching",
  description:
    "A private, invite-only AI coach for bodybuilding-style training. Stack the plates. Stack the gains.",
  icons: { icon: "/icon.svg" },
  applicationName: "Stax",
  appleWebApp: {
    capable: true,
    title: "Stax",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B0F14",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-obsidian text-cream font-sans">{children}</body>
    </html>
  );
}
