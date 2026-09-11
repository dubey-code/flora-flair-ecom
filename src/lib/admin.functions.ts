import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Order, Product } from "@/lib/shop-types";

const PRODUCT_COLUMNS =
  "id, slug, title, subtitle, description, composition, care, price, old_price, category_id, tags, images, stock, published, featured, created_at";


async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Доступ только для администраторов");
}

export const getAdminStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (error) throw new Error(error.message);
    return { isAdmin: Boolean(data), userId: context.userId };
  });

export const adminListProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const [products, categories] = await Promise.all([
      context.supabase.from("products").select(PRODUCT_COLUMNS).order("created_at", { ascending: false }),
      context.supabase
        .from("categories")
        .select("id, slug, title, description, sort_order")
        .order("sort_order"),
    ]);
    if (products.error) throw new Error(products.error.message);
    if (categories.error) throw new Error(categories.error.message);
    return { products: (products.data ?? []) as Product[], categories: categories.data ?? [] };
  });

const productSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Только латиница, цифры и дефис"),
  title: z.string().trim().min(2).max(160),
  subtitle: z.string().trim().max(160).optional().or(z.literal("")),
  description: z.string().trim().max(4000).optional().or(z.literal("")),
  composition: z.string().trim().max(1000).optional().or(z.literal("")),
  care: z.string().trim().max(1000).optional().or(z.literal("")),
  price: z.number().int().min(0).max(10_000_000),
  oldPrice: z.number().int().min(0).max(10_000_000).nullable().optional(),
  categoryId: z.string().uuid().nullable().optional().or(z.literal("")),
  tags: z.array(z.string().trim().min(1).max(40)).max(12),
  images: z.array(z.string().trim().min(1).max(500)).max(8),
  stock: z.number().int().min(0).max(100000),
  published: z.boolean(),
  featured: z.boolean(),
});

export const adminSaveProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => productSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const row = {
      slug: data.slug,
      title: data.title,
      subtitle: data.subtitle || null,
      description: data.description || "",
      composition: data.composition || null,
      care: data.care || null,
      price: data.price,
      old_price: data.oldPrice ?? null,
      category_id: data.categoryId ? data.categoryId : null,
      tags: data.tags,
      images: data.images,
      stock: data.stock,
      published: data.published,
      featured: data.featured,
    };

    if (data.id) {
      const { error } = await context.supabase.from("products").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }

    const { data: inserted, error } = await context.supabase
      .from("products")
      .insert(row)
      .select("id")
      .single();
    if (error || !inserted) throw new Error(error?.message ?? "Не удалось сохранить товар");
    return { id: inserted.id as string };
  });

export const adminDeleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminPatchProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        published: z.boolean().optional(),
        featured: z.boolean().optional(),
        stock: z.number().int().min(0).max(100000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const patch: { published?: boolean; featured?: boolean; stock?: number } = {};
    if (data.published !== undefined) patch.published = data.published;
    if (data.featured !== undefined) patch.featured = data.featured;
    if (data.stock !== undefined) patch.stock = data.stock;

    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await context.supabase.from("products").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDuplicateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: source, error } = await context.supabase
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("id", data.id)
      .single();
    if (error || !source) throw new Error(error?.message ?? "Товар не найден");

    const base = `${source.slug}-copy`;
    let slug = base;
    for (let i = 2; i < 50; i += 1) {
      const { data: clash } = await context.supabase
        .from("products")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!clash) break;
      slug = `${base}-${i}`;
    }

    const { data: inserted, error: insertError } = await context.supabase
      .from("products")
      .insert({
        slug,
        title: `${source.title} (копия)`,
        subtitle: source.subtitle,
        description: source.description,
        composition: source.composition,
        care: source.care,
        price: source.price,
        old_price: source.old_price,
        category_id: source.category_id,
        tags: source.tags,
        images: source.images,
        stock: source.stock,
        published: false,
        featured: false,
      })
      .select("id")
      .single();
    if (insertError || !inserted) throw new Error(insertError?.message ?? "Не удалось скопировать");
    return { id: inserted.id as string };
  });

export const adminDeleteImageFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { path: string }) =>
    z.object({ path: z.string().trim().min(1).max(500) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.storage.from("product-images").remove([data.path]);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("orders")
      .select(
        "id, order_number, customer_name, phone, email, delivery_method, address, delivery_date, comment, items_total, delivery_price, total, status, created_at, updated_at, order_items(id, title, price, quantity, image, product_id)",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { orders: (data ?? []) as unknown as Order[] };
  });


export const adminUpdateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; status: string }) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["new", "confirmed", "shipped", "done", "cancelled"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("orders")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const categorySchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Только латиница, цифры и дефис"),
  title: z.string().trim().min(2).max(80),
  description: z.string().trim().max(400).optional().or(z.literal("")),
  sortOrder: z.number().int().min(0).max(999),
});

export const adminSaveCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => categorySchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const row = {
      slug: data.slug,
      title: data.title,
      description: data.description || null,
      sort_order: data.sortOrder,
    };
    if (data.id) {
      const { error } = await context.supabase.from("categories").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: inserted, error } = await context.supabase
      .from("categories")
      .insert(row)
      .select("id")
      .single();
    if (error || !inserted) throw new Error(error?.message ?? "Не удалось сохранить категорию");
    return { id: inserted.id as string };
  });

export const adminDeleteCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error: unlinkError } = await context.supabase
      .from("products")
      .update({ category_id: null })
      .eq("category_id", data.id);
    if (unlinkError) throw new Error(unlinkError.message);
    const { error } = await context.supabase.from("categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListChats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("chat_sessions")
      .select(
        "id, visitor_name, phone, status, order_id, consent_at, last_message_at, created_at, orders(order_number)",
      )
      .order("last_message_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return {
      chats: (data ?? []).map((row) => ({
        id: row.id as string,
        visitorName: row.visitor_name as string,
        phone: row.phone as string,
        status: row.status as string,
        consentAt: row.consent_at as string,
        lastMessageAt: row.last_message_at as string,
        createdAt: row.created_at as string,
        orderNumber:
          (row as unknown as { orders: { order_number: string } | null }).orders?.order_number ??
          null,
      })),
    };
  });

export const adminGetChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: rows, error } = await context.supabase
      .from("chat_messages")
      .select("id, role, content, products, created_at")
      .eq("session_id", data.id)
      .order("created_at", { ascending: true })
      .limit(400);
    if (error) throw new Error(error.message);
    return {
      messages: (rows ?? []).map((row) => ({
        id: row.id as string,
        role: row.role as string,
        content: row.content as string,
        createdAt: row.created_at as string,
      })),
    };
  });

export const adminSendChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), text: z.string().trim().min(1).max(2000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const now = new Date().toISOString();
    const { error } = await context.supabase
      .from("chat_messages")
      .insert({ session_id: data.id, role: "operator", content: data.text });
    if (error) throw new Error(error.message);
    const { error: sessionError } = await context.supabase
      .from("chat_sessions")
      .update({ status: "operator", last_message_at: now })
      .eq("id", data.id);
    if (sessionError) throw new Error(sessionError.message);
    return { ok: true };
  });

export const adminSetChatStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["bot", "needs_operator", "operator", "closed"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("chat_sessions")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    const note =
      data.status === "operator"
        ? "Сотрудник магазина подключился к чату."
        : data.status === "bot"
          ? "Чат снова ведёт ИИ-консультант."
          : data.status === "closed"
            ? "Чат закрыт сотрудником магазина."
            : null;
    if (note) {
      await context.supabase
        .from("chat_messages")
        .insert({ session_id: data.id, role: "system", content: note });
    }
    return { ok: true };
  });
