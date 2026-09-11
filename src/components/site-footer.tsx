import { Link } from "@tanstack/react-router";

import { Branch } from "@/components/botanical";

export function SiteFooter() {
  return (
    <footer className="relative mt-24 overflow-hidden border-t border-border/60 bg-muted/40">
      <Branch className="pointer-events-none absolute -top-6 right-6 h-32 w-64 opacity-60" />
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-4">
        <div>
          <p className="font-display text-2xl">Московская весна</p>
          <p className="mt-3 text-sm text-muted-foreground">
            Эко-товары с доставкой по Москве. Мягкая забота о себе и городе.
          </p>
        </div>
        <div className="text-sm">
          <p className="eyebrow mb-3">Магазин</p>
          <ul className="space-y-2 text-muted-foreground">
            <li>
              <Link to="/catalog" className="hover:text-foreground">
                Каталог
              </Link>
            </li>
            <li>
              <Link to="/delivery" className="hover:text-foreground">
                Доставка и оплата
              </Link>
            </li>
            <li>
              <Link to="/cart" className="hover:text-foreground">
                Корзина
              </Link>
            </li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="eyebrow mb-3">Документы</p>
          <ul className="space-y-2 text-muted-foreground">
            <li>
              <Link to="/privacy" className="hover:text-foreground">
                Политика конфиденциальности
              </Link>
            </li>
            <li>
              <Link to="/offer" className="hover:text-foreground">
                Публичная оферта
              </Link>
            </li>
            <li>
              <Link to="/admin" className="hover:text-foreground">
                Вход для сотрудников
              </Link>
            </li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="eyebrow mb-3">Контакты</p>
          <ul className="space-y-2 text-muted-foreground">
            <li>Москва, Покровка 12</li>
            <li>Ежедневно 11:00–21:00</li>
            <li>+7 (495) 000-00-00</li>
            <li>hello@moscow-vesna.ru</li>
          </ul>
        </div>
      </div>
      <p className="border-t border-border/60 px-5 py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Московская весна. Контакты и реквизиты — демонстрационные.
      </p>
    </footer>
  );
}
