import { Link } from "@tanstack/react-router";
import { Headset, Loader2, MessageCircle, Minus, Plus, Send, ShoppingBasket, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Blossom } from "@/components/botanical";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ChatMessage, ChatProductRef, ChatStatus } from "@/lib/chat-types";
import { CHAT_STATUS_LABELS } from "@/lib/chat-types";
import {
  createChatOrder,
  getChatState,
  requestChatOperator,
  sendChatMessage,
  startChatSession,
} from "@/lib/chat.functions";
import { DELIVERY_OPTIONS, deliveryPrice, formatPrice } from "@/lib/format";

const SESSION_KEY = "vesna-chat-session-v1";
const PICK_KEY = "vesna-chat-pick-v1";

interface Access {
  sessionId: string;
  token: string;
}

interface PickLine extends ChatProductRef {
  quantity: number;
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [access, setAccess] = useState<Access | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("bot");
  const [picks, setPicks] = useState<PickLine[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [unread, setUnread] = useState(0);
  const [showOrder, setShowOrder] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);

  const [deliveryMethod, setDeliveryMethod] = useState<string>("courier_mkad");
  const [address, setAddress] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [comment, setComment] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastCountRef = useRef(0);

  useEffect(() => {
    const saved = readJson<Access>(SESSION_KEY);
    if (saved?.sessionId && saved?.token) setAccess(saved);
    const savedPicks = readJson<PickLine[]>(PICK_KEY);
    if (savedPicks) setPicks(savedPicks);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(PICK_KEY, JSON.stringify(picks));
    } catch {
      // ignore
    }
  }, [picks, hydrated]);

  const applyState = useCallback(
    (next: { status: ChatStatus; messages: ChatMessage[] }, silent = false) => {
      setStatus(next.status);
      setMessages(next.messages);
      if (silent && next.messages.length > lastCountRef.current && !open) {
        setUnread(next.messages.length - lastCountRef.current);
      }
      if (!silent || open) lastCountRef.current = next.messages.length;
    },
    [open],
  );

  const refresh = useCallback(
    async (silent = false) => {
      if (!access) return;
      try {
        const state = await getChatState({ data: access });
        applyState(state, silent);
      } catch {
        // ignore transient errors
      }
    },
    [access, applyState],
  );

  useEffect(() => {
    if (!access) return;
    void refresh(true);
    const timer = setInterval(() => void refresh(true), 6000);
    return () => clearInterval(timer);
  }, [access, refresh]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      lastCountRef.current = messages.length;
      const node = scrollRef.current;
      if (node) node.scrollTop = node.scrollHeight;
      inputRef.current?.focus();
    }
  }, [open, messages.length]);

  const itemsTotal = useMemo(
    () => picks.reduce((sum, p) => sum + p.price * p.quantity, 0),
    [picks],
  );
  const delivery = deliveryPrice(deliveryMethod, itemsTotal);

  const start = async () => {
    if (!consent || name.trim().length < 2 || phone.trim().length < 6) return;
    setBusy(true);
    try {
      const created = await startChatSession({
        data: { name: name.trim(), phone: phone.trim(), consent: true },
      });
      localStorage.setItem(SESSION_KEY, JSON.stringify(created));
      setAccess(created);
      const state = await getChatState({ data: created });
      applyState(state);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    const value = text.trim();
    if (!value || !access || busy) return;
    setText("");
    setMessages((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}`,
        role: "user",
        content: value,
        products: [],
        created_at: new Date().toISOString(),
      },
    ]);
    setBusy(true);
    try {
      const state = await sendChatMessage({ data: { ...access, text: value } });
      applyState(state);
    } catch (error) {
      toast.error((error as Error).message);
      setText(value);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  const callOperator = async () => {
    if (!access || busy) return;
    setBusy(true);
    try {
      const state = await requestChatOperator({ data: access });
      applyState(state);
      toast.success("Сотрудник магазина скоро ответит в чате");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const addPick = (product: ChatProductRef) => {
    setPicks((prev) => {
      const existing = prev.find((p) => p.id === product.id);
      if (existing) {
        return prev.map((p) => (p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p));
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    toast.success("Добавлено в подборку");
  };

  const setPickQuantity = (id: string, quantity: number) => {
    setPicks((prev) =>
      quantity <= 0
        ? prev.filter((p) => p.id !== id)
        : prev.map((p) => (p.id === id ? { ...p, quantity } : p)),
    );
  };

  const submitOrder = async () => {
    if (!access || picks.length === 0) return;
    if (deliveryMethod !== "pickup" && address.trim().length < 5) {
      toast.error("Укажите адрес доставки");
      return;
    }
    setBusy(true);
    try {
      const result = await createChatOrder({
        data: {
          ...access,
          deliveryMethod: deliveryMethod as "courier_mkad" | "courier_outside" | "pickup",
          address: address.trim(),
          deliveryDate: deliveryDate.trim(),
          comment: comment.trim(),
          items: picks.map((p) => ({ productId: p.id, quantity: p.quantity })),
        },
      });
      setPicks([]);
      setShowOrder(false);
      setAddress("");
      setDeliveryDate("");
      setComment("");
      toast.success(`Заказ ${result.orderNumber} оформлен`);
      await refresh();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!hydrated) return null;

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Открыть чат с консультантом"
          className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:scale-105"
        >
          <MessageCircle className="h-6 w-6" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-medium text-destructive-foreground">
              {unread}
            </span>
          )}
        </button>
      )}

      {open && (
        <div className="fixed inset-x-3 bottom-3 z-50 flex max-h-[85vh] flex-col overflow-hidden rounded-3xl border border-border/70 bg-card shadow-2xl sm:inset-x-auto sm:right-5 sm:bottom-5 sm:h-[620px] sm:w-[400px]">
          <header className="flex items-center gap-3 border-b border-border/60 bg-secondary/40 px-4 py-3">
            <Blossom className="h-8 w-8" />
            <div className="min-w-0">
              <p className="truncate font-display text-lg leading-none">Весна на связи</p>
              <p className="truncate text-xs text-muted-foreground">{CHAT_STATUS_LABELS[status]}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto"
              aria-label="Закрыть чат"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </header>

          {!access ? (
            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
              <p className="text-sm text-muted-foreground">
                Подберём товары, посчитаем сумму и оформим заказ. Оставьте, как к вам обращаться и
                телефон для связи.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="chat-name">Имя</Label>
                <Input
                  id="chat-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Анна"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="chat-phone">Телефон</Label>
                <Input
                  id="chat-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+7 999 000-00-00"
                />
              </div>
              <label className="flex items-start gap-3 text-xs text-muted-foreground">
                <Checkbox
                  checked={consent}
                  onCheckedChange={(value) => setConsent(value === true)}
                  className="mt-0.5"
                />
                <span>
                  Согласен на обработку персональных данных и принимаю{" "}
                  <Link to="/privacy" className="underline">
                    политику конфиденциальности
                  </Link>
                  .
                </span>
              </label>
              <Button
                className="w-full rounded-full"
                disabled={!consent || name.trim().length < 2 || phone.trim().length < 6 || busy}
                onClick={() => void start()}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Начать чат"}
              </Button>
            </div>
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} onAdd={addPick} />
                ))}
                {busy && (
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Весна печатает…
                  </p>
                )}
              </div>

              {picks.length > 0 && (
                <div className="border-t border-border/60 bg-secondary/30 px-4 py-3">
                  <p className="flex items-center gap-2 text-xs font-medium">
                    <ShoppingBasket className="h-3.5 w-3.5" /> Подборка
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {picks.map((pick) => (
                      <li key={pick.id} className="flex items-center gap-2 text-xs">
                        <span className="min-w-0 flex-1 truncate">{pick.title}</span>
                        <button
                          type="button"
                          aria-label="Меньше"
                          className="rounded-full border border-border p-1"
                          onClick={() => setPickQuantity(pick.id, pick.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-4 text-center tabular-nums">{pick.quantity}</span>
                        <button
                          type="button"
                          aria-label="Больше"
                          className="rounded-full border border-border p-1"
                          onClick={() => setPickQuantity(pick.id, pick.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        <span className="w-16 text-right tabular-nums">
                          {formatPrice(pick.price * pick.quantity)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Товары {formatPrice(itemsTotal)} · доставка{" "}
                    {delivery === 0 ? "бесплатно" : formatPrice(delivery)} · итог{" "}
                    <span className="font-medium text-foreground">
                      {formatPrice(itemsTotal + delivery)}
                    </span>
                  </p>

                  {showOrder ? (
                    <div className="mt-3 space-y-2">
                      <select
                        value={deliveryMethod}
                        onChange={(e) => setDeliveryMethod(e.target.value)}
                        className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
                        aria-label="Способ доставки"
                      >
                        {DELIVERY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {deliveryMethod !== "pickup" && (
                        <Input
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="Адрес доставки"
                          className="h-9 text-xs"
                        />
                      )}
                      <Input
                        value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                        placeholder="Желаемая дата и время"
                        className="h-9 text-xs"
                      />
                      <Textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Комментарий"
                        className="min-h-16 text-xs"
                      />
                      <div className="flex gap-2">
                        <Button
                          className="flex-1 rounded-full"
                          size="sm"
                          disabled={busy}
                          onClick={() => void submitOrder()}
                        >
                          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Подтвердить заказ"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-full"
                          onClick={() => setShowOrder(false)}
                        >
                          Отмена
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      className="mt-2 w-full rounded-full"
                      size="sm"
                      onClick={() => setShowOrder(true)}
                    >
                      Оформить заказ
                    </Button>
                  )}
                </div>
              )}

              <div className="border-t border-border/60 px-3 py-3">
                <div className="flex items-end gap-2">
                  <Textarea
                    ref={inputRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void send();
                      }
                    }}
                    placeholder={
                      status === "closed" ? "Чат закрыт" : "Напишите, что вы ищете…"
                    }
                    disabled={status === "closed"}
                    className="min-h-10 max-h-28 flex-1 resize-none text-sm"
                  />
                  <Button
                    size="icon"
                    className="rounded-full"
                    aria-label="Отправить"
                    disabled={busy || !text.trim() || status === "closed"}
                    onClick={() => void send()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <button
                  type="button"
                  onClick={() => void callOperator()}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground underline-offset-4 hover:underline"
                >
                  <Headset className="h-3.5 w-3.5" /> Позвать живого оператора
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

function MessageBubble({
  message,
  onAdd,
}: {
  message: ChatMessage;
  onAdd: (product: ChatProductRef) => void;
}) {
  if (message.role === "system") {
    return (
      <p className="text-center text-[11px] uppercase tracking-wide text-muted-foreground">
        {message.content}
      </p>
    );
  }

  const isUser = message.role === "user";

  return (
    <div className={cn("flex flex-col gap-2", isUser ? "items-end" : "items-start")}>
      {message.role === "operator" && (
        <span className="text-[11px] text-muted-foreground">Сотрудник магазина</span>
      )}
      <div
        className={cn(
          "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : message.role === "operator"
              ? "bg-secondary text-foreground"
              : "text-foreground",
        )}
      >
        {message.content}
      </div>
      {message.products.length > 0 && (
        <div className="grid w-full gap-2">
          {message.products.map((product) => (
            <div
              key={product.id}
              className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background p-2"
            >
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.title}
                  className="h-12 w-12 rounded-xl object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="h-12 w-12 rounded-xl bg-secondary" />
              )}
              <div className="min-w-0 flex-1">
                <Link
                  to="/catalog/$slug"
                  params={{ slug: product.slug }}
                  className="block truncate text-xs font-medium hover:underline"
                >
                  {product.title}
                </Link>
                <p className="text-xs text-muted-foreground">{formatPrice(product.price)}</p>
              </div>
              <Button size="sm" variant="secondary" className="rounded-full text-xs" onClick={() => onAdd(product)}>
                В подборку
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
