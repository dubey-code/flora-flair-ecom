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

    const { data: rows, error } = await supabase.rpc("create_order", {
      p_customer_name: data.customerName,
      p_phone: data.phone,
      p_email: data.email ?? "",
      p_delivery_method: data.deliveryMethod,
      p_address: data.address ?? "",
      p_delivery_date: data.deliveryDate ?? "",
      p_comment: data.comment ?? "",
      p_items: data.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
    });

    if (error) throw new Error(error.message);

    const result = Array.isArray(rows) ? rows[0] : rows;
    if (!result) throw new Error("Не удалось создать заказ");

    return {
      orderNumber: result.order_number as string,
      total: Number(result.total),
    };
  });
