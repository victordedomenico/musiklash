"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import LocaleToggle from "@/components/LocaleToggle";
import { BrandMark } from "@/components/BrandLogo";

type MobileNavDrawerProps = {
  theme: "dark" | "light";
  locale: "fr" | "en";
  tagline: string;
  ariaOpenMenu: string;
  ariaCloseMenu: string;
  navigationLabel: string;
  children: React.ReactNode;
};

export default function MobileNavDrawer({
  theme,
  locale,
  tagline,
  ariaOpenMenu,
  ariaCloseMenu,
  navigationLabel,
  children,
}: Readonly<MobileNavDrawerProps>) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    queueMicrotask(() => setOpen(false));
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <>
      <div className="sticky top-2 z-30 lg:hidden">
        <div
          className="site-sidebar flex items-center justify-between rounded-2xl border px-3 py-2.5"
          style={{ borderColor: "var(--border-strong)" }}
        >
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <BrandMark size={36} />
            <div className="min-w-0">
              <p className="truncate text-base font-black leading-none" style={{ color: "var(--foreground)" }}>
                MusiKlash
              </p>
              <p
                className="truncate text-[0.62rem] font-semibold uppercase tracking-[0.2em]"
                style={{ color: "var(--muted)" }}
              >
                {tagline}
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle current={theme} />
            <LocaleToggle current={locale} />
            <button
              type="button"
              aria-expanded={open}
              aria-controls="mobile-nav-drawer"
              aria-label={open ? ariaCloseMenu : ariaOpenMenu}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-[color,background-color]"
              style={{
                borderColor: "var(--border)",
                background: "var(--surface-2)",
                color: "var(--foreground)",
              }}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X size={16} aria-hidden /> : <Menu size={16} aria-hidden />}
            </button>
          </div>
        </div>
      </div>

      <div
        className={`fixed inset-0 z-[100] lg:hidden ${open ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        <div
          className={`absolute inset-0 bg-black/55 transition-opacity duration-300 ease-out ${
            open ? "opacity-100" : "opacity-0"
          }`}
          onClick={close}
        />
        <aside
          id="mobile-nav-drawer"
          role="dialog"
          aria-modal="true"
          aria-label={navigationLabel}
          className={`site-sidebar absolute inset-y-0 left-0 flex w-[min(85vw,22rem)] max-w-[85vw] flex-col border-r shadow-2xl transition-transform duration-300 ease-out ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
          style={{ borderColor: "var(--border-strong)" }}
        >
          <div
            className="flex shrink-0 items-center justify-between border-b px-4 py-3"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex min-w-0 items-center gap-3">
              <BrandMark size={40} />
              <div className="min-w-0">
                <p className="truncate text-lg font-black leading-none" style={{ color: "var(--foreground)" }}>
                  MusiKlash
                </p>
                <p
                  className="truncate text-[0.62rem] font-semibold uppercase tracking-[0.2em]"
                  style={{ color: "var(--muted)" }}
                >
                  {tagline}
                </p>
              </div>
            </div>
            <button
              type="button"
              aria-label={ariaCloseMenu}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-[color,background-color]"
              style={{
                borderColor: "var(--border)",
                background: "var(--surface-2)",
                color: "var(--foreground)",
              }}
              onClick={close}
            >
              <X size={18} aria-hidden />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">{children}</div>
        </aside>
      </div>
    </>
  );
}
