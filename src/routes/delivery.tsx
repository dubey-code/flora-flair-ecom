import { Link, createFileRoute } from "@tanstack/react-router";

import { Branch, Wash } from "@/components/botanical";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { DELIVERY_OPTIONS, formatPrice } from "@/lib/format";

export const Route = createFileRoute("/delivery")({
  head: () => ({
    meta: [
      { title: "Доставка по Москве — Московская весна" },
      {
        name: "description",
        content:
          "Условия доставки эко-товаров по Москве: курьер внутри МКАД от 390 ₽, за МКАД от 690 ₽, самовывоз на Покровке. Бесплатно от 4000 ₽.",
      },
      { property: "og:title", content: "Доставка по Москве — Московская весна" },
      {
        property: "og:description",
        content: "Курьер по МКАД, за МКАД и самовывоз. Бесплатная доставка от 4000 ₽.",
      },
    ],
  }),
  component: Delivery,
});

const ZONES = [
  { title: "Внутри МКАД", text: "Доставка на следующий день, интервал 2 часа с 11:00 до 21:00.", price: 390 },
  { title: "За МКАД до 20 км", text: "1–2 рабочих дня, курьер согласует время звонком.", price: 690 },
  { title: "Самовывоз", text: "Покровка 12, ежедневно с 11:00 до 21:00. Заказ храним 3 дня.", price: 0 },
];

function Delivery() {
  return (
    <SiteShell>
      <section className="relative px-5 pt-12 pb-8">
        <Wash className="left-[-6%] top-4 h-64 w-64 rounded-full bg-mint" />
        <div className="mx-auto max-w-4xl">
          <p className="eyebrow">доставка и оплата</p>
          <h1 className="mt-3 font-display text-5xl md:text-6xl">Доставка по Москве</h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Собираем заказы в крафт и ткань, без пузырчатой плёнки. Курьеры ездят на электровелосипедах
            внутри центра.
          </p>
          <Branch className="mt-6 h-16 w-48" />
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 pb-10">
        <div className="grid gap-5 md:grid-cols-3">
          {ZONES.map((zone) => (
            <article key={zone.title} className="petal-card bg-card p-6 shadow-soft">
              <h2 className="font-display text-2xl">{zone.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{zone.text}</p>
              <p className="mt-4">{zone.price === 0 ? "Бесплатно" : formatPrice(zone.price)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl space-y-6 px-5 pb-16 text-sm leading-relaxed text-muted-foreground">
        <div>
          <h2 className="font-display text-2xl text-foreground">Бесплатная доставка</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            {DELIVERY_OPTIONS.filter((o) => o.freeFrom > 0).map((o) => (
              <li key={o.value}>
                {o.label} — бесплатно от {formatPrice(o.freeFrom)}.
              </li>
            ))}
            <li>Самовывоз всегда бесплатный.</li>
          </ul>
        </div>
        <div>
          <h2 className="font-display text-2xl text-foreground">Сроки сборки</h2>
          <p className="mt-3">
            Заказы, оформленные до 17:00, собираем в тот же день. Заказы после 17:00 — на следующий
            рабочий день. Свечи ручного розлива иногда требуют дополнительного дня — мы предупредим.
          </p>
        </div>
        <div>
          <h2 className="font-display text-2xl text-foreground">Оплата</h2>
          <p className="mt-3">
            Сейчас доступна оплата при получении — наличными или картой курьеру, а также в пункте
            самовывоза. Онлайн-оплату подключим позже.
          </p>
        </div>
        <div>
          <h2 className="font-display text-2xl text-foreground">Возврат</h2>
          <p className="mt-3">
            Товар надлежащего качества можно вернуть в течение 14 дней, если сохранены упаковка и
            потребительские свойства. Косметика и средства гигиены возврату не подлежат по закону.
          </p>
        </div>
        <Button asChild className="rounded-full">
          <Link to="/catalog" search={{}}>
            Перейти в каталог
          </Link>
        </Button>
      </section>
    </SiteShell>
  );
}
