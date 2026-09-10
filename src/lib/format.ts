export function formatPrice(value: number): string {
  return `${new Intl.NumberFormat("ru-RU").format(Math.round(value))} ₽`;
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export const DELIVERY_OPTIONS = [
  {
    value: "courier_mkad",
    label: "Курьер внутри МКАД",
    hint: "На следующий день, 2 часа интервал",
    price: 390,
    freeFrom: 4000,
  },
  {
    value: "courier_outside",
    label: "Курьер за МКАД (до 20 км)",
    hint: "1–2 дня",
    price: 690,
    freeFrom: 8000,
  },
  {
    value: "pickup",
    label: "Самовывоз, Покровка 12",
    hint: "Ежедневно с 11:00 до 21:00",
    price: 0,
    freeFrom: 0,
  },
] as const;

export type DeliveryMethod = (typeof DELIVERY_OPTIONS)[number]["value"];

export function deliveryPrice(method: string, itemsTotal: number): number {
  const option = DELIVERY_OPTIONS.find((o) => o.value === method) ?? DELIVERY_OPTIONS[0];
  if (option.freeFrom > 0 && itemsTotal >= option.freeFrom) return 0;
  return option.price;
}

export const ORDER_STATUSES = [
  { value: "new", label: "Новый" },
  { value: "confirmed", label: "Подтверждён" },
  { value: "shipped", label: "Передан курьеру" },
  { value: "done", label: "Выполнен" },
  { value: "cancelled", label: "Отменён" },
] as const;

export function statusLabel(value: string): string {
  return ORDER_STATUSES.find((s) => s.value === value)?.label ?? value;
}
