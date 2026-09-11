import { Link } from "@tanstack/react-router";
import { Menu, ShoppingBag } from "lucide-react";
import { useState } from "react";

import { Blossom } from "@/components/botanical";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { useCart } from "@/lib/cart";

const NAV = [
  { to: "/", label: "Главная" },
  { to: "/catalog", label: "Каталог" },
  { to: "/delivery", label: "Доставка" },
  { to: "/offer", label: "Оферта" },
] as const;

export function SiteHeader() {
  const { count } = useCart();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-4 md:gap-6">
        <ThemeToggle />

        <Link to="/" className="flex items-center gap-3">
          <Blossom className="h-8 w-8" />
          <span className="font-display text-xl leading-none">
            Московская
            <span className="block text-sm tracking-[0.3em] text-muted-foreground">ВЕСНА</span>
          </span>
        </Link>

        <nav className="ml-auto hidden items-center gap-7 text-sm md:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
              activeOptions={{ exact: item.to === "/" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <Button asChild variant="secondary" className="rounded-full">
            <Link to="/cart">
              <ShoppingBag className="h-4 w-4" />
              <span className="tabular-nums">{count}</span>
            </Link>
          </Button>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" aria-label="Меню">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <nav className="mt-10 flex flex-col gap-5 text-lg">
                {NAV.map((item) => (
                  <Link key={item.to} to={item.to} onClick={() => setOpen(false)}>
                    {item.label}
                  </Link>
                ))}
                <Link to="/privacy" onClick={() => setOpen(false)}>
                  Политика конфиденциальности
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
