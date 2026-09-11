import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/lib/cart";
import type { Product } from "@/lib/shop-types";
import { cn } from "@/lib/utils";

export function ProductCard({
  product,
  onQuickView,
  className,
  alt,
}: {
  product: Product;
  onQuickView?: ((product: Product) => void) | undefined;
  className?: string | undefined;
  alt?: boolean | undefined;
}) {
  const { add } = useCart();

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden bg-card shadow-soft transition-shadow hover:shadow-petal",
        alt ? "petal-card-alt" : "petal-card",
        className,
      )}
    >
      <Link to="/catalog/$slug" params={{ slug: product.slug }} className="block overflow-hidden">
        <img
          src={product.images?.[0] ?? "/hero.jpg"}
          alt={product.title}
          loading="lazy"
          className="aspect-[4/5] w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap gap-1.5">
          {product.tags?.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="secondary" className="rounded-full font-normal">
              {tag}
            </Badge>
          ))}
        </div>

        <div>
          <h3 className="font-display text-xl leading-tight">
            <Link to="/catalog/$slug" params={{ slug: product.slug }}>
              {product.title}
            </Link>
          </h3>
          {product.subtitle ? (
            <p className="mt-1 text-sm text-muted-foreground">{product.subtitle}</p>
          ) : null}
        </div>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-3">
          <p className="whitespace-nowrap text-lg">
            {formatPrice(product.price)}
            {product.old_price ? (
              <span className="ml-2 text-sm text-muted-foreground line-through">
                {formatPrice(product.old_price)}
              </span>
            ) : null}
          </p>
          <div className="flex flex-wrap gap-2">
            {onQuickView ? (
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full"
                onClick={() => onQuickView(product)}
              >
                Быстрый просмотр
              </Button>
            ) : null}
            <Button
              size="sm"
              className="rounded-full"
              disabled={product.stock <= 0}
              onClick={() =>
                add({
                  productId: product.id,
                  slug: product.slug,
                  title: product.title,
                  price: product.price,
                  image: product.images?.[0] ?? null,
                })
              }
            >
              {product.stock > 0 ? "В корзину" : "Нет в наличии"}
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
