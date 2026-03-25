import type { Metadata } from "next";
import { Playfair_Display, Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import TabNav from "@/components/TabNav";

const display = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
});

const sans = Noto_Sans_KR({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "soilab 문서 관리 시스템",
  description: "지출결의서와 지출품의서를 한 앱에서 관리합니다.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={`${display.variable} ${sans.variable}`}>
      <body>
        <div className="site-shell">
          <TabNav />
          <main className="page-shell">{children}</main>
        </div>
      </body>
    </html>
  );
}
