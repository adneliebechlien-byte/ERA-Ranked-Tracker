import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";
import { TEAM_NAME } from "@/lib/roster";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: `${TEAM_NAME} — Ranked Analytics`,
  description: `Rangert-statistikk for ${TEAM_NAME}`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="no" className="dark">
      <body className={`${spaceGrotesk.variable} ${inter.variable} antialiased`}>
        <div className="min-h-screen">
          <header className="border-b border-border">
            <div className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
              <div className="flex items-baseline gap-3">
                <span className="font-display font-bold text-lg tracking-tight">
                  {TEAM_NAME}
                </span>
                <span className="text-text-muted text-sm">Analytics</span>
              </div>
              <nav className="flex items-center gap-1 text-sm">
                <span className="px-3 py-1.5 rounded-md bg-panel-alt border border-border text-text">
                  Ranked
                </span>
                <span className="px-3 py-1.5 rounded-md text-text-muted cursor-not-allowed">
                  Competitive — kommer snart
                </span>
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
        </div>
      </body>
    </html>
  );
}
