import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Branch } from "@/components/botanical";
import { ProductCard } from "@/components/product-card";
import { SiteShell } from "@/components/site-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { getProductBySlug } from "@/lib/shop.functions";

export const Route = createFileRoute("/catalog/$slug")({
  loader: async ({ params }) => {
    const result = await getProductBySlug({ data: { slug: params.slug } });
    if (!result.product) throw notFound();
    return result;
  },
  head: ({ loaderData }) => {
    const title = loaderData?.product
      ? `${loaderData.product.title} — Московская весна`
      : "Товар — Московская весна";
    const description =
      loaderData?.product?.subtitle ||
      loaderData?.product?.description?.slice(0, 150) ||
      "Эко-товар ручной работы с доставкой по Москве.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const { product, related } = Route.useLoaderData();
  const { add } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [active, setActive] = useState(0);

  if (!product) return null;
  const images = product.images?.length ? product.images : ["/hero.jpg"];

  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-5 pt-8 text-sm text-muted-foreground">
        <Link to="/catalog" search={{}} className="hover:text-foreground">
          Каталог
        </Link>
        <span> / {product.title}</span>
      </div>

      <section className="mx-auto grid max-w-6xl gap-12 px-5 py-10 md:grid-cols-2">
        <div>
          <img
            src={images[active]}
            alt={product.title}
            className="blob-frame aspect-square w-full object-cover shadow-petal"
          />
          {images.length > 1 ? (
            <div className="mt-4 flex gap-3">
              {images.map((image, i) => (
                <button
                  key={image}
                  onClick={() => setActive(i)}
                  className={`h-20 w-20 overflow-hidden rounded-2xl border ${i === active ? "border-primary" : "border-border"}`}
                >
                  <img src={image} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div>
          <div className="flex flex-wrap gap-1.5">
            {product.tags?.map((tag) => (
              <Badge key={tag} variant="secondary" className="rounded-full font-normal">
                {tag}
              </Badge>
            ))}
          </div>
          <h1 className="mt-4 font-display text-5xl leading-tight">{product.title}</h1>
          {product.subtitle ? (
            <p className="mt-2 text-muted-foreground">{product.subtitle}</p>
          ) : null}

          <p className="mt-6 font-display text-3xl">
            {formatPrice(product.price)}
            {product.old_price ? (
              <span className="ml-3 text-lg text-muted-foreground line-through">
                {formatPrice(product.old_price)}
              </span>
            ) : null}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 rounded-full border border-border px-4 py-2">
              <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Меньше">
                −
              </button>
              <span className="w-6 text-center tabular-nums">{quantity}</span>
              <button onClick={() => setQuantity((q) => Math.min(99, q + 1))} aria-label="Больше">
                +
              </button>
            </div>
            <Button
              size="lg"
              className="rounded-full px-8"
              disabled={product.stock <= 0}
              onClick={() => {
                add(
                  {
                    productId: product.id,
                    slug: product.slug,
                    title: product.title,
                    price: product.price,
                    image: images[0] ?? null,
                  },
                  quantity,
                );
                toast.success("Добавлено в корзину");
              }}
            >
              {product.stock > 0 ? "В корзину" : "Нет в наличии"}
            </Button>
          </div>

          <p className="mt-8 whitespace-pre-line leading-relaxed text-muted-foreground">
            {product.description}
          </p>

          {product.composition ? (
            <div className="mt-8">
              <p className="eyebrow">состав</p>
              <p className="mt-2 text-sm text-muted-foreground">{product.composition}</p>
            </div>
          ) : null}
          {product.care ? (
            <div className="mt-6">
              <p className="eyebrow">уход и хранение</p>
              <p className="mt-2 text-sm text-muted-foreground">{product.care}</p>
            </div>
          ) : null}
          <Branch className="mt-10 h-16 w-48" />
        </div>
      </section>

      {related.length ? (
        <section className="mx-auto max-w-6xl px-5 pb-16">
          <h2 className="font-display text-3xl">С этим часто берут</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((item, i) => (
              <ProductCard key={item.id} product={item} alt={i % 2 === 1} />
            ))}
          </div>
        </section>
      ) : null}
    </SiteShell>
  );
}
