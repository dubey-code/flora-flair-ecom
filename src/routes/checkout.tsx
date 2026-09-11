import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { Blossom } from "@/components/botanical";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/lib/cart";
import { DELIVERY_OPTIONS, deliveryPrice, formatPrice, type DeliveryMethod } from "@/lib/format";
import { createOrder } from "@/lib/shop.functions";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Оформление заказа — Московская весна" },
      {
        name: "description",
        content: "Оформите заказ эко-товаров: курьер по Москве, за МКАД или самовывоз на Покровке.",
      },
      { property: "og:title", content: "Оформление заказа — Московская весна" },
      { property: "og:description", content: "Курьер по Москве, за МКАД или самовывоз." },
    ],
  }),
  component: Checkout,
});

function Checkout() {
  const { lines, itemsTotal, clear } = useCart();
  const submit = useServerFn(createOrder);
  const [method, setMethod] = useState<DeliveryMethod>("courier_mkad");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<{ orderNumber: string; total: number } | null>(null);
  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    email: "",
    address: "",
    deliveryDate: "",
    comment: "",
  });

  const delivery = deliveryPrice(method, itemsTotal);
  const total = itemsTotal + delivery;

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (lines.length === 0) return;
    setSending(true);
    try {
      const result = await submit({
        data: {
          customerName: form.customerName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          deliveryMethod: method,
          address: method === "pickup" ? "" : form.address.trim(),
          deliveryDate: form.deliveryDate.trim(),
          comment: form.comment.trim(),
          items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        },
      });
      setDone(result);
      clear();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось оформить заказ");
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <SiteShell>
        <section className="mx-auto max-w-2xl px-5 py-20 text-center">
          <Blossom className="mx-auto h-16 w-16" />
          <h1 className="mt-6 font-display text-5xl">Спасибо за заказ!</h1>
          <p className="mt-4 text-muted-foreground">
            Номер заказа <span className="text-foreground">{done.orderNumber}</span>. Сумма к оплате{" "}
            {formatPrice(done.total)}. Мы позвоним, чтобы подтвердить время доставки.
          </p>
          <Button asChild className="mt-8 rounded-full">
            <Link to="/catalog" search={{}}>
              Вернуться в каталог
            </Link>
          </Button>
        </section>
      </SiteShell>
    );
  }

  if (lines.length === 0) {
    return (
      <SiteShell>
        <section className="mx-auto max-w-2xl px-5 py-20 text-center">
          <h1 className="font-display text-4xl">Корзина пуста</h1>
          <p className="mt-3 text-muted-foreground">Выберите товары, и мы всё соберём.</p>
          <Button asChild className="mt-8 rounded-full">
            <Link to="/catalog" search={{}}>
              В каталог
            </Link>
          </Button>
        </section>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <section className="mx-auto max-w-6xl px-5 py-12">
        <p className="eyebrow">оформление</p>
        <h1 className="mt-3 font-display text-5xl">Куда привезти весну?</h1>

        <form onSubmit={onSubmit} className="mt-10 grid gap-10 lg:grid-cols-[1fr_340px]">
          <div className="space-y-8">
            <div className="petal-card bg-card p-7 shadow-soft">
              <h2 className="font-display text-2xl">Контакты</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="name">Имя и фамилия *</Label>
                  <Input
                    id="name"
                    required
                    minLength={2}
                    value={form.customerName}
                    onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Телефон *</Label>
                  <Input
                    id="phone"
                    required
                    minLength={6}
                    placeholder="+7 999 000-00-00"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="email">Email для чека</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
              </div>
            </div>

            <div className="petal-card-alt bg-card p-7 shadow-soft">
              <h2 className="font-display text-2xl">Доставка</h2>
              <div className="mt-5 grid gap-3">
                {DELIVERY_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors ${
                      method === option.value ? "border-primary bg-accent/50" : "border-border"
                    }`}
                  >
                    <input
                      type="radio"
                      name="delivery"
                      className="mt-1"
                      checked={method === option.value}
                      onChange={() => setMethod(option.value)}
                    />
                    <span>
                      <span className="block">{option.label}</span>
                      <span className="block text-sm text-muted-foreground">{option.hint}</span>
                      <span className="mt-1 block text-sm">
                        {option.price === 0 ? "Бесплатно" : formatPrice(option.price)}
                        {option.freeFrom > 0
                          ? ` · бесплатно от ${formatPrice(option.freeFrom)}`
                          : ""}
                      </span>
                    </span>
                  </label>
                ))}
              </div>

              {method !== "pickup" ? (
                <div className="mt-5">
                  <Label htmlFor="address">Адрес доставки *</Label>
                  <Input
                    id="address"
                    required
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="Улица, дом, квартира, домофон"
                    className="mt-1.5"
                  />
                </div>
              ) : null}

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="date">Желаемая дата</Label>
                  <Input
                    id="date"
                    type="date"
                    value={form.deliveryDate}
                    onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
              </div>

              <div className="mt-5">
                <Label htmlFor="comment">Комментарий</Label>
                <Textarea
                  id="comment"
                  value={form.comment}
                  onChange={(e) => setForm({ ...form, comment: e.target.value })}
                  className="mt-1.5"
                  rows={3}
                />
              </div>
            </div>
          </div>

          <aside className="petal-card h-fit bg-card p-7 shadow-soft lg:sticky lg:top-24">
            <h2 className="font-display text-2xl">Заказ</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {lines.map((line) => (
                <li key={line.productId} className="flex justify-between gap-3">
                  <span className="text-muted-foreground">
                    {line.title} × {line.quantity}
                  </span>
                  <span>{formatPrice(line.price * line.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 space-y-1 border-t border-border pt-4 text-sm">
              <p className="flex justify-between">
                <span className="text-muted-foreground">Товары</span>
                <span>{formatPrice(itemsTotal)}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-muted-foreground">Доставка</span>
                <span>{delivery === 0 ? "Бесплатно" : formatPrice(delivery)}</span>
              </p>
            </div>
            <p className="mt-4 flex items-end justify-between">
              <span className="eyebrow">итого</span>
              <span className="font-display text-3xl">{formatPrice(total)}</span>
            </p>
            <Button type="submit" size="lg" disabled={sending} className="mt-6 w-full rounded-full">
              {sending ? "Отправляем…" : "Подтвердить заказ"}
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">
              Нажимая кнопку, вы соглашаетесь с{" "}
              <Link to="/offer" className="underline">
                офертой
              </Link>{" "}
              и{" "}
              <Link to="/privacy" className="underline">
                политикой конфиденциальности
              </Link>
              .
            </p>
          </aside>
        </form>
      </section>
    </SiteShell>
  );
}
