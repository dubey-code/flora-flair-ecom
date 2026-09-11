import { createFileRoute } from "@tanstack/react-router";

import { SiteShell } from "@/components/site-shell";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Политика конфиденциальности — Московская весна" },
      {
        name: "description",
        content:
          "Как эко-магазин «Московская весна» обрабатывает и защищает персональные данные покупателей.",
      },
      { property: "og:title", content: "Политика конфиденциальности — Московская весна" },
      { property: "og:description", content: "Обработка и защита персональных данных покупателей." },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <SiteShell>
      <article className="mx-auto max-w-3xl px-5 py-14">
        <p className="eyebrow">документы</p>
        <h1 className="mt-3 font-display text-4xl md:text-5xl">Политика конфиденциальности</h1>
        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <p>
            Настоящая политика описывает, как интернет-магазин «Московская весна» (далее — Магазин)
            обрабатывает персональные данные пользователей сайта в соответствии с Федеральным законом
            №152-ФЗ «О персональных данных».
          </p>
          <section>
            <h2 className="font-display text-2xl text-foreground">1. Какие данные мы собираем</h2>
            <p className="mt-2">
              Имя, номер телефона, адрес электронной почты, адрес доставки и комментарий к заказу —
              только те данные, которые вы указываете при оформлении заказа. Дополнительно
              сохраняются технические данные: тип устройства, страницы просмотра, время визита.
            </p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-foreground">2. Зачем мы их используем</h2>
            <p className="mt-2">
              Для сборки и доставки заказа, связи с вами по заказу, оформления возврата и улучшения
              работы сайта. Мы не используем ваши данные для рекламных рассылок без отдельного
              согласия.
            </p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-foreground">3. Передача третьим лицам</h2>
            <p className="mt-2">
              Данные передаются только курьерской службе в объёме, необходимом для доставки, и
              государственным органам по законному требованию. Мы не продаём и не передаём данные для
              маркетинга.
            </p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-foreground">4. Хранение и защита</h2>
            <p className="mt-2">
              Данные хранятся на защищённых серверах, доступ имеют только сотрудники Магазина,
              работающие с заказами. Срок хранения — 3 года с момента последнего заказа либо до
              отзыва согласия.
            </p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-foreground">5. Cookies</h2>
            <p className="mt-2">
              Сайт использует локальное хранилище браузера, чтобы сохранять содержимое корзины.
              Отключить это можно в настройках браузера — корзина при этом будет очищаться.
            </p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-foreground">6. Ваши права</h2>
            <p className="mt-2">
              Вы можете запросить сведения об обработке ваших данных, их исправление или удаление,
              а также отозвать согласие, написав на hello@moscow-vesna.ru. Мы ответим в течение 10
              рабочих дней.
            </p>
          </section>
          <p>
            Контакты для обращений: Москва, ул. Покровка, 12; hello@moscow-vesna.ru; +7 (495)
            000-00-00. Реквизиты и наименование юридического лица уточняются.
          </p>
        </div>
      </article>
    </SiteShell>
  );
}
