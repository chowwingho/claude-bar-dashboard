import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Claude Bar Dashboard",
  description: "Token usage analytics for Claude Code",
};

const NAV_ITEMS = [
  { href: "/", label: "Overview" },
  { href: "/timeline", label: "Timeline" },
  { href: "/patterns", label: "Patterns" },
  { href: "/correlation", label: "Correlation" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#0a0a0a] text-[#e5e5e5]">
        <header className="border-b border-[#262626] px-6 py-3">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <div className="flex items-center gap-6">
              <Link
                href="/"
                className="text-lg font-semibold tracking-tight"
              >
                Claude Bar
              </Link>
              <nav className="flex gap-4 text-sm text-[#737373]">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="transition-colors hover:text-[#e5e5e5]"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
            <span className="text-xs text-[#737373] font-mono">
              token usage analytics
            </span>
          </div>
        </header>
        <main className="flex-1 px-6 py-6">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </body>
    </html>
  );
}
