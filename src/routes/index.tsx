import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Branch, Blossom, Wash } from "@/components/botanical";
import { ProductCard } from "@/components/product-card";
import { ProductQuickView } from "@/components/product-quick-view";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { DELIVERY_OPTIONS, formatPrice } from "@/lib/format";
import { listCatalog } from "@/lib/shop.functions";
import type { Product } from "@/lib/shop-types";

export const Route = createFileRoute("/")({
  loader: () => listCatalog(),
  head: () => ({
    meta: [
      { title: "Московская весна — эко-товары с доставкой по Москве" },
      {
        name: "description",
        content:
          "Нежные эко-товары ручной работы: твёрдый шампунь, мыло, свечи, zero waste для дома. Доставка по Москве от 390 ₽.",
      },
      { property: "og:title", content: "Московская весна — эко-товары" },
      {
        property: "og:description",
        content: "Эко-магазин с доставкой по Москве: уход, ароматы, дом и zero waste.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { products, categories } = Route.useLoaderData();
  const [quick, setQuick] = useState<Product | null>(null);
  const featured = products.filter((p) => p.featured).slice(0, 4);
  const showcase = featured.length ? featured : products.slice(0, 4);

  return (
    <SiteShell>
      {/* Hero */}
      <section className="relative overflow-hidden px-5 pt-10 pb-16">
        <Wash className="left-[-10%] top-[-10%] h-80 w-80 rounded-full bg-blush" />
        <Wash className="right-[-8%] top-24 h-72 w-72 rounded-full bg-mint" />
        <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="eyebrow">весна в москве · 2026</p>
            <h1 className="mt-4 font-display text-5xl leading-[1.05] md:text-7xl">
              Нежные вещи
              <br />
              для дома,
              <br />
              бережные к городу
            </h1>
            <p className="mt-6 max-w-md text-muted-foreground">
              Собираем маленькие радости: твёрдый шампунь, соевые свечи, восковые салфетки и мешочки
              для покупок. Всё — ручной работы, без лишней упаковки.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full px-7">
                <Link to="/catalog">Смотреть каталог</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full px-7">
                <Link to="/delivery">Доставка по Москве</Link>
              </Button>
            </div>
            <Branch className="mt-10 h-20 w-56" />
          </div>

          <div className="relative">
            <img
              src="/hero.jpg"
              alt="Эко-товары: мыло, свечи и тканевые мешочки в весеннем свете"
              className="blob-frame aspect-[4/5] w-full object-cover shadow-petal"
            />
            <div className="petal-card absolute -bottom-6 -left-4 bg-card/95 px-5 py-4 shadow-soft backdrop-blur">
              <p className="eyebrow">бесплатно</p>
              <p className="font-display text-xl">от {formatPrice(4000)} по МКАД</p>
            </div>
            <Blossom className="absolute -right-3 -top-4 h-16 w-16" />
          </div>
        </div>
      </section>

      {/* Categories strip */}
      <section className="px-5 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap gap-3">
          {categories.map((category) => (
            <Link
              key={category.id}
              to="/catalog"
              search={{ category: category.slug }}
              className="petal-card border border-border/70 bg-card px-6 py-4 text-sm transition-colors hover:bg-accent"
            >
              <span className="font-display text-lg">{category.title}</span>
              {category.description ? (
                <span className="mt-1 block max-w-xs text-xs text-muted-foreground">
                  {category.description}
                </span>
              ) : null}
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="px-5 py-14">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">избранное</p>
              <h2 className="mt-2 font-display text-4xl">Весенняя витрина</h2>
            </div>
            <Link to="/catalog" className="text-sm text-muted-foreground hover:text-foreground">
              Весь каталог →
            </Link>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {showcase.map((product, i) => (
              <ProductCard
                key={product.id}
                product={product}
                onQuickView={setQuick}
                alt={i % 2 === 1}
                className={i % 2 === 1 ? "lg:mt-10" : undefined}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="px-5 py-14">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
          {[
            {
              title: "Составы без компромиссов",
              text: "Растительные масла, эфирные масла, никаких сульфатов и микропластика.",
            },
            {
              title: "Упаковка, которая исчезает",
              text: "Крафт, стекло и ткань. Приносите баночки — наполним со скидкой.",
            },
            {
              title: "Локальные мастера",
              text: "Работаем с небольшими мастерскими Москвы и Подмосковья.",
            },
          ].map((item) => (
            <article key={item.title} className="petal-card bg-card p-7 shadow-soft">
              <Blossom className="h-10 w-10" />
              <h3 className="mt-4 font-display text-2xl">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Delivery teaser */}
      <section className="px-5 py-14">
        <div className="mx-auto max-w-6xl overflow-hidden petal-card-alt spring-gradient p-10 shadow-petal">
          <p className="eyebrow">доставка</p>
          <h2 className="mt-2 font-display text-4xl">Привезём по Москве за день</h2>
          <ul className="mt-6 grid gap-4 md:grid-cols-3">
            {DELIVERY_OPTIONS.map((option) => (
              <li key={option.value} className="rounded-2xl bg-card/80 p-5 backdrop-blur">
                <p className="font-display text-xl">{option.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{option.hint}</p>
                <p className="mt-3 text-sm">
                  {option.price === 0 ? "Бесплатно" : formatPrice(option.price)}
                </p>
              </li>
            ))}
          </ul>
          <Button asChild className="mt-8 rounded-full">
            <Link to="/delivery">Условия доставки</Link>
          </Button>
        </div>
      </section>

      <ProductQuickView product={quick} onClose={() => setQuick(null)} />
    </SiteShell>
  );
}
