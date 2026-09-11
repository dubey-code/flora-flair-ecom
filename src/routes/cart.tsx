import { Link, createFileRoute } from "@tanstack/react-router";

import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { DELIVERY_OPTIONS, formatPrice } from "@/lib/format";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Корзина — Московская весна" },
      { name: "description", content: "Ваша корзина эко-товаров с доставкой по Москве." },
      { property: "og:title", content: "Корзина — Московская весна" },
      { property: "og:description", content: "Проверьте состав заказа и оформите доставку." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { lines, itemsTotal, setQuantity, remove } = useCart();
  const freeFrom = DELIVERY_OPTIONS[0].freeFrom;

  return (
    <SiteShell>
      <section className="mx-auto max-w-6xl px-5 py-12">
        <p className="eyebrow">корзина</p>
        <h1 className="mt-3 font-display text-5xl">Ваш весенний набор</h1>

        {lines.length === 0 ? (
          <div className="petal-card mt-10 bg-card p-10 shadow-soft">
            <p className="font-display text-2xl">Пока пусто</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Добавьте что-нибудь нежное из каталога.
            </p>
            <Button asChild className="mt-6 rounded-full">
              <Link to="/catalog" search={{}}>
                В каталог
              </Link>
            </Button>
          </div>
        ) : (
          <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_320px]">
            <ul className="space-y-4">
              {lines.map((line) => (
                <li
                  key={line.productId}
                  className="petal-card flex items-center gap-4 bg-card p-4 shadow-soft"
                >
                  <img
                    src={line.image ?? "/hero.jpg"}
                    alt={line.title}
                    className="h-24 w-24 rounded-2xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/catalog/$slug"
                      params={{ slug: line.slug }}
                      className="font-display text-xl"
                    >
                      {line.title}
                    </Link>
                    <p className="text-sm text-muted-foreground">{formatPrice(line.price)}</p>
                  </div>
                  <div className="flex items-center gap-3 rounded-full border border-border px-3 py-1.5">
                    <button
                      onClick={() => setQuantity(line.productId, line.quantity - 1)}
                      aria-label="Меньше"
                    >
                      −
                    </button>
                    <span className="w-6 text-center tabular-nums">{line.quantity}</span>
                    <button
                      onClick={() => setQuantity(line.productId, line.quantity + 1)}
                      aria-label="Больше"
                    >
                      +
                    </button>
                  </div>
                  <p className="w-24 text-right">{formatPrice(line.price * line.quantity)}</p>
                  <button
                    onClick={() => remove(line.productId)}
                    className="text-sm text-muted-foreground hover:text-destructive"
                  >
                    Убрать
                  </button>
                </li>
              ))}
            </ul>

            <aside className="petal-card-alt h-fit bg-card p-7 shadow-soft lg:sticky lg:top-24">
              <p className="eyebrow">итого</p>
              <p className="mt-2 font-display text-3xl">{formatPrice(itemsTotal)}</p>
              <p className="mt-3 text-sm text-muted-foreground">
                {itemsTotal >= freeFrom
                  ? "Доставка курьером по МКАД — бесплатно."
                  : `До бесплатной доставки по МКАД: ${formatPrice(freeFrom - itemsTotal)}.`}
              </p>
              <Button asChild size="lg" className="mt-6 w-full rounded-full">
                <Link to="/checkout">Оформить заказ</Link>
              </Button>
              <Button asChild variant="ghost" className="mt-2 w-full rounded-full">
                <Link to="/catalog" search={{}}>
                  Продолжить покупки
                </Link>
              </Button>
            </aside>
          </div>
        )}
      </section>
    </SiteShell>
  );
}
