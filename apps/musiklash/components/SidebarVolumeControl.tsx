"use client";

import { Volume2 } from "lucide-react";
import { usePreviewVolume } from "@/lib/audio-volume";

type SidebarVolumeControlProps = {
  label: string;
};

export default function SidebarVolumeControl({ label }: Readonly<SidebarVolumeControlProps>) {
  const { volume, setVolume } = usePreviewVolume();
  const percent = Math.round(volume * 100);

  return (
    <div
      className="mt-5 rounded-2xl border px-3 py-3"
      style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
    >
      <div className="mb-2 flex items-center justify-between text-sm">
        <p className="flex items-center gap-2 font-medium" style={{ color: "var(--foreground)" }}>
          <Volume2 size={15} />
          {label}
        </p>
        <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--muted)" }}>
          {percent}%
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={percent}
        onChange={(event) => setVolume(Number(event.target.value) / 100)}
        aria-label={label}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[color:var(--surface)] accent-[color:var(--accent)]"
      />
    </div>
  );
}
