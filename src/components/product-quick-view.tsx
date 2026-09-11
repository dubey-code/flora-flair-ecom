import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/shop-types";

export function ProductQuickView({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  const { add } = useCart();

  return (
    <Dialog open={Boolean(product)} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="max-w-3xl overflow-hidden rounded-3xl p-0">
        {product ? (
          <div className="grid gap-0 md:grid-cols-2">
            <img
              src={product.images?.[0] ?? "/hero.jpg"}
              alt={product.title}
              className="h-full max-h-[70vh] w-full object-cover"
            />
            <div className="flex flex-col gap-4 p-7">
              <DialogHeader className="space-y-1 text-left">
                <DialogTitle className="font-display text-3xl">{product.title}</DialogTitle>
                {product.subtitle ? (
                  <p className="text-sm text-muted-foreground">{product.subtitle}</p>
                ) : null}
              </DialogHeader>

              <div className="flex flex-wrap gap-1.5">
                {product.tags?.map((tag) => (
                  <Badge key={tag} variant="secondary" className="rounded-full font-normal">
                    {tag}
                  </Badge>
                ))}
              </div>

              <p className="max-h-40 overflow-y-auto text-sm leading-relaxed text-muted-foreground">
                {product.description}
              </p>

              <p className="font-display text-2xl">{formatPrice(product.price)}</p>

              <div className="mt-auto flex flex-wrap gap-2">
                <Button
                  className="rounded-full"
                  disabled={product.stock <= 0}
                  onClick={() => {
                    add({
                      productId: product.id,
                      slug: product.slug,
                      title: product.title,
                      price: product.price,
                      image: product.images?.[0] ?? null,
                    });
                    toast.success("Добавлено в корзину");
                    onClose();
                  }}
                >
                  В корзину
                </Button>
                <Button asChild variant="outline" className="rounded-full">
                  <Link to="/catalog/$slug" params={{ slug: product.slug }}>
                    Подробнее
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
