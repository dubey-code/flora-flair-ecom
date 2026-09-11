import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { ChatSessionState } from "@/lib/chat-types";
import { formatPrice } from "@/lib/format";

const accessSchema = z.object({
  sessionId: z.string().uuid(),
  token: z.string().uuid(),
});

export const startChatSession = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        name: z.string().trim().min(2).max(80),
        phone: z.string().trim().min(6).max(40),
        consent: z.literal(true),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { insertMessage } = await import("@/lib/chat.server");

    const { data: session, error } = await supabaseAdmin
      .from("chat_sessions")
      .insert({ visitor_name: data.name, phone: data.phone })
      .select("id, token")
      .single();
    if (error || !session) throw new Error(error?.message ?? "Не удалось открыть чат");

    await insertMessage(
      session.id as string,
      "assistant",
      `Здравствуйте, ${data.name}! Я Весна, консультант «Московской весны». Расскажите, что ищете — подарок, уход за собой или что-то для дома, — и я подберу товары и посчитаю сумму.`,
    );

    return { sessionId: session.id as string, token: session.token as string };
  });

export const getChatState = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => accessSchema.parse(input))
  .handler(async ({ data }): Promise<ChatSessionState> => {
    const { loadSession, loadMessages } = await import("@/lib/chat.server");
    const session = await loadSession(data.sessionId, data.token);
    const messages = await loadMessages(session.id);
    return { sessionId: session.id, status: session.status, messages };
  });

export const sendChatMessage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    accessSchema.extend({ text: z.string().trim().min(1).max(2000) }).parse(input),
  )
  .handler(async ({ data }): Promise<ChatSessionState> => {
    const {
      loadSession,
      loadMessages,
      insertMessage,
      setSessionStatus,
      runAssistant,
      gatewayErrorMessage,
    } = await import("@/lib/chat.server");

    const session = await loadSession(data.sessionId, data.token);
    if (session.status === "closed") throw new Error("Чат закрыт");

    await insertMessage(session.id, "user", data.text);
    let messages = await loadMessages(session.id);

    if (session.status === "bot") {
      try {
        const answer = await runAssistant(session, messages);
        await insertMessage(session.id, "assistant", answer.content, answer.products);
        if (answer.needsOperator) {
          await setSessionStatus(session.id, "needs_operator");
          await insertMessage(
            session.id,
            "system",
            "Консультант передал обращение сотруднику магазина.",
          );
        }
      } catch (error) {
        console.error("[chat] assistant failed", error);
        await insertMessage(session.id, "assistant", gatewayErrorMessage(error));
        await setSessionStatus(session.id, "needs_operator");
      }
      messages = await loadMessages(session.id);
    }

    const fresh = await loadSession(data.sessionId, data.token);
    return { sessionId: session.id, status: fresh.status, messages };
  });

export const requestChatOperator = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => accessSchema.parse(input))
  .handler(async ({ data }): Promise<ChatSessionState> => {
    const { loadSession, loadMessages, insertMessage, setSessionStatus } = await import(
      "@/lib/chat.server"
    );
    const session = await loadSession(data.sessionId, data.token);
    if (session.status === "bot" || session.status === "closed") {
      await setSessionStatus(session.id, "needs_operator");
    }
    await insertMessage(
      session.id,
      "system",
      "Покупатель просит связаться с живым сотрудником магазина.",
    );
    const messages = await loadMessages(session.id);
    return { sessionId: session.id, status: "needs_operator", messages };
  });

export const createChatOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    accessSchema
      .extend({
        deliveryMethod: z.enum(["courier_mkad", "courier_outside", "pickup"]),
        address: z.string().trim().max(400).optional().or(z.literal("")),
        deliveryDate: z.string().trim().max(80).optional().or(z.literal("")),
        comment: z.string().trim().max(600).optional().or(z.literal("")),
        items: z
          .array(z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(99) }))
          .min(1)
          .max(40),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { loadSession, insertMessage } = await import("@/lib/chat.server");

    const session = await loadSession(data.sessionId, data.token);

    const { data: rows, error } = await supabaseAdmin.rpc("create_order", {
      p_customer_name: session.visitor_name,
      p_phone: session.phone,
      p_email: "",
      p_delivery_method: data.deliveryMethod,
      p_address: data.address ?? "",
      p_delivery_date: data.deliveryDate ?? "",
      p_comment: `Оформлено через чат-консультанта. ${data.comment ?? ""}`.trim(),
      p_items: data.items,
    });
    if (error) throw new Error(error.message);

    const result = Array.isArray(rows) ? rows[0] : rows;
    if (!result) throw new Error("Не удалось создать заказ");

    const orderNumber = result.order_number as string;
    const total = Number(result.total);

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("order_number", orderNumber)
      .maybeSingle();
    if (order?.id) {
      await supabaseAdmin
        .from("chat_sessions")
        .update({ order_id: order.id as string })
        .eq("id", session.id);
    }

    await insertMessage(
      session.id,
      "system",
      `Оформлен заказ ${orderNumber} на сумму ${formatPrice(total)}.`,
    );
    await insertMessage(
      session.id,
      "assistant",
      `Готово! Ваш заказ ${orderNumber} на сумму ${formatPrice(
        total,
      )} принят. Мы позвоним по номеру ${session.phone}, чтобы подтвердить время доставки.`,
    );

    return { orderNumber, total };
  });
