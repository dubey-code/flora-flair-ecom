import { createFileRoute } from "@tanstack/react-router";

import { SiteShell } from "@/components/site-shell";

export const Route = createFileRoute("/offer")({
  head: () => ({
    meta: [
      { title: "Публичная оферта — Московская весна" },
      {
        name: "description",
        content:
          "Публичная оферта интернет-магазина эко-товаров «Московская весна»: заказ, оплата, доставка, возврат.",
      },
      { property: "og:title", content: "Публичная оферта — Московская весна" },
      { property: "og:description", content: "Условия заказа, оплаты, доставки и возврата." },
    ],
  }),
  component: Offer,
});

function Offer() {
  return (
    <SiteShell>
      <article className="mx-auto max-w-3xl px-5 py-14">
        <p className="eyebrow">документы</p>
        <h1 className="mt-3 font-display text-4xl md:text-5xl">Публичная оферта</h1>
        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <p>
            Настоящий документ является публичной офертой интернет-магазина «Московская весна»
            (далее — Продавец) и определяет условия покупки товаров на сайте. Оформление заказа
            означает согласие с условиями оферты.
          </p>
          <section>
            <h2 className="font-display text-2xl text-foreground">1. Предмет</h2>
            <p className="mt-2">
              Продавец передаёт Покупателю товары эко-ассортимента, представленные на сайте, а
              Покупатель оплачивает их стоимость и стоимость доставки согласно выбранному способу.
            </p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-foreground">2. Оформление заказа</h2>
            <p className="mt-2">
              Заказ оформляется на сайте с указанием имени, телефона и адреса доставки. После
              оформления Покупатель получает номер заказа вида MSK-00001. Продавец подтверждает
              состав и сроки по телефону или в мессенджере.
            </p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-foreground">3. Цена и оплата</h2>
            <p className="mt-2">
              Цены указаны в рублях РФ и включают все налоги. Оплата производится при получении
              заказа наличными или картой. Стоимость доставки рассчитывается автоматически и зависит
              от суммы и зоны.
            </p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-foreground">4. Доставка</h2>
            <p className="mt-2">
              Доставка осуществляется по Москве и до 20 км за МКАД, а также самовывозом. Сроки и
              стоимость приведены на странице «Доставка» и являются частью настоящей оферты.
            </p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-foreground">5. Возврат и обмен</h2>
            <p className="mt-2">
              Товар надлежащего качества возвращается в течение 14 дней при сохранении упаковки, за
              исключением парфюмерно-косметической продукции и средств личной гигиены. Товар
              ненадлежащего качества заменяется или возвращается с компенсацией доставки.
            </p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-foreground">6. Ответственность</h2>
            <p className="mt-2">
              Продавец не отвечает за задержки, вызванные форс-мажором и действиями курьерских
              служб. Изображения товаров могут незначительно отличаться оттенком: продукция
              изготавливается вручную.
            </p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-foreground">7. Реквизиты</h2>
            <p className="mt-2">
              Наименование, ИНН, ОГРН и юридический адрес Продавца указываются после предоставления
              данных владельцем магазина. Контакты: Москва, ул. Покровка, 12; hello@moscow-vesna.ru.
            </p>
          </section>
        </div>
      </article>
    </SiteShell>
  );
}
