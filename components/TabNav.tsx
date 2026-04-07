"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, FileText, Settings } from "lucide-react";

const tabs = [
  { href: "/proposals", label: "지출품의서", icon: ClipboardList },
  { href: "/", label: "지출결의서", icon: FileText },
];

export default function TabNav() {
  const pathname = usePathname();

  return (
    <header
      style={{ background: "linear-gradient(135deg, var(--nav), var(--nav-2))" }}
      className="sticky top-0 z-50 border-b border-white/10 text-white shadow-xl"
    >
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-5 py-4">
        <div>
          <div className="font-[family-name:var(--font-display)] text-2xl">Soilab Docs</div>
          <div className="text-xs text-white/60">협동조합 소이랩 문서 관리 시스템</div>
        </div>

        <nav className="flex items-center gap-2 rounded-full bg-white/8 p-1">
          {tabs.map((tab) => {
            const active =
              pathname === tab.href ||
              pathname.startsWith(`${tab.href === "/" ? "" : tab.href}/preview`) ||
              pathname.startsWith(`${tab.href === "/" ? "" : tab.href}/batch-preview`);
            const Icon = tab.icon;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm ${
                  active ? "bg-white text-slate-900" : "text-white/72 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <Link href="/settings" className="flex items-center gap-2 text-sm text-white/75 hover:text-white">
          <Settings className="h-4 w-4" />
          설정
        </Link>
      </div>
    </header>
  );
}
