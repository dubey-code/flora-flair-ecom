import { generateText, stepCountIs, tool } from "ai";
import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import type { ChatMessage, ChatProductRef, ChatStatus } from "@/lib/chat-types";
import { DELIVERY_OPTIONS, deliveryPrice, formatPrice } from "@/lib/format";

const MODEL = "google/gemini-3.8-flash";

export interface ChatSessionRow {
  id: string;
  token: string;
  visitor_name: string;
  phone: string;
  status: ChatStatus;
  order_id: string | null;
}

export async function loadSession(sessionId: string, token: string): Promise<ChatSessionRow> {
  const { data, error } = await supabaseAdmin
    .from("chat_sessions")
    .select("id, token, visitor_name, phone, status, order_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.token !== token) throw new Error("Чат не найден");
  return data as ChatSessionRow;
}

export async function loadMessages(sessionId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabaseAdmin
    .from("chat_messages")
    .select("id, role, content, products, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id as string,
    role: row.role as ChatMessage["role"],
    content: row.content as string,
    products: (Array.isArray(row.products) ? row.products : []) as unknown as ChatProductRef[],
    created_at: row.created_at as string,
  }));
}

export async function insertMessage(
  sessionId: string,
  role: ChatMessage["role"],
  content: string,
  products: ChatProductRef[] = [],
): Promise<void> {
  const { error } = await supabaseAdmin.from("chat_messages").insert({
    session_id: sessionId,
    role,
    content,
    products: products as unknown as never,
  });
  if (error) throw new Error(error.message);
  await supabaseAdmin
    .from("chat_sessions")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", sessionId);
}

export async function setSessionStatus(sessionId: string, status: ChatStatus): Promise<void> {
  const { error } = await supabaseAdmin
    .from("chat_sessions")
    .update({ status })
    .eq("id", sessionId);
  if (error) throw new Error(error.message);
}

const PRODUCT_FIELDS =
  "id, slug, title, subtitle, description, composition, care, price, old_price, tags, images, stock, categories(slug, title)";

interface ProductRow {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string;
  composition: string | null;
  care: string | null;
  price: number;
  old_price: number | null;
  tags: string[];
  images: string[];
  stock: number;
  categories: { slug: string; title: string } | null;
}

function toRef(row: ProductRow): ChatProductRef {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    price: row.price,
    image: row.images?.[0] ?? null,
  };
}

const DELIVERY_TEXT = DELIVERY_OPTIONS.map(
  (o) =>
    `${o.value} — ${o.label} (${o.price === 0 ? "бесплатно" : formatPrice(o.price)}${
      o.freeFrom > 0 ? `, бесплатно от ${formatPrice(o.freeFrom)}` : ""
    })`,
).join("; ");

function systemPrompt(visitorName: string): string {
  return `Ты — Весна, консультант эко-магазина «Московская весна» (Москва).
Собеседника зовут ${visitorName}, обращайся по имени и на «вы», тепло и коротко (2–5 предложений).

Правила:
- Отвечай только на русском языке.
- Товары бери ИСКЛЮЧИТЕЛЬНО из инструмента search_products / get_product. Никогда не выдумывай названия, цены и наличие.
- Задай 1–2 уточняющих вопроса (для кого, повод, бюджет, аромат), затем предложи 2–3 конкретных товара с ценами.
- Помогай собрать набор: считай сумму через инструмент quote и называй итог с доставкой.
- Способы доставки: ${DELIVERY_TEXT}. Самовывоз — Покровка 12.
- Когда покупатель готов, скажи, что нужно нажать кнопку «Оформить заказ» под подборкой — заказ оформляется там.
- Если вопрос выходит за рамки ассортимента, есть жалоба, нужен перенос/изменение заказа или ты не можешь помочь — вызови инструмент request_operator и сообщи, что подключаешь живого сотрудника.
- Не обещай сроков и скидок, которых нет в данных.`;
}

export async function runAssistant(
  session: ChatSessionRow,
  history: ChatMessage[],
): Promise<{ content: string; products: ChatProductRef[]; needsOperator: boolean }> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI не настроен");

  const collected: ChatProductRef[] = [];
  let needsOperator = false;

  const pushRefs = (rows: ProductRow[]) => {
    for (const row of rows) {
      if (!collected.some((p) => p.id === row.id)) collected.push(toRef(row));
    }
  };

  const searchProducts = tool({
    description:
      "Найти товары магазина по запросу, категории или бюджету. Возвращает только опубликованные товары.",
    inputSchema: z.object({
      query: z.string().nullable().describe("Слова для поиска, например «свеча лаванда»"),
      categorySlug: z.string().nullable().describe("uhod-kosmetika, aromaty-svechi, dom-kuhnya, zero-waste"),
      maxPrice: z.number().nullable().describe("Максимальная цена в рублях"),
    }),
    execute: async ({ query, categorySlug, maxPrice }) => {
      let request = supabaseAdmin
        .from("products")
        .select(PRODUCT_FIELDS)
        .eq("published", true)
        .limit(12);
      if (maxPrice) request = request.lte("price", maxPrice);
      const { data, error } = await request;
      if (error) return { error: error.message };
      let rows = (data ?? []) as unknown as ProductRow[];
      if (categorySlug) rows = rows.filter((r) => r.categories?.slug === categorySlug);
      if (query) {
        const words = query.toLowerCase().split(/\s+/).filter(Boolean);
        const scored = rows
          .map((r) => {
            const haystack = `${r.title} ${r.subtitle ?? ""} ${r.description} ${r.tags.join(" ")} ${
              r.categories?.title ?? ""
            }`.toLowerCase();
            return { r, score: words.filter((w) => haystack.includes(w)).length };
          })
          .filter((x) => x.score > 0)
          .sort((a, b) => b.score - a.score);
        if (scored.length > 0) rows = scored.map((x) => x.r);
      }
      rows = rows.slice(0, 6);
      pushRefs(rows);
      return {
        products: rows.map((r) => ({
          id: r.id,
          slug: r.slug,
          title: r.title,
          subtitle: r.subtitle,
          price: r.price,
          stock: r.stock,
          category: r.categories?.title ?? null,
          tags: r.tags,
        })),
      };
    },
  });

  const getProduct = tool({
    description: "Подробности одного товара по его slug: описание, состав, уход, цена, остаток.",
    inputSchema: z.object({ slug: z.string() }),
    execute: async ({ slug }) => {
      const { data, error } = await supabaseAdmin
        .from("products")
        .select(PRODUCT_FIELDS)
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (error) return { error: error.message };
      if (!data) return { error: "Товар не найден" };
      const row = data as unknown as ProductRow;
      pushRefs([row]);
      return {
        id: row.id,
        slug: row.slug,
        title: row.title,
        subtitle: row.subtitle,
        description: row.description,
        composition: row.composition,
        care: row.care,
        price: row.price,
        oldPrice: row.old_price,
        stock: row.stock,
        category: row.categories?.title ?? null,
        tags: row.tags,
      };
    },
  });

  const quote = tool({
    description: "Посчитать сумму подборки товаров и стоимость доставки по Москве.",
    inputSchema: z.object({
      items: z.array(z.object({ slug: z.string(), quantity: z.number() })),
      deliveryMethod: z.enum(["courier_mkad", "courier_outside", "pickup"]).nullable(),
    }),
    execute: async ({ items, deliveryMethod }) => {
      const slugs = items.map((i) => i.slug);
      const { data, error } = await supabaseAdmin
        .from("products")
        .select("id, slug, title, price, stock, images")
        .eq("published", true)
        .in("slug", slugs);
      if (error) return { error: error.message };
      const rows = (data ?? []) as Array<{
        id: string;
        slug: string;
        title: string;
        price: number;
        stock: number;
        images: string[];
      }>;
      const lines = items.flatMap((item) => {
        const row = rows.find((r) => r.slug === item.slug);
        if (!row) return [];
        const quantity = Math.min(Math.max(Math.round(item.quantity), 1), 99);
        return [{ title: row.title, price: row.price, quantity, sum: row.price * quantity }];
      });
      const itemsTotal = lines.reduce((sum, l) => sum + l.sum, 0);
      const method = deliveryMethod ?? "courier_mkad";
      const delivery = deliveryPrice(method, itemsTotal);
      return { lines, itemsTotal, deliveryMethod: method, delivery, total: itemsTotal + delivery };
    },
  });

  const requestOperator = tool({
    description: "Позвать живого сотрудника магазина, если ты не можешь помочь сам.",
    inputSchema: z.object({ reason: z.string() }),
    execute: async ({ reason }) => {
      needsOperator = true;
      return { ok: true, reason };
    },
  });

  const gateway = createLovableAiGatewayProvider(apiKey);

  const messages = history
    .filter((m) => m.role !== "system")
    .slice(-24)
    .map((m) => ({
      role: m.role === "user" ? ("user" as const) : ("assistant" as const),
      content: m.role === "operator" ? `Сотрудник магазина: ${m.content}` : m.content,
    }));

  const result = await generateText({
    model: gateway(MODEL),
    system: systemPrompt(session.visitor_name),
    messages,
    tools: { search_products: searchProducts, get_product: getProduct, quote, request_operator: requestOperator },
    stopWhen: stepCountIs(50),
  });

  const content =
    result.text.trim() ||
    "Я подключаю сотрудника магазина — он ответит здесь в чате в ближайшее время.";

  return { content, products: collected.slice(0, 6), needsOperator };
}

export function gatewayErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("402")) {
    return "Консультант временно недоступен: закончились кредиты ИИ. Я позову сотрудника магазина.";
  }
  if (message.includes("429")) {
    return "Слишком много запросов, попробуйте написать ещё раз через минуту.";
  }
  if (message.includes("403") || message.includes("401")) {
    return "Консультант временно недоступен. Я позову сотрудника магазина.";
  }
  return "Не получилось ответить прямо сейчас. Я позову сотрудника магазина.";
}
