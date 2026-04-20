"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  Library,
  Music,
  Swords,
  Users,
  User,
  Zap,
} from "lucide-react";

export type CreateHubLabels = {
  chooseMode: string;
  back: string;
  bracket: string;
  bracketDesc: string;
  tierlist: string;
  tierlistDesc: string;
  blindtest: string;
  blindtestDesc: string;
  battleFeat: string;
  battleFeatDesc: string;
  modeSolo: string;
  modeSoloDesc: string;
  modeSoloAi: string;
  modeSoloAiDesc: string;
  modeMulti: string;
  modeMultiDesc: string;
};

type Step = "main" | "blindtest" | "battlefeat";

const MAIN_OPTIONS = [
  {
    key: "bracket" as const,
    href: "/create-bracket",
    icon: Swords,
    accent: "#f59e0b",
    bg: "rgba(245,158,11,0.12)",
    hasSubMenu: false,
  },
  {
    key: "tierlist" as const,
    href: "/create-tierlist",
    icon: Library,
    accent: "#3b82f6",
    bg: "rgba(59,130,246,0.12)",
    hasSubMenu: false,
  },
  {
    key: "blindtest" as const,
    href: null,
    icon: Music,
    accent: "#ef4444",
    bg: "rgba(239,68,68,0.12)",
    hasSubMenu: true,
    step: "blindtest" as Step,
  },
  {
    key: "battlefeat" as const,
    href: null,
    icon: Zap,
    accent: "#ff3b74",
    bg: "rgba(255,59,116,0.12)",
    hasSubMenu: true,
    step: "battlefeat" as Step,
  },
] as const;

type BlindtestMode = {
  icon: typeof User;
  label: string;
  desc: string;
  href: string;
  accent: string;
  bg: string;
};
type BattlefeatMode = BlindtestMode;

export default function CreateHub({ labels }: { labels: CreateHubLabels }) {
  const [step, setStep] = useState<Step>("main");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && step !== "main") setStep("main");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [step]);

  const blindtestModes: BlindtestMode[] = [
    {
      icon: User,
      label: labels.modeSolo,
      desc: labels.modeSoloDesc,
      href: "/create-blindtest?mode=solo",
      accent: "#ef4444",
      bg: "rgba(239,68,68,0.12)",
    },
    {
      icon: Users,
      label: labels.modeMulti,
      desc: labels.modeMultiDesc,
      href: "/create-blindtest?mode=multi",
      accent: "#3b82f6",
      bg: "rgba(59,130,246,0.12)",
    },
  ];

  const battlefeatModes: BattlefeatMode[] = [
    {
      icon: User,
      label: labels.modeSolo,
      desc: labels.modeSoloDesc,
      href: "/battle-feat/free",
      accent: "#ef4444",
      bg: "rgba(239,68,68,0.12)",
    },
    {
      icon: Bot,
      label: labels.modeSoloAi,
      desc: labels.modeSoloAiDesc,
      href: "/battle-feat/solo",
      accent: "#ff3b74",
      bg: "rgba(255,59,116,0.12)",
    },
    {
      icon: Users,
      label: labels.modeMulti,
      desc: labels.modeMultiDesc,
      href: "/battle-feat/room/new",
      accent: "#3b82f6",
      bg: "rgba(59,130,246,0.12)",
    },
  ];

  const mainLabel: Record<(typeof MAIN_OPTIONS)[number]["key"], string> = {
    bracket: labels.bracket,
    tierlist: labels.tierlist,
    blindtest: labels.blindtest,
    battlefeat: labels.battleFeat,
  };
  const mainDesc: Record<(typeof MAIN_OPTIONS)[number]["key"], string> = {
    bracket: labels.bracketDesc,
    tierlist: labels.tierlistDesc,
    blindtest: labels.blindtestDesc,
    battlefeat: labels.battleFeatDesc,
  };

  const ModeCard = ({ item }: { item: BlindtestMode | BattlefeatMode }) => {
    const Icon = item.icon;
    return (
      <Link
        href={item.href}
        className="flex items-center gap-4 rounded-2xl border p-4 transition hover:-translate-y-0.5"
        style={{
          borderColor: "var(--border)",
          background: "var(--surface-2)",
          color: "var(--foreground)",
          textDecoration: "none",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.background = item.bg;
          (e.currentTarget as HTMLAnchorElement).style.borderColor = `${item.accent}55`;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.background = "var(--surface-2)";
          (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--border)";
        }}
      >
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: item.bg, color: item.accent }}
        >
          <Icon size={20} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold" style={{ color: "var(--foreground)" }}>
            {item.label}
          </p>
          <p className="mt-0.5 truncate text-xs" style={{ color: "var(--muted)" }}>
            {item.desc}
          </p>
        </div>
      </Link>
    );
  };

  const subTitle = step === "blindtest" ? labels.blindtest : labels.battleFeat;

  return (
    <div
      className="rounded-[28px] border p-5 sm:p-8"
      style={{
        borderColor: "var(--border-strong)",
        background: "var(--surface-2)",
        boxShadow: "0 24px 48px rgba(0,0,0,0.28)",
      }}
    >
      {step !== "main" && (
        <div className="mb-6 flex flex-wrap items-center gap-2 sm:mb-8">
          <button
            type="button"
            onClick={() => setStep("main")}
            className="btn-ghost shrink-0"
            style={{ padding: "0.35rem", width: "2rem", height: "2rem" }}
            aria-label={labels.back}
          >
            <ArrowLeft size={15} />
          </button>
          <p
            className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 text-xl font-black tracking-tight sm:text-2xl"
            style={{ color: "var(--foreground)" }}
          >
            {subTitle}
            <span className="text-sm font-semibold" style={{ color: "var(--muted)" }}>
              — {labels.chooseMode}
            </span>
          </p>
        </div>
      )}

      {step === "main" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {MAIN_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const commonStyle = {
              borderColor: "var(--border)",
              background: "var(--surface)",
              color: "var(--foreground)",
              textDecoration: "none",
            } as React.CSSProperties;

            const hoverIn = (el: HTMLElement) => {
              el.style.background = opt.bg;
              el.style.borderColor = `${opt.accent}55`;
            };
            const hoverOut = (el: HTMLElement) => {
              el.style.background = "var(--surface)";
              el.style.borderColor = "var(--border)";
            };

            const inner = (
              <>
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{ background: opt.bg, color: opt.accent }}
                >
                  <Icon size={22} />
                </span>
                <div>
                  <p className="text-base font-bold" style={{ color: "var(--foreground)" }}>
                    {mainLabel[opt.key]}
                  </p>
                  <p className="mt-1 text-sm leading-snug" style={{ color: "var(--muted)" }}>
                    {mainDesc[opt.key]}
                  </p>
                </div>
              </>
            );

            if (opt.hasSubMenu) {
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setStep(opt.step)}
                  className="flex min-h-[140px] flex-col justify-center gap-4 rounded-2xl border p-5 text-left transition hover:-translate-y-0.5 sm:min-h-[160px]"
                  style={commonStyle}
                  onMouseEnter={(e) => hoverIn(e.currentTarget)}
                  onMouseLeave={(e) => hoverOut(e.currentTarget)}
                >
                  {inner}
                </button>
              );
            }

            return (
              <Link
                key={opt.key}
                href={opt.href!}
                className="flex min-h-[140px] flex-col justify-center gap-4 rounded-2xl border p-5 transition hover:-translate-y-0.5 sm:min-h-[160px]"
                style={commonStyle}
                onMouseEnter={(e) => hoverIn(e.currentTarget)}
                onMouseLeave={(e) => hoverOut(e.currentTarget)}
              >
                {inner}
              </Link>
            );
          })}
        </div>
      )}

      {step === "blindtest" && (
        <div className="mx-auto flex max-w-xl flex-col gap-3">
          {blindtestModes.map((m) => (
            <ModeCard key={`${m.href}-${m.label}`} item={m} />
          ))}
        </div>
      )}

      {step === "battlefeat" && (
        <div className="mx-auto flex max-w-xl flex-col gap-3">
          {battlefeatModes.map((m) => (
            <ModeCard key={`${m.href}-${m.label}`} item={m} />
          ))}
        </div>
      )}
    </div>
  );
}
