import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";

import { Branch, Wash } from "@/components/botanical";
import { ProductCard } from "@/components/product-card";
import { ProductQuickView } from "@/components/product-quick-view";
import { SiteShell } from "@/components/site-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { listCatalog } from "@/lib/shop.functions";
import type { Product } from "@/lib/shop-types";

const searchSchema = z.object({
  category: z.string().optional(),
  tag: z.string().optional(),
  max: z.number().optional(),
  sort: z.enum(["new", "price-asc", "price-desc"]).optional(),
});

export const Route = createFileRoute("/catalog/")({
  validateSearch: searchSchema,
  loader: () => listCatalog(),
  head: () => ({
    meta: [
      { title: "Каталог эко-товаров — Московская весна" },
      {
        name: "description",
        content:
          "Каталог эко-товаров: уход и косметика, ароматы и свечи, для дома и кухни, zero waste. Фильтры по категории, цене и тегам.",
      },
      { property: "og:title", content: "Каталог эко-товаров — Московская весна" },
      {
        property: "og:description",
        content: "Уход, ароматы, дом и zero waste — с доставкой по Москве.",
      },
    ],
  }),
  component: Catalog,
});

function Catalog() {
  const { products, categories } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [quick, setQuick] = useState<Product | null>(null);

  const priceCeiling = useMemo(
    () => Math.max(1000, ...products.map((p) => p.price)),
    [products],
  );
  const allTags = useMemo(
    () => Array.from(new Set(products.flatMap((p) => p.tags ?? []))).sort(),
    [products],
  );
  const maxPrice = search.max ?? priceCeiling;

  const visible = useMemo(() => {
    const categoryId = categories.find((c) => c.slug === search.category)?.id;
    let list = products.filter((p) => p.price <= maxPrice);
    if (search.category) list = list.filter((p) => p.category_id === categoryId);
    if (search.tag) list = list.filter((p) => (p.tags ?? []).includes(search.tag!));
    if (search.sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
    if (search.sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [products, categories, search.category, search.tag, search.sort, maxPrice]);

  const update = (patch: Partial<typeof search>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }) });

  return (
    <SiteShell>
      <section className="relative px-5 pt-12 pb-6">
        <Wash className="right-[-6%] top-0 h-64 w-64 rounded-full bg-lilac" />
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow">каталог</p>
          <h1 className="mt-3 font-display text-5xl md:text-6xl">Всё, что цветёт этой весной</h1>
          <p className="mt-4 max-w-lg text-muted-foreground">
            {visible.length} товаров в наличии. Фильтры сохраняются в адресе — ссылкой можно
            поделиться.
          </p>
          <Branch className="mt-6 h-16 w-48" />
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-10 px-5 pb-16 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-8 lg:sticky lg:top-24 lg:self-start">
          <div>
            <p className="eyebrow mb-3">Категория</p>
            <div className="flex flex-col items-start gap-1.5">
              <button
                onClick={() => update({ category: undefined })}
                className={`text-sm ${!search.category ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Все категории
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => update({ category: c.slug })}
                  className={`text-left text-sm ${search.category === c.slug ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {c.title}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="eyebrow mb-3">Цена до {formatPrice(maxPrice)}</p>
            <input
              type="range"
              aria-label="Максимальная цена"
              min={200}
              max={priceCeiling}
              step={50}
              value={maxPrice}
              onChange={(e) => update({ max: Number(e.target.value) })}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
            />
          </div>

          <div>
            <p className="eyebrow mb-3">Особенности</p>
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => (
                <button key={tag} onClick={() => update({ tag: search.tag === tag ? undefined : tag })}>
                  <Badge
                    variant={search.tag === tag ? "default" : "secondary"}
                    className="rounded-full font-normal"
                  >
                    {tag}
                  </Badge>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="eyebrow mb-3">Сортировка</p>
            <div className="flex flex-col items-start gap-1.5 text-sm">
              {[
                { value: undefined, label: "Сначала новинки" },
                { value: "price-asc" as const, label: "Цена: по возрастанию" },
                { value: "price-desc" as const, label: "Цена: по убыванию" },
              ].map((option) => (
                <button
                  key={option.label}
                  onClick={() => update({ sort: option.value })}
                  className={
                    search.sort === option.value
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <Button
            variant="outline"
            className="rounded-full"
            onClick={() =>
              navigate({ search: {} })
            }
          >
            Сбросить фильтры
          </Button>
        </aside>

        <div>
          {visible.length === 0 ? (
            <div className="petal-card bg-card p-10 text-center shadow-soft">
              <p className="font-display text-2xl">Ничего не нашлось</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Попробуйте убрать фильтры или заглянуть в{" "}
                <Link to="/catalog" search={{}} className="underline">
                  весь каталог
                </Link>
                .
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((product, i) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onQuickView={setQuick}
                  alt={i % 3 === 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <ProductQuickView product={quick} onClose={() => setQuick(null)} />
    </SiteShell>
  );
}
