"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Search, Plus, X, ChevronLeft, Check, UtensilsCrossed, Tag, Globe, Apple, Carrot, ShoppingBasket, Fish, Beef } from "lucide-react";
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

type Tab = "meal" | "category" | "cuisine" | "ingredient" | "fruit" | "vegetable" | "fish" | "meat";

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
              setQuery("");
            }}
          >
            <Icon size={14} className="inline mr-1.5 -mt-0.5" />
            {label}
          </button>
        ))}
      </div>

      {(openedCategory || openedCuisine) && (
        <button
          type="button"
          className="btn-ghost text-sm inline-flex items-center gap-1"
          onClick={() => {
            setOpenedCategory(null);
            setOpenedCuisine(null);
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
              coverUrl={item.coverUrl} selected={isSelected(item.id)} onAdd={() => addItem(item)} />
          ))}

        {tab === "fruit" &&
          (fruitResults.length > 0 ? fruitResults : /* show all when no query */ []).map((item) => (
            <ResultRow key={item.id} title={item.title} subtitle={item.subtitle}
              coverUrl={item.coverUrl} selected={isSelected(item.id)} onAdd={() => addItem(item)} />
          ))}

        {tab === "vegetable" &&
          (vegetableResults.length > 0 ? vegetableResults : []).map((item) => (
            <ResultRow key={item.id} title={item.title} subtitle={item.subtitle}
              coverUrl={item.coverUrl} selected={isSelected(item.id)} onAdd={() => addItem(item)} />
          ))}

        {tab === "fish" &&
          fishResults.map((item) => (
            <ResultRow key={item.id} title={item.title} subtitle={item.subtitle}
              coverUrl={item.coverUrl} selected={isSelected(item.id)} onAdd={() => addItem(item)} />
          ))}

        {tab === "meat" &&
          meatResults.map((item) => (
            <ResultRow key={item.id} title={item.title} subtitle={item.subtitle}
              coverUrl={item.coverUrl} selected={isSelected(item.id)} onAdd={() => addItem(item)} />
          ))}

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
        <Image src={coverUrl} alt="" width={48} height={48} className="rounded object-cover shrink-0" />
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
