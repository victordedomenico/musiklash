"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Search,
  Plus,
  X,
  ChevronLeft,
  Check,
  Footprints,
  Flame,
  Layers,
  Store,
} from "lucide-react";

const SNEAKER_BRANDS = [
  { slug: "Nike",         label: "Nike",         logo: "https://logo.clearbit.com/nike.com" },
  { slug: "Jordan",       label: "Air Jordan",   logo: "https://logo.clearbit.com/jordan.com" },
  { slug: "Adidas",       label: "Adidas",       logo: "https://logo.clearbit.com/adidas.com" },
  { slug: "Yeezy",        label: "Yeezy",        logo: "https://logo.clearbit.com/adidas.com" },
  { slug: "New Balance",  label: "New Balance",  logo: "https://logo.clearbit.com/newbalance.com" },
  { slug: "Converse",     label: "Converse",     logo: "https://logo.clearbit.com/converse.com" },
  { slug: "Vans",         label: "Vans",         logo: "https://logo.clearbit.com/vans.com" },
  { slug: "Puma",         label: "Puma",         logo: "https://logo.clearbit.com/puma.com" },
  { slug: "Reebok",       label: "Reebok",       logo: "https://logo.clearbit.com/reebok.com" },
  { slug: "Asics",        label: "Asics",        logo: "https://logo.clearbit.com/asics.com" },
  { slug: "Under Armour", label: "Under Armour", logo: "https://logo.clearbit.com/underarmour.com" },
  { slug: "Saucony",      label: "Saucony",      logo: "https://logo.clearbit.com/saucony.com" },
  { slug: "Hoka",         label: "Hoka",         logo: "https://logo.clearbit.com/hoka.com" },
  { slug: "On",           label: "On Running",   logo: "https://logo.clearbit.com/on-running.com" },
  { slug: "Salomon",      label: "Salomon",      logo: "https://logo.clearbit.com/salomon.com" },
  { slug: "Balenciaga",   label: "Balenciaga",   logo: "https://logo.clearbit.com/balenciaga.com" },
];
import type { ContentCollection, ContentEntity, ContentItem } from "@klash/content-adapter";
import { withSearchQuery } from "@/lib/api-url";

export type SelectedItem = {
  external_id: string;
  title: string;
  subtitle?: string;
  cover_url: string | null;
  preview_url?: string | null;
  source?: string;
  metadata?: Record<string, unknown>;
};

type Tab = "colorway" | "drop" | "model" | "brand";

type Props = {
  size: number;
  selected: SelectedItem[];
  onChange: (next: SelectedItem[]) => void;
  freeMode?: boolean;
};

function useDebouncedSearch(
  endpoint: string,
  query: string,
  enabled: boolean,
): { results: ContentItem[]; loading: boolean } {
  const [results, setResults] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const trimmed = query.trim();
  const active = Boolean(trimmed && enabled);

  useEffect(() => {
    if (!active) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(withSearchQuery(endpoint, trimmed), { signal: ctrl.signal });
        const json = await res.json();
        setResults(json.results ?? []);
      } catch (e) {
        if ((e as { name?: string }).name !== "AbortError") console.error(e);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => {
      ctrl.abort();
      clearTimeout(timer);
    };
  }, [trimmed, endpoint, active]);

  return { results: active ? results : [], loading: active ? loading : false };
}

function itemToSelected(item: ContentItem): SelectedItem {
  return {
    external_id: item.id,
    title: item.title,
    subtitle: item.subtitle,
    cover_url: item.coverUrl ?? null,
    preview_url: null,
    source: "sneaks",
    metadata: { itemKind: item.metadata?.itemKind ?? "colorway", ...item.metadata },
  };
}

export default function SneakerPicker({ size, selected, onChange, freeMode = false }: Props) {
  const [tab, setTab] = useState<Tab>("colorway");
  const [query, setQuery] = useState("");
  const [openedDrop, setOpenedDrop] = useState<ContentCollection | null>(null);
  const [openedModel, setOpenedModel] = useState<ContentEntity | null>(null);
  const [openedBrand, setOpenedBrand] = useState<typeof SNEAKER_BRANDS[0] | null>(null);
  const [dropItems, setDropItems] = useState<ContentItem[]>([]);
  const [modelItems, setModelItems] = useState<ContentItem[]>([]);
  const [brandItems, setBrandItems] = useState<ContentItem[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { results: colorwayResults, loading: colorwayLoading } = useDebouncedSearch(
    "/api/content/search?kind=items",
    query,
    tab === "colorway",
  );

  const { results: dropResults, loading: dropLoading } = useDebouncedSearch(
    "/api/content/search?kind=collections",
    query,
    tab === "drop" && !openedDrop,
  );

  const { results: modelResults, loading: modelLoading } = useDebouncedSearch(
    "/api/content/search?kind=entities",
    query,
    tab === "model" && !openedModel,
  );

  const max = freeMode ? Infinity : size;
  const isSelected = (id: string) => selected.some((s) => s.external_id === id);

  const addItem = (item: ContentItem) => {
    if (selected.length >= max || isSelected(item.id)) return;
    onChange([...selected, itemToSelected(item)]);
  };

  const removeItem = (id: string) => {
    onChange(selected.filter((s) => s.external_id !== id));
  };

  const openDrop = async (col: ContentCollection) => {
    setOpenedDrop(col);
    setOpenedModel(null);
    setDrillLoading(true);
    setDropItems([]);
    try {
      const res = await fetch(`/api/content/collection/${col.id}/items`);
      const json = await res.json();
      setDropItems(json.items ?? json.results ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setDrillLoading(false);
    }
  };

  const openModel = async (entity: ContentEntity) => {
    setOpenedModel(entity);
    setOpenedDrop(null);
    setDrillLoading(true);
    setModelItems([]);
    try {
      const res = await fetch(`/api/content/entity/${entity.id}/items?limit=50`);
      const json = await res.json();
      setModelItems(json.items ?? json.results ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setDrillLoading(false);
    }
  };

  const openBrand = async (brand: typeof SNEAKER_BRANDS[0]) => {
    setOpenedBrand(brand);
    setDrillLoading(true);
    setBrandItems([]);
    const slug = brand.slug.toLowerCase().replace(/\s+/g, "-");
    try {
      const res = await fetch(`/api/content/entity/brand-${slug}/items?limit=40`);
      const json = await res.json();
      setBrandItems(json.items ?? json.results ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setDrillLoading(false);
    }
  };

  const tabs: { key: Tab; label: string; icon: typeof Footprints }[] = [
    { key: "colorway", label: "Colorways", icon: Footprints },
    { key: "brand", label: "Marques", icon: Store },
    { key: "drop", label: "Drops", icon: Flame },
    { key: "model", label: "Modèles", icon: Layers },
  ];

  const modelEntities = (modelResults as unknown as ContentEntity[]).filter((e) =>
    e.id.startsWith("brand-"),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            className="btn-chip"
            data-active={tab === key}
            onClick={() => {
              setTab(key);
              setOpenedDrop(null);
              setOpenedModel(null);
              setOpenedBrand(null);
              setDropItems([]);
              setModelItems([]);
              setBrandItems([]);
              setQuery("");
            }}
          >
            <Icon size={14} className="inline mr-1.5 -mt-0.5" />
            {label}
          </button>
        ))}
      </div>

      {(openedDrop || openedModel || openedBrand) && (
        <button
          type="button"
          className="btn-ghost text-sm inline-flex items-center gap-1"
          onClick={() => {
            setOpenedDrop(null);
            setOpenedModel(null);
            setOpenedBrand(null);
            setDropItems([]);
            setModelItems([]);
            setBrandItems([]);
          }}
        >
          <ChevronLeft size={16} />
          Retour à la recherche
        </button>
      )}

      {!openedDrop && !openedModel && !openedBrand && (
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--muted)]"
          />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              tab === "colorway"
                ? "Rechercher une colorway…"
                : tab === "drop"
                  ? "Rechercher un drop…"
                  : tab === "brand"
                    ? "Rechercher une marque…"
                    : "Rechercher un modèle…"
            }
            className="input w-full pl-10"
          />
        </div>
      )}

      <div className="min-h-[200px] space-y-2">
        {tab === "colorway" &&
          colorwayResults.map((item) => (
            <ResultRow
              key={item.id}
              title={item.title}
              subtitle={item.subtitle}
              coverUrl={item.coverUrl}
              selected={isSelected(item.id)}
              onAdd={() => addItem(item)}
            />
          ))}

        {tab === "brand" && !openedBrand && (
          <div className="grid grid-cols-2 gap-2">
            {SNEAKER_BRANDS.map((brand) => (
              <BrandButton key={brand.slug} brand={brand} onClick={() => void openBrand(brand)} />
            ))}
          </div>
        )}

        {tab === "brand" && openedBrand && (
          <>
            <div className="flex items-center gap-2">
              <BrandLogo brand={openedBrand} size={24} />
              <p className="text-sm font-medium text-[color:var(--muted)]">{openedBrand.label}</p>
            </div>
            {drillLoading && <p className="text-sm text-[color:var(--muted)]">Chargement…</p>}
            {!drillLoading && brandItems.length === 0 && (
              <p className="text-sm text-[color:var(--muted)]">Aucun modèle trouvé.</p>
            )}
            {brandItems.map((item) => (
              <ResultRow key={item.id} title={item.title} subtitle={item.subtitle}
                coverUrl={item.coverUrl} selected={isSelected(item.id)} onAdd={() => addItem(item)} />
            ))}
          </>
        )}

        {tab === "drop" &&
          !openedDrop &&
          (dropResults as unknown as ContentCollection[]).map((col) => (
            <button
              key={col.id}
              type="button"
              className="w-full flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-3 text-left hover:bg-[color:var(--surface-hover)]"
              onClick={() => void openDrop(col)}
            >
              {col.coverUrl ? (
                <Image
                  src={col.coverUrl}
                  alt=""
                  width={48}
                  height={72}
                  className="rounded-md object-cover"
                />
              ) : (
                <div className="w-12 h-[72px] rounded-md bg-[color:var(--surface-2)]" />
              )}
              <div>
                <p className="font-semibold">{col.title}</p>
                <p className="text-xs text-[color:var(--muted)]">Voir la colorway</p>
              </div>
            </button>
          ))}

        {tab === "drop" && openedDrop && (
          <>
            <p className="text-sm font-medium text-[color:var(--muted)]">{openedDrop.title}</p>
            {drillLoading && <p className="text-sm text-[color:var(--muted)]">Chargement…</p>}
            {dropItems.map((item) => (
              <ResultRow
                key={item.id}
                title={item.title}
                subtitle={item.subtitle}
                coverUrl={item.coverUrl}
                selected={isSelected(item.id)}
                onAdd={() => addItem(item)}
              />
            ))}
          </>
        )}

        {tab === "model" &&
          !openedModel &&
          modelEntities.map((entity) => (
            <button
              key={entity.id}
              type="button"
              className="w-full flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-3 text-left hover:bg-[color:var(--surface-hover)]"
              onClick={() => void openModel(entity)}
            >
              {entity.pictureUrl ? (
                <Image
                  src={entity.pictureUrl}
                  alt=""
                  width={48}
                  height={48}
                  className="rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[color:var(--surface-2)] flex items-center justify-center shrink-0">
                  <Layers size={20} className="text-[color:var(--accent)]" />
                </div>
              )}
              <div>
                <p className="font-semibold">{entity.name}</p>
                <p className="text-xs text-[color:var(--muted)]">Colorways de la marque</p>
              </div>
            </button>
          ))}

        {tab === "model" && openedModel && (
          <>
            <p className="text-sm font-medium">{openedModel.name}</p>
            {drillLoading && <p className="text-sm text-[color:var(--muted)]">Chargement…</p>}
            {modelItems.map((item) => (
              <ResultRow
                key={item.id}
                title={item.title}
                subtitle={item.subtitle}
                coverUrl={item.coverUrl}
                selected={isSelected(item.id)}
                onAdd={() => addItem(item)}
              />
            ))}
          </>
        )}

        {(colorwayLoading || dropLoading || modelLoading) && (
          <p className="text-sm text-[color:var(--muted)]">Recherche…</p>
        )}
      </div>

      {selected.length > 0 && (
        <div className="space-y-2 border-t border-[color:var(--border)] pt-4">
          <p className="text-sm font-medium">
            Sélection ({selected.length}
            {!freeMode ? ` / ${size}` : ""})
          </p>
          <ul className="flex flex-wrap gap-2">
            {selected.map((item) => (
              <li
                key={item.external_id}
                className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] px-3 py-1.5 text-sm"
              >
                <span className="max-w-[180px] truncate">{item.title}</span>
                <button
                  type="button"
                  aria-label={`Retirer ${item.title}`}
                  onClick={() => removeItem(item.external_id)}
                  className="text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function BrandLogo({ brand, size = 32 }: { brand: { label: string; logo: string }; size?: number }) {
  const [failed, setFailed] = useState(false);
  return (
    <div
      className="rounded bg-white flex items-center justify-center overflow-hidden border border-[color:var(--border)] shrink-0"
      style={{ width: size, height: size }}
    >
      {!failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={brand.logo} alt={brand.label} className="w-full h-full object-contain p-0.5"
          onError={() => setFailed(true)} />
      ) : (
        <span className="text-[10px] font-bold text-[color:var(--muted)] leading-none text-center px-0.5">
          {brand.label.slice(0, 2).toUpperCase()}
        </span>
      )}
    </div>
  );
}

function BrandButton({ brand, onClick }: { brand: typeof SNEAKER_BRANDS[0]; onClick: () => void }) {
  return (
    <button
      type="button"
      className="flex items-center gap-2 rounded-xl border border-[color:var(--border)] p-3 text-left hover:bg-[color:var(--surface-hover)]"
      onClick={onClick}
    >
      <BrandLogo brand={brand} size={32} />
      <span className="font-medium text-sm truncate flex-1">{brand.label}</span>
      <ChevronLeft size={14} className="rotate-180 text-[color:var(--muted)] shrink-0" />
    </button>
  );
}

function ResultRow({
  title,
  subtitle,
  coverUrl,
  selected,
  onAdd,
}: {
  title: string;
  subtitle?: string;
  coverUrl?: string | null;
  selected: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-3">
      {coverUrl ? (
        <Image src={coverUrl} alt="" width={40} height={60} className="rounded object-cover shrink-0" />
      ) : (
        <div className="w-10 h-[60px] rounded bg-[color:var(--surface-2)] shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-medium truncate">{title}</p>
        {subtitle && <p className="text-xs text-[color:var(--muted)]">{subtitle}</p>}
      </div>
      <button
        type="button"
        disabled={selected}
        onClick={onAdd}
        className="btn-ghost shrink-0 p-2"
        aria-label={selected ? "Déjà sélectionné" : `Ajouter ${title}`}
      >
        {selected ? <Check size={18} className="text-[color:var(--accent)]" /> : <Plus size={18} />}
      </button>
    </div>
  );
}
