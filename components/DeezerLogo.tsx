"use client";

import Image from "next/image";
import { useSyncExternalStore } from "react";

/** Logos officiels Deezer — noir sur fond clair, blanc sur fond sombre. */
const LOGO_SOURCES = {
  horizontal: {
    light: "/deezer/logo-horizontal-black.png",
    dark: "/deezer/logo-horizontal-white.png",
  },
  vertical: {
    light: "/deezer/logo-vertical-black.png",
    dark: "/deezer/logo-vertical-white.png",
  },
  icon: {
    light: "/deezer/logo-icon-dark.png",
    dark: "/deezer/logo-icon-dark.png",
  },
} as const;

const ASPECT_RATIO = {
  horizontal: 390 / 90,
  vertical: 0.55,
  icon: 1,
} as const;

export type DeezerLogoVariant = keyof typeof LOGO_SOURCES;

type DeezerLogoProps = {
  variant?: DeezerLogoVariant;
  height?: number;
  className?: string;
};

function readTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function subscribeTheme(onStoreChange: () => void) {
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

export function DeezerLogo({
  variant = "horizontal",
  height = 28,
  className = "",
}: DeezerLogoProps) {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, (): "light" | "dark" => "dark");
  const src = LOGO_SOURCES[variant][theme];
  const width = Math.round(height * ASPECT_RATIO[variant]);
  const useDarkBackdrop = theme === "dark";

  return (
    <span
      className={`inline-flex items-center justify-center ${
        useDarkBackdrop ? "rounded-md bg-black px-2 py-1" : ""
      } ${className}`}
      data-deezer-logo={variant}
      data-deezer-theme={theme}
    >
      <Image
        src={src}
        alt="Deezer"
        width={width}
        height={height}
        className="h-auto w-auto"
        style={{ height, width: "auto", maxWidth: width }}
        priority={variant === "horizontal"}
      />
    </span>
  );
}
