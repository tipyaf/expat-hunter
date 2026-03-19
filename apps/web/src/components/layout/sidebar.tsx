"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "/", icon: "LayoutDashboard" },
  { label: "Profil", href: "/profil", icon: "User" },
  { label: "Sourcing", href: "/sourcing", icon: "Search" },
  { label: "Contacts", href: "/contacts", icon: "Users" },
  { label: "Emails", href: "/emails", icon: "Mail" },
  { label: "Pipeline", href: "/pipeline", icon: "GitBranch" },
  { label: "Parametres", href: "/parametres", icon: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-[var(--color-border)] bg-surface-light dark:bg-surface-dark">
      <div className="flex h-16 items-center px-6 border-b border-[var(--color-border)]">
        <Link href="/" className="text-xl font-bold text-primary">
          ExpatHunter
        </Link>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-[var(--color-text-muted)] hover:bg-primary/5 hover:text-[var(--color-text)]"
              }`}
            >
              <span className="w-5 h-5 flex items-center justify-center text-xs">
                {item.icon.charAt(0)}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
