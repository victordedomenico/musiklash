"use client";

import type { SmashPassItemData, SmashPassItemType } from "@/lib/smash-pass";

type Props = {
  item: SmashPassItemData;
  itemType: SmashPassItemType;
  onPreview?: () => void;
  isPreviewPlaying?: boolean;
};

export default function SmashPassGameCard({
  item,
  itemType,
  onPreview,
  isPreviewPlaying,
}: Props) {
  return (
    <div
      className="relative mx-auto w-full max-w-sm"
      style={{ perspective: "1000px" }}
    >
      <div
        className="relative overflow-hidden rounded-2xl border border-[color:var(--border)] shadow-[0_0_40px_rgba(59,130,246,0.25)]"
        style={{ transform: "rotateY(-4deg) rotateX(2deg)" }}
      >
        <div className="relative aspect-[3/4] w-full">
          {item.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.coverUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-[color:var(--surface-2)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <h2 className="text-2xl font-black text-white drop-shadow-lg">
              {item.title}
            </h2>
            {item.subtitle ? (
              <p className="mt-1 text-sm text-white/80">{item.subtitle}</p>
            ) : null}
            {item.tags.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {item.tags.slice(0, 4).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
            {item.description ? (
              <p className="mt-3 line-clamp-3 text-sm text-white/70">
                {item.description}
              </p>
            ) : null}
          </div>
        </div>
        {onPreview && (item.previewUrl || itemType !== "track") ? (
          <button
            type="button"
            onClick={onPreview}
            className="absolute right-3 top-3 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm hover:bg-black/70"
          >
            {isPreviewPlaying ? "Pause" : "Écouter"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
