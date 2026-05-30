"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Search, Plus, X, ChevronLeft, Check, Wine, Tag, FlaskConical, Droplets } from "lucide-react";

const DRINK_CATEGORIES = [
  { slug: "en:sodas", label: "Sodas", emoji: "🥤" },
  { slug: "en:fruit-juices", label: "Jus de fruits", emoji: "🍊" },
  { slug: "en:nectars", label: "Nectars", emoji: "🍑" },
  { slug: "en:waters", label: "Eaux", emoji: "💧" },
  { slug: "en:sparkling-waters", label: "Eaux pétillantes", emoji: "🫧" },
  { slug: "en:iced-teas", label: "Ice Tea", emoji: "🧊" },
  { slug: "en:energy-drinks", label: "Boissons énergisantes", emoji: "⚡" },
  { slug: "en:sports-drinks", label: "Boissons sportives", emoji: "🏃" },
  { slug: "en:wines", label: "Vins", emoji: "🍷" },
  { slug: "en:beers", label: "Bières", emoji: "🍺" },
  { slug: "en:ciders", label: "Cidres", emoji: "🍎" },
  { slug: "fr:champagnes", label: "Champagnes", emoji: "🥂" },
  { slug: "en:coffees", label: "Cafés", emoji: "☕" },
  { slug: "en:teas", label: "Thés", emoji: "🍵" },
  { slug: "en:hot-chocolates", label: "Chocolats chauds", emoji: "🍫" },
  { slug: "en:plant-milks", label: "Laits végétaux", emoji: "🌱" },
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

type Tab = "cocktail" | "category" | "ingredient" | "drink" | "drink-type";

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
    source: "thecocktaildb",
    metadata: { itemKind: item.metadata?.itemKind ?? "cocktail", ...item.metadata },
  };
}

export default function DrinkPicker({ size, selected, onChange, freeMode = false }: Props) {
  const [tab, setTab] = useState<Tab>("cocktail");
  const [query, setQuery] = useState("");
  const [openedCategory, setOpenedCategory] = useState<ContentCollection | null>(null);
  const [openedIngredient, setOpenedIngredient] = useState<ContentEntity | null>(null);
  const [openedDrinkType, setOpenedDrinkType] = useState<{ slug: string; label: string; emoji: string } | null>(null);
  const [categoryDrinks, setCategoryDrinks] = useState<ContentItem[]>([]);
  const [ingredientDrinks, setIngredientDrinks] = useState<ContentItem[]>([]);
  const [drinkTypeDrinks, setDrinkTypeDrinks] = useState<ContentItem[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { results: cocktailResults, loading: cocktailLoading } = useDebouncedSearch(
    "/api/content/search?kind=items",
    query,
    tab === "cocktail",
  );

  const { results: categoryResults, loading: categoryLoading } = useDebouncedSearch(
    "/api/content/search?kind=collections",
    query,
    tab === "category" && !openedCategory,
  );

  const { results: ingredientResults, loading: ingredientLoading } = useDebouncedSearch(
    "/api/content/search?kind=entities",
    query,
    tab === "ingredient" && !openedIngredient,
  );

  const { results: drinkResults, loading: drinkLoading } = useDebouncedSearch(
    "/api/drinks/search",
    query,
    tab === "drink",
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

  useEffect(() => {
    if (!openedCategory) return;
    fetch(`/api/content/collection/${openedCategory.id}/items`)
      .then((r) => r.json())
      .then((json) => setCategoryDrinks(json.items ?? json.results ?? []))
      .catch(console.error)
      .finally(() => setDrillLoading(false));
  }, [openedCategory]);

  useEffect(() => {
    if (!openedIngredient) return;
    fetch(`/api/content/entity/${openedIngredient.id}/items?limit=50`)
      .then((r) => r.json())
      .then((json) => setIngredientDrinks(json.items ?? json.results ?? []))
      .catch(console.error)
      .finally(() => setDrillLoading(false));
  }, [openedIngredient]);

  const tabs: { key: Tab; label: string; icon: typeof Wine }[] = [
    { key: "drink", label: "Boissons", icon: Droplets },
    { key: "drink-type", label: "Par type", icon: Tag },
    { key: "cocktail", label: "Cocktails", icon: Wine },
    { key: "category", label: "Cat. cocktails", icon: Tag },
    { key: "ingredient", label: "Ingrédients", icon: FlaskConical },
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
              setOpenedIngredient(null);
              setOpenedDrinkType(null);
              setDrinkTypeDrinks([]);
              setQuery("");
            }}
          >
            <Icon size={14} className="inline mr-1.5 -mt-0.5" />
            {label}
          </button>
        ))}
      </div>

      {(openedCategory || openedIngredient || openedDrinkType) && (
        <button
          type="button"
          className="btn-ghost text-sm inline-flex items-center gap-1"
          onClick={() => {
            setOpenedCategory(null);
            setOpenedIngredient(null);
            setOpenedDrinkType(null);
            setDrinkTypeDrinks([]);
          }}
        >
          <ChevronLeft size={16} />
          Retour à la recherche
        </button>
      )}

      {!openedCategory && !openedIngredient && !openedDrinkType && (
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
              tab === "drink"
                ? "Coca-Cola, jus d'orange, eau, vin, bière…"
                : tab === "cocktail"
                  ? "Rechercher un cocktail…"
                  : tab === "category"
                    ? "Rechercher une catégorie de cocktails…"
                    : "Rechercher un ingrédient…"
            }
            className="input w-full pl-10"
          />
        </div>
      )}

      <div className="min-h-[200px] space-y-2">
        {tab === "drink" &&
          drinkResults.map((item) => (
            <ResultRow
              key={item.id}
              title={item.title}
              subtitle={item.subtitle}
              coverUrl={item.coverUrl}
              selected={isSelected(item.id)}
              onAdd={() => addItem(item)}
            />
          ))}

        {tab === "drink" && drinkLoading && (
          <p className="text-sm text-[color:var(--muted)]">Recherche…</p>
        )}

        {tab === "drink-type" && !openedDrinkType && (
          <div className="grid grid-cols-2 gap-2">
            {DRINK_CATEGORIES.map((cat) => (
              <button
                key={cat.slug}
                type="button"
                className="flex items-center gap-2 rounded-xl border border-[color:var(--border)] p-3 text-left hover:bg-[color:var(--surface-hover)]"
                onClick={() => {
                  setOpenedDrinkType(cat);
                  setDrillLoading(true);
                  setDrinkTypeDrinks([]);
                  fetch(`/api/drinks/category/${encodeURIComponent(cat.slug)}`)
                    .then((r) => r.json())
                    .then((json) => setDrinkTypeDrinks(json.results ?? []))
                    .catch(console.error)
                    .finally(() => setDrillLoading(false));
                }}
              >
                <span className="text-xl shrink-0">{cat.emoji}</span>
                <span className="font-medium text-sm truncate">{cat.label}</span>
              </button>
            ))}
          </div>
        )}

        {tab === "drink-type" && openedDrinkType && (
          <>
            <p className="text-sm font-medium text-[color:var(--muted)]">
              {openedDrinkType.emoji} {openedDrinkType.label}
            </p>
            {drillLoading && <p className="text-sm text-[color:var(--muted)]">Chargement…</p>}
            {!drillLoading && drinkTypeDrinks.length === 0 && (
              <p className="text-sm text-[color:var(--muted)]">Aucune boisson trouvée.</p>
            )}
            {drinkTypeDrinks.map((item) => (
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

        {tab === "cocktail" &&
          cocktailResults.map((item) => (
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
                <p className="text-xs text-[color:var(--muted)]">Voir les cocktails de la catégorie</p>
              </div>
            </button>
          ))}

        {tab === "category" && openedCategory && (
          <>
            <p className="text-sm font-medium text-[color:var(--muted)]">{openedCategory.title}</p>
            {drillLoading && <p className="text-sm text-[color:var(--muted)]">Chargement…</p>}
            {categoryDrinks.map((item) => (
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

        {tab === "ingredient" && !openedIngredient &&
          (ingredientResults as unknown as ContentEntity[]).map((ingredient) => (
            <button
              key={ingredient.id}
              type="button"
              className="w-full flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-3 text-left hover:bg-[color:var(--surface-hover)]"
              onClick={() => {
                setDrillLoading(true);
                setOpenedIngredient(ingredient);
              }}
            >
              <div className="w-12 h-12 rounded-full bg-[color:var(--surface-2)] flex items-center justify-center">
                <FlaskConical size={20} className="text-[color:var(--muted)]" />
              </div>
              <div>
                <p className="font-semibold">{ingredient.name}</p>
                <p className="text-xs text-[color:var(--muted)]">Cocktails à base de cet ingrédient</p>
              </div>
            </button>
          ))}

        {tab === "ingredient" && openedIngredient && (
          <>
            <p className="text-sm font-medium">{openedIngredient.name}</p>
            {drillLoading && <p className="text-sm text-[color:var(--muted)]">Chargement…</p>}
            {ingredientDrinks.map((item) => (
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

        {(cocktailLoading || categoryLoading || ingredientLoading) && (
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
        <Image src={coverUrl} alt="" width={48} height={48} className="rounded-full object-cover shrink-0" />
      ) : (
        <div className="w-12 h-12 rounded-full bg-[color:var(--surface-2)] shrink-0" />
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
