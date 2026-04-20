"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CirclePlus,
  House,
  Library,
  Search,
  type LucideIcon,
} from "lucide-react";

type IconName = "home" | "search" | "create" | "library" | "guide";

type NavItem = {
  href: string;
  label: string;
  icon: IconName;
};

type SidebarNavLinksProps = {
  links: readonly NavItem[];
};

const iconMap: Record<IconName, LucideIcon> = {
  home: House,
  search: Search,
  create: CirclePlus,
  library: Library,
  guide: BookOpen,
};

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function SidebarNavLinks({ links }: Readonly<SidebarNavLinksProps>) {
  const pathname = usePathname();

  return (
    <div className="space-y-1.5">
      {links.map(({ href, label, icon }) => {
        const Icon = iconMap[icon];
        const active = isActivePath(pathname, href);

        return (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[0.95rem] transition sm:px-4 sm:py-3 sm:text-[1.02rem]"
            style={{
              color: active ? "var(--foreground)" : "var(--muted-strong)",
              background: active ? "var(--surface-2)" : "transparent",
              border: active
                ? "1px solid var(--border-strong)"
                : "1px solid transparent",
            }}
          >
            <Icon size={18} strokeWidth={1.9} />
            <span className={active ? "font-semibold" : "font-medium"}>{label}</span>
          </Link>
        );
      })}
    </div>
  );
}


