import { createServerFn } from "@tanstack/react-start";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/integrations/supabase/types";
import { deliveryPrice } from "@/lib/format";
import type { Category, Product } from "@/lib/shop-types";

const PRODUCT_COLUMNS =
  "id, slug, title, subtitle, description, composition, care, price, old_price, category_id, tags, images, stock, published, featured";

function createPublicClient(): SupabaseClient<Database> {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

export const listCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = createPublicClient();
  const [products, categories] = await Promise.all([
    supabase
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("published", true)
      .order("created_at", { ascending: true }),
    supabase.from("categories").select("id, slug, title, description, sort_order").order("sort_order"),
  ]);

  if (products.error) throw new Error(products.error.message);
  if (categories.error) throw new Error(categories.error.message);

  return {
    products: (products.data ?? []) as Product[],
    categories: (categories.data ?? []) as Category[],
  };
});

export const getProductBySlug = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => z.object({ slug: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    const supabase = createPublicClient();
    const { data: product, error } = await supabase
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("slug", data.slug)
      .eq("published", true)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!product) return { product: null, related: [] as Product[] };

    const related = await supabase
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("published", true)
      .neq("id", (product as Product).id)
      .limit(4);

    return {
      product: product as Product,
      related: (related.data ?? []) as Product[],
    };
  });

const orderSchema = z.object({
  customerName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(6).max(40),
  email: z.string().trim().email().max(160).optional().or(z.literal("")),
  deliveryMethod: z.enum(["courier_mkad", "courier_outside", "pickup"]),
  address: z.string().trim().max(400).optional().or(z.literal("")),
  deliveryDate: z.string().trim().max(80).optional().or(z.literal("")),
  comment: z.string().trim().max(600).optional().or(z.literal("")),
  items: z
    .array(z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(99) }))
    .min(1)
    .max(40),
});

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => orderSchema.parse(input))
  .handler(async ({ data }) => {
    const supabase = createPublicClient();

    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, title, price, images")
      .in(
        "id",
        data.items.map((i) => i.productId),
      )
      .eq("published", true);

    if (productsError) throw new Error(productsError.message);
    if (!products || products.length === 0) throw new Error("Товары не найдены");

    const lines = data.items.flatMap((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return [];
      return [
        {
          product_id: product.id,
          title: product.title,
          price: product.price,
          quantity: item.quantity,
          image: product.images?.[0] ?? null,
        },
      ];
    });

    if (lines.length === 0) throw new Error("Товары не найдены");

    const itemsTotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
    const delivery = deliveryPrice(data.deliveryMethod, itemsTotal);

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_name: data.customerName,
        phone: data.phone,
        email: data.email || null,
        delivery_method: data.deliveryMethod,
        address: data.address || null,
        delivery_date: data.deliveryDate || null,
        comment: data.comment || null,
        items_total: itemsTotal,
        delivery_price: delivery,
        total: itemsTotal + delivery,
      })
      .select("id, order_number, total")
      .single();

    if (orderError || !order) throw new Error(orderError?.message ?? "Не удалось создать заказ");

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(lines.map((l) => ({ ...l, order_id: order.id })));

    if (itemsError) throw new Error(itemsError.message);

    return { orderNumber: order.order_number, total: order.total };
  });
