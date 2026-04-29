import type { Metadata } from "next";
import { Playfair_Display, Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import TabNav from "@/components/TabNav";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://dadareum.soilab-youth.kr";

const display = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
});

const sans = Noto_Sans_KR({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  applicationName: "청년 다다름 사업 관리 시스템",
  title: "청년 다다름 사업 관리 시스템",
  description: "협동조합 소이랩 2026년 청년 다다름 사업 관리 시스템입니다.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "청년 다다름 사업 관리 시스템",
    description: "협동조합 소이랩 2026년 청년 다다름 사업 관리 시스템입니다.",
    url: appUrl,
    siteName: "청년 다다름 사업 관리 시스템",
    locale: "ko_KR",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" suppressHydrationWarning className={`${display.variable} ${sans.variable}`}>
      <body>
        <div className="site-shell">
          <TabNav />
          <main className="page-shell">{children}</main>
        </div>
      </body>
    </html>
  );
}
