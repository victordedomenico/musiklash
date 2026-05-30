"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Search, Plus, X, ChevronLeft, Check, UtensilsCrossed, Tag, Globe, Apple, Carrot, ShoppingBasket, Fish, Beef, Store } from "lucide-react";
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

type Tab = "meal" | "category" | "cuisine" | "ingredient" | "fruit" | "vegetable" | "fish" | "meat" | "fastfood";

const FAST_FOOD_CHAINS = [
  { slug: "mcdonald-s",     label: "McDonald's",     logo: "https://logo.clearbit.com/mcdonalds.com" },
  { slug: "burger-king",    label: "Burger King",    logo: "https://logo.clearbit.com/burgerking.com" },
  { slug: "quick",          label: "Quick",          logo: "https://logo.clearbit.com/quick.be" },
  { slug: "kfc",            label: "KFC",            logo: "https://logo.clearbit.com/kfc.com" },
  { slug: "subway",         label: "Subway",         logo: "https://logo.clearbit.com/subway.com" },
  { slug: "domino-s-pizza", label: "Domino's Pizza", logo: "https://logo.clearbit.com/dominos.com" },
  { slug: "pizza-hut",      label: "Pizza Hut",      logo: "https://logo.clearbit.com/pizzahut.com" },
  { slug: "five-guys",      label: "Five Guys",      logo: "https://logo.clearbit.com/fiveguys.com" },
  { slug: "buffalo-grill",  label: "Buffalo Grill",  logo: "https://logo.clearbit.com/buffalo-grill.fr" },
  { slug: "taco-bell",      label: "Taco Bell",      logo: "https://logo.clearbit.com/tacobell.com" },
  { slug: "paul",           label: "Paul",           logo: "https://logo.clearbit.com/paul.fr" },
  { slug: "picard",         label: "Picard",         logo: "https://logo.clearbit.com/picard.fr" },
  { slug: "flunch",         label: "Flunch",         logo: "https://logo.clearbit.com/flunch.fr" },
  { slug: "courtepaille",   label: "Courtepaille",   logo: "https://logo.clearbit.com/courtepaille.com" },
  { slug: "kebab",          label: "O'Tacos",        logo: "https://logo.clearbit.com/otacos.fr" },
];

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

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || !enabled) return;
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
  }, [query, endpoint, enabled]);

  const visibleResults = query.trim() && enabled ? results : [];
  return { results: visibleResults, loading: query.trim() && enabled ? loading : false };
}

function itemToSelected(item: ContentItem): SelectedItem {
  return {
    external_id: item.id,
    title: item.title,
    subtitle: item.subtitle,
    cover_url: item.coverUrl ?? null,
    preview_url: null,
    source: "themealdb",
    metadata: { itemKind: item.metadata?.itemKind ?? "meal", ...item.metadata },
  };
}

export default function FoodPicker({ size, selected, onChange, freeMode = false }: Props) {
  const [tab, setTab] = useState<Tab>("meal");
  const [query, setQuery] = useState("");
  const [openedCategory, setOpenedCategory] = useState<ContentCollection | null>(null);
  const [openedCuisine, setOpenedCuisine] = useState<ContentEntity | null>(null);
  const [categoryMeals, setCategoryMeals] = useState<ContentItem[]>([]);
  const [cuisineMeals, setCuisineMeals] = useState<ContentItem[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { results: mealResults, loading: mealLoading } = useDebouncedSearch(
    "/api/content/search?kind=items",
    query,
    tab === "meal",
  );

  const { results: categoryResults, loading: categoryLoading } = useDebouncedSearch(
    "/api/content/search?kind=collections",
    query,
    tab === "category" && !openedCategory,
  );

  const { results: cuisineResults, loading: cuisineLoading } = useDebouncedSearch(
    "/api/content/search?kind=entities",
    query,
    tab === "cuisine" && !openedCuisine,
  );

  const { results: ingredientResults, loading: ingredientLoading } = useDebouncedSearch(
    "/api/content/search?kind=food-ingredient",
    query,
    tab === "ingredient",
  );

  const [fruitResults, setFruitResults] = useState<ContentItem[]>([]);
  const [fruitLoading, setFruitLoading] = useState(false);
  const [vegetableResults, setVegetableResults] = useState<ContentItem[]>([]);
  const [vegetableLoading, setVegetableLoading] = useState(false);
  const [fishResults, setFishResults] = useState<ContentItem[]>([]);
  const [fishLoading, setFishLoading] = useState(false);
  const [meatResults, setMeatResults] = useState<ContentItem[]>([]);
  const [meatLoading, setMeatLoading] = useState(false);
  const [openedChain, setOpenedChain] = useState<typeof FAST_FOOD_CHAINS[0] | null>(null);
  const [chainItems, setChainItems] = useState<ContentItem[]>([]);
  const [chainLoading, setChainLoading] = useState(false);

  useEffect(() => {
    if (tab !== "fruit") return;
    setFruitLoading(true);
    const q = query.trim();
    fetch(`/api/food/fruits${q ? `?q=${encodeURIComponent(q)}` : ""}`)
      .then((r) => r.json())
      .then((json) => setFruitResults(json.results ?? []))
      .catch(console.error)
      .finally(() => setFruitLoading(false));
  }, [tab, query]);

  useEffect(() => {
    if (tab !== "vegetable") return;
    setVegetableLoading(true);
    const q = query.trim();
    fetch(`/api/food/vegetables${q ? `?q=${encodeURIComponent(q)}` : ""}`)
      .then((r) => r.json())
      .then((json) => setVegetableResults(json.results ?? []))
      .catch(console.error)
      .finally(() => setVegetableLoading(false));
  }, [tab, query]);

  useEffect(() => {
    if (tab !== "fish") return;
    setFishLoading(true);
    const q = query.trim();
    fetch(`/api/food/fish${q ? `?q=${encodeURIComponent(q)}` : ""}`)
      .then((r) => r.json())
      .then((json) => setFishResults(json.results ?? []))
      .catch(console.error)
      .finally(() => setFishLoading(false));
  }, [tab, query]);

  useEffect(() => {
    if (tab !== "meat") return;
    setMeatLoading(true);
    const q = query.trim();
    fetch(`/api/food/meats${q ? `?q=${encodeURIComponent(q)}` : ""}`)
      .then((r) => r.json())
      .then((json) => setMeatResults(json.results ?? []))
      .catch(console.error)
      .finally(() => setMeatLoading(false));
  }, [tab, query]);

  const max = freeMode ? Infinity : size;
  const isSelected = (id: string) => selected.some((s) => s.external_id === id);

  const addItem = (item: ContentItem) => {
    if (selected.length >= max || isSelected(item.id)) return;
    onChange([...selected, itemToSelected(item)]);
  };

  const removeItem = (id: string) => {
    onChange(selected.filter((s) => s.external_id !== id));
  };

  useEffect(() => {
    if (!openedCategory) return;
    fetch(`/api/content/collection/${openedCategory.id}/items`)
      .then((r) => r.json())
      .then((json) => setCategoryMeals(json.items ?? json.results ?? []))
      .catch(console.error)
      .finally(() => setDrillLoading(false));
  }, [openedCategory]);

  useEffect(() => {
    if (!openedCuisine) return;
    fetch(`/api/content/entity/${openedCuisine.id}/items?limit=50`)
      .then((r) => r.json())
      .then((json) => setCuisineMeals(json.items ?? json.results ?? []))
      .catch(console.error)
      .finally(() => setDrillLoading(false));
  }, [openedCuisine]);

  const tabs: { key: Tab; label: string; icon: typeof UtensilsCrossed }[] = [
    { key: "meal", label: "Plats", icon: UtensilsCrossed },
    { key: "category", label: "Catégories", icon: Tag },
    { key: "cuisine", label: "Cuisines", icon: Globe },
    { key: "ingredient", label: "Aliments", icon: ShoppingBasket },
    { key: "fruit", label: "Fruits", icon: Apple },
    { key: "vegetable", label: "Légumes", icon: Carrot },
    { key: "fish", label: "Poissons", icon: Fish },
    { key: "meat", label: "Viandes", icon: Beef },
    { key: "fastfood", label: "Fast Food", icon: Store },
  ];

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
              setOpenedCategory(null);
              setOpenedCuisine(null);
              setOpenedChain(null);
              setChainItems([]);
              setQuery("");
            }}
          >
            <Icon size={14} className="inline mr-1.5 -mt-0.5" />
            {label}
          </button>
        ))}
      </div>

      {(openedCategory || openedCuisine || openedChain) && (
        <button
          type="button"
          className="btn-ghost text-sm inline-flex items-center gap-1"
          onClick={() => {
            setOpenedCategory(null);
            setOpenedCuisine(null);
            setOpenedChain(null);
            setChainItems([]);
          }}
        >
          <ChevronLeft size={16} />
          Retour à la recherche
        </button>
      )}

      {!openedCategory && !openedCuisine && (
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
              tab === "meal"
                ? "Rechercher un plat…"
                : tab === "category"
                  ? "Rechercher une catégorie…"
                  : tab === "cuisine"
                    ? "Rechercher une cuisine…"
                    : tab === "ingredient"
                      ? "Rechercher un aliment…"
                      : tab === "fruit"
                        ? "Banane, pomme, fraise…"
                        : tab === "vegetable"
                          ? "Concombre, aubergine, carotte…"
                          : tab === "fish"
                            ? "Saumon, thon, crevettes…"
                            : "Bœuf, agneau, poulet…"
            }
            className="input w-full pl-10"
          />
        </div>
      )}

      <div className="min-h-[200px] space-y-2">
        {tab === "meal" &&
          mealResults.map((item) => (
            <ResultRow
              key={item.id}
              title={item.title}
              subtitle={item.subtitle}
              coverUrl={item.coverUrl}
              selected={isSelected(item.id)}
              onAdd={() => addItem(item)}
            />
          ))}

        {tab === "category" && !openedCategory &&
          (categoryResults as unknown as ContentCollection[]).map((category) => (
            <button
              key={category.id}
              type="button"
              className="w-full flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-3 text-left hover:bg-[color:var(--surface-hover)]"
              onClick={() => {
                setDrillLoading(true);
                setOpenedCategory(category);
              }}
            >
              <div className="w-12 h-12 rounded-md bg-[color:var(--surface-2)] flex items-center justify-center">
                <Tag size={20} className="text-[color:var(--muted)]" />
              </div>
              <div>
                <p className="font-semibold">{category.title}</p>
                <p className="text-xs text-[color:var(--muted)]">Voir les plats de la catégorie</p>
              </div>
            </button>
          ))}

        {tab === "category" && openedCategory && (
          <>
            <p className="text-sm font-medium text-[color:var(--muted)]">{openedCategory.title}</p>
            {drillLoading && <p className="text-sm text-[color:var(--muted)]">Chargement…</p>}
            {categoryMeals.map((item) => (
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

        {tab === "cuisine" && !openedCuisine &&
          (cuisineResults as unknown as ContentEntity[]).map((cuisine) => (
            <button
              key={cuisine.id}
              type="button"
              className="w-full flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-3 text-left hover:bg-[color:var(--surface-hover)]"
              onClick={() => {
                setDrillLoading(true);
                setOpenedCuisine(cuisine);
              }}
            >
              <div className="w-12 h-12 rounded-full bg-[color:var(--surface-2)] flex items-center justify-center">
                <Globe size={20} className="text-[color:var(--muted)]" />
              </div>
              <div>
                <p className="font-semibold">{cuisine.name}</p>
                <p className="text-xs text-[color:var(--muted)]">Recettes de cette cuisine</p>
              </div>
            </button>
          ))}

        {tab === "cuisine" && openedCuisine && (
          <>
            <p className="text-sm font-medium">{openedCuisine.name}</p>
            {drillLoading && <p className="text-sm text-[color:var(--muted)]">Chargement…</p>}
            {cuisineMeals.map((item) => (
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

        {tab === "ingredient" &&
          ingredientResults.map((item) => (
            <ResultRow key={item.id} title={item.title} subtitle={item.subtitle}
              coverUrl={item.coverUrl} selected={isSelected(item.id)} onAdd={() => addItem(item)} unoptimized />
          ))}

        {tab === "fruit" &&
          fruitResults.map((item) => (
            <ResultRow key={item.id} title={item.title} subtitle={item.subtitle}
              coverUrl={item.coverUrl} selected={isSelected(item.id)} onAdd={() => addItem(item)} unoptimized />
          ))}

        {tab === "vegetable" &&
          vegetableResults.map((item) => (
            <ResultRow key={item.id} title={item.title} subtitle={item.subtitle}
              coverUrl={item.coverUrl} selected={isSelected(item.id)} onAdd={() => addItem(item)} unoptimized />
          ))}

        {tab === "fish" &&
          fishResults.map((item) => (
            <ResultRow key={item.id} title={item.title} subtitle={item.subtitle}
              coverUrl={item.coverUrl} selected={isSelected(item.id)} onAdd={() => addItem(item)} unoptimized />
          ))}

        {tab === "meat" &&
          meatResults.map((item) => (
            <ResultRow key={item.id} title={item.title} subtitle={item.subtitle}
              coverUrl={item.coverUrl} selected={isSelected(item.id)} onAdd={() => addItem(item)} unoptimized />
          ))}

        {tab === "fastfood" && !openedChain && (
          <div className="grid grid-cols-2 gap-2">
            {FAST_FOOD_CHAINS.map((chain) => (
              <ChainButton
                key={chain.slug}
                chain={chain}
                onClick={() => {
                  setOpenedChain(chain);
                  setChainLoading(true);
                  setChainItems([]);
                  fetch(`/api/food/fastfood/${chain.slug}`)
                    .then((r) => r.json())
                    .then((json) => setChainItems(json.results ?? []))
                    .catch(console.error)
                    .finally(() => setChainLoading(false));
                }}
              />
            ))}
          </div>
        )}

        {tab === "fastfood" && openedChain && (
          <>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-white flex items-center justify-center overflow-hidden border border-[color:var(--border)] shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={openedChain.logo} alt="" className="w-full h-full object-contain" />
              </div>
              <p className="text-sm font-medium text-[color:var(--muted)]">{openedChain.label}</p>
            </div>
            {chainLoading && <p className="text-sm text-[color:var(--muted)]">Chargement…</p>}
            {!chainLoading && chainItems.length === 0 && (
              <p className="text-sm text-[color:var(--muted)]">Aucun produit trouvé pour cette enseigne.</p>
            )}
            {chainItems.map((item) => (
              <ResultRow key={item.id} title={item.title} subtitle={item.subtitle}
                coverUrl={item.coverUrl} selected={isSelected(item.id)} onAdd={() => addItem(item)} />
            ))}
          </>
        )}

        {(mealLoading || categoryLoading || cuisineLoading || ingredientLoading || fruitLoading || vegetableLoading || fishLoading || meatLoading) && (
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

function ChainButton({
  chain,
  onClick,
}: {
  chain: { slug: string; label: string; logo: string };
  onClick: () => void;
}) {
  const [logoFailed, setLogoFailed] = useState(false);
  return (
    <button
      type="button"
      className="flex items-center gap-2 rounded-xl border border-[color:var(--border)] p-3 text-left hover:bg-[color:var(--surface-hover)]"
      onClick={onClick}
    >
      <div className="w-8 h-8 rounded bg-white flex items-center justify-center shrink-0 overflow-hidden border border-[color:var(--border)]">
        {!logoFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={chain.logo}
            alt={chain.label}
            width={32}
            height={32}
            className="object-contain w-full h-full"
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <span className="text-xs font-bold text-[color:var(--muted)]">
            {chain.label.slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
      <span className="font-medium text-sm truncate flex-1">{chain.label}</span>
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
  unoptimized = false,
}: {
  title: string;
  subtitle?: string;
  coverUrl?: string | null;
  selected: boolean;
  onAdd: () => void;
  unoptimized?: boolean;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-3">
      {coverUrl && !imgFailed ? (
        <Image
          src={coverUrl}
          alt=""
          width={48}
          height={48}
          className="rounded object-cover shrink-0"
          unoptimized={unoptimized}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div className="w-12 h-12 rounded bg-[color:var(--surface-2)] shrink-0" />
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
