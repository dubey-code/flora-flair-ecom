import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { SiteShell } from "@/components/site-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  adminDeleteCategory,
  adminDeleteProduct,
  adminListOrders,
  adminListProducts,
  adminSaveCategory,
  adminSaveProduct,
  adminUpdateOrderStatus,
  getAdminStatus,
} from "@/lib/admin.functions";
import { ORDER_STATUSES, formatDate, formatPrice, statusLabel } from "@/lib/format";
import type { Category, Product } from "@/lib/shop-types";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Панель управления — Московская весна" },
      { name: "description", content: "Управление товарами, категориями и заказами магазина." },
      { property: "og:title", content: "Панель управления — Московская весна" },
      { property: "og:description", content: "Внутренний раздел магазина." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

const emptyProduct = {
  id: "",
  slug: "",
  title: "",
  subtitle: "",
  description: "",
  composition: "",
  care: "",
  price: 0,
  oldPrice: "" as string | number,
  categoryId: "",
  tags: "",
  images: "",
  stock: 0,
  published: true,
  featured: false,
};

function AdminPage() {
  const [session, setSession] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((_event, next) =>
      setSession(Boolean(next)),
    );
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === null) {
    return (
      <SiteShell>
        <p className="mx-auto max-w-md px-5 py-24 text-center text-muted-foreground">Загрузка…</p>
      </SiteShell>
    );
  }

  return <SiteShell>{session ? <AdminArea /> : <SignIn />}</SiteShell>;
}

function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"in" | "up">("in");

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const action =
      mode === "in"
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password });
    const { error } = await action;
    setBusy(false);
    if (error) toast.error(error.message);
    else if (mode === "up") toast.success("Аккаунт создан. Попросите выдать права администратора.");
  };

  return (
    <section className="mx-auto max-w-md px-5 py-20">
      <p className="eyebrow">служебный вход</p>
      <h1 className="mt-3 font-display text-4xl">Панель управления</h1>
      <form onSubmit={onSubmit} className="petal-card mt-8 space-y-4 bg-card p-7 shadow-soft">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="password">Пароль</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5"
          />
        </div>
        <Button type="submit" disabled={busy} className="w-full rounded-full">
          {mode === "in" ? "Войти" : "Создать аккаунт"}
        </Button>
        <button
          type="button"
          onClick={() => setMode(mode === "in" ? "up" : "in")}
          className="w-full text-sm text-muted-foreground hover:text-foreground"
        >
          {mode === "in" ? "Нет аккаунта? Зарегистрироваться" : "Уже есть аккаунт? Войти"}
        </button>
      </form>
    </section>
  );
}

function AdminArea() {
  const status = useQuery({ queryKey: ["admin-status"], queryFn: () => getAdminStatus() });

  if (status.isLoading) {
    return <p className="mx-auto max-w-md px-5 py-24 text-center text-muted-foreground">Проверяем доступ…</p>;
  }

  if (!status.data?.isAdmin) {
    return (
      <section className="mx-auto max-w-md px-5 py-20 text-center">
        <h1 className="font-display text-3xl">Нет прав администратора</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Ваш аккаунт вошёл, но не имеет роли администратора. Сообщите владельцу магазина — роль
          выдаётся в базе данных.
        </p>
        <Button
          variant="outline"
          className="mt-6 rounded-full"
          onClick={() => supabase.auth.signOut()}
        >
          Выйти
        </Button>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-5 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">админ-панель</p>
          <h1 className="mt-2 font-display text-4xl">Магазин изнутри</h1>
        </div>
        <Button variant="outline" className="rounded-full" onClick={() => supabase.auth.signOut()}>
          Выйти
        </Button>
      </div>

      <Tabs defaultValue="products" className="mt-8">
        <TabsList>
          <TabsTrigger value="products">Товары</TabsTrigger>
          <TabsTrigger value="categories">Категории</TabsTrigger>
          <TabsTrigger value="orders">Заказы</TabsTrigger>
        </TabsList>
        <TabsContent value="products">
          <ProductsTab />
        </TabsContent>
        <TabsContent value="categories">
          <CategoriesTab />
        </TabsContent>
        <TabsContent value="orders">
          <OrdersTab />
        </TabsContent>
      </Tabs>
    </section>
  );
}

function useAdminData() {
  return useQuery({ queryKey: ["admin-products"], queryFn: () => adminListProducts() });
}

function ProductsTab() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useAdminData();
  const save = useServerFn(adminSaveProduct);
  const del = useServerFn(adminDeleteProduct);
  const [form, setForm] = useState(emptyProduct);

  const reset = () => setForm(emptyProduct);
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-products"] });
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          ...(form.id ? { id: form.id } : {}),
          slug: form.slug.trim(),
          title: form.title.trim(),
          subtitle: form.subtitle.trim(),
          description: form.description.trim(),
          composition: form.composition.trim(),
          care: form.care.trim(),
          price: Number(form.price) || 0,
          oldPrice: form.oldPrice === "" ? null : Number(form.oldPrice),
          categoryId: form.categoryId || null,
          tags: form.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          images: form.images
            .split(/[\n,]/)
            .map((t) => t.trim())
            .filter(Boolean),
          stock: Number(form.stock) || 0,
          published: form.published,
          featured: form.featured,
        },
      }),
    onSuccess: () => {
      toast.success("Товар сохранён");
      reset();
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Товар удалён");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const edit = (product: Product) =>
    setForm({
      id: product.id,
      slug: product.slug,
      title: product.title,
      subtitle: product.subtitle ?? "",
      description: product.description ?? "",
      composition: product.composition ?? "",
      care: product.care ?? "",
      price: product.price,
      oldPrice: product.old_price ?? "",
      categoryId: product.category_id ?? "",
      tags: (product.tags ?? []).join(", "),
      images: (product.images ?? []).join("\n"),
      stock: product.stock,
      published: product.published,
      featured: product.featured,
    });

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-3">
        {isLoading ? <p className="text-sm text-muted-foreground">Загрузка…</p> : null}
        {(data?.products ?? []).map((product) => (
          <article
            key={product.id}
            className="flex items-center gap-4 rounded-3xl border border-border bg-card p-4"
          >
            <img
              src={product.images?.[0] ?? "/hero.jpg"}
              alt=""
              className="h-16 w-16 rounded-2xl object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-lg">{product.title}</p>
              <p className="text-xs text-muted-foreground">
                {formatPrice(product.price)} · остаток {product.stock} ·{" "}
                {data?.categories.find((c) => c.id === product.category_id)?.title ?? "без категории"}
              </p>
            </div>
            {!product.published ? (
              <Badge variant="secondary" className="rounded-full">
                Скрыт
              </Badge>
            ) : null}
            <Button size="sm" variant="ghost" onClick={() => edit(product)}>
              Изменить
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive"
              onClick={() => {
                if (confirm(`Удалить «${product.title}»?`)) deleteMutation.mutate(product.id);
              }}
            >
              Удалить
            </Button>
          </article>
        ))}
      </div>

      <aside className="h-fit rounded-3xl border border-border bg-card p-6 lg:sticky lg:top-24">
        <h2 className="font-display text-2xl">{form.id ? "Редактирование" : "Новый товар"}</h2>
        <div className="mt-4 space-y-3 text-sm">
          <Field label="Название" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
          <Field
            label="Адрес (латиницей)"
            value={form.slug}
            onChange={(v) => setForm({ ...form, slug: v })}
          />
          <Field
            label="Подзаголовок"
            value={form.subtitle}
            onChange={(v) => setForm({ ...form, subtitle: v })}
          />
          <div>
            <Label>Описание</Label>
            <Textarea
              rows={4}
              className="mt-1.5"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <Field
            label="Состав"
            value={form.composition}
            onChange={(v) => setForm({ ...form, composition: v })}
          />
          <Field label="Уход" value={form.care} onChange={(v) => setForm({ ...form, care: v })} />
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Цена, ₽"
              value={String(form.price)}
              onChange={(v) => setForm({ ...form, price: Number(v) || 0 })}
            />
            <Field
              label="Старая цена"
              value={String(form.oldPrice)}
              onChange={(v) => setForm({ ...form, oldPrice: v })}
            />
          </div>
          <div>
            <Label>Категория</Label>
            <select
              className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            >
              <option value="">Без категории</option>
              {(data?.categories ?? []).map((c: Category) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
          <Field
            label="Теги через запятую"
            value={form.tags}
            onChange={(v) => setForm({ ...form, tags: v })}
          />
          <div>
            <Label>Ссылки на фото (по одной в строке)</Label>
            <Textarea
              rows={3}
              className="mt-1.5"
              value={form.images}
              onChange={(e) => setForm({ ...form, images: e.target.value })}
            />
          </div>
          <Field
            label="Остаток"
            value={String(form.stock)}
            onChange={(v) => setForm({ ...form, stock: Number(v) || 0 })}
          />
          <label className="flex items-center justify-between">
            <span>Опубликован</span>
            <Switch
              checked={form.published}
              onCheckedChange={(v) => setForm({ ...form, published: v })}
            />
          </label>
          <label className="flex items-center justify-between">
            <span>В витрине на главной</span>
            <Switch
              checked={form.featured}
              onCheckedChange={(v) => setForm({ ...form, featured: v })}
            />
          </label>
        </div>
        <div className="mt-5 flex gap-2">
          <Button
            className="rounded-full"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            Сохранить
          </Button>
          {form.id ? (
            <Button variant="ghost" className="rounded-full" onClick={reset}>
              Отмена
            </Button>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

function CategoriesTab() {
  const queryClient = useQueryClient();
  const { data } = useAdminData();
  const save = useServerFn(adminSaveCategory);
  const del = useServerFn(adminDeleteCategory);
  const [form, setForm] = useState({ id: "", slug: "", title: "", description: "", sortOrder: 0 });

  const reset = () => setForm({ id: "", slug: "", title: "", description: "", sortOrder: 0 });
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-products"] });
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          ...(form.id ? { id: form.id } : {}),
          slug: form.slug.trim(),
          title: form.title.trim(),
          description: form.description.trim(),
          sortOrder: Number(form.sortOrder) || 0,
        },
      }),
    onSuccess: () => {
      toast.success("Категория сохранена");
      reset();
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Категория удалена, товары остались без категории");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
      <div className="space-y-3">
        {(data?.categories ?? []).map((category: Category) => (
          <article
            key={category.id}
            className="flex items-center gap-4 rounded-3xl border border-border bg-card p-4"
          >
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg">{category.title}</p>
              <p className="text-xs text-muted-foreground">
                /{category.slug} · товаров:{" "}
                {(data?.products ?? []).filter((p) => p.category_id === category.id).length}
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                setForm({
                  id: category.id,
                  slug: category.slug,
                  title: category.title,
                  description: category.description ?? "",
                  sortOrder: category.sort_order,
                })
              }
            >
              Переименовать
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive"
              onClick={() => {
                if (confirm(`Удалить категорию «${category.title}»?`))
                  deleteMutation.mutate(category.id);
              }}
            >
              Удалить
            </Button>
          </article>
        ))}
      </div>

      <aside className="h-fit rounded-3xl border border-border bg-card p-6 lg:sticky lg:top-24">
        <h2 className="font-display text-2xl">{form.id ? "Изменить категорию" : "Новая категория"}</h2>
        <div className="mt-4 space-y-3 text-sm">
          <Field label="Название" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
          <Field
            label="Адрес (латиницей)"
            value={form.slug}
            onChange={(v) => setForm({ ...form, slug: v })}
          />
          <Field
            label="Описание"
            value={form.description}
            onChange={(v) => setForm({ ...form, description: v })}
          />
          <Field
            label="Порядок"
            value={String(form.sortOrder)}
            onChange={(v) => setForm({ ...form, sortOrder: Number(v) || 0 })}
          />
        </div>
        <div className="mt-5 flex gap-2">
          <Button
            className="rounded-full"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            Сохранить
          </Button>
          {form.id ? (
            <Button variant="ghost" className="rounded-full" onClick={reset}>
              Отмена
            </Button>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

function OrdersTab() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => adminListOrders(),
  });
  const update = useServerFn(adminUpdateOrderStatus);

  const statusMutation = useMutation({
    mutationFn: (input: { id: string; status: string }) => update({ data: input }),
    onSuccess: () => {
      toast.success("Статус обновлён");
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading) return <p className="mt-6 text-sm text-muted-foreground">Загрузка…</p>;

  const orders = data?.orders ?? [];
  if (orders.length === 0)
    return <p className="mt-6 text-sm text-muted-foreground">Заказов пока нет.</p>;

  return (
    <div className="mt-6 space-y-4">
      {orders.map((order) => (
        <article key={order.id} className="rounded-3xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-display text-xl">{order.order_number}</p>
            <Badge variant="secondary" className="rounded-full">
              {statusLabel(order.status)}
            </Badge>
            <span className="text-xs text-muted-foreground">{formatDate(order.created_at)}</span>
            <p className="ml-auto font-display text-xl">{formatPrice(order.total)}</p>
          </div>

          <div className="mt-4 grid gap-4 text-sm md:grid-cols-2">
            <div className="text-muted-foreground">
              <p className="text-foreground">{order.customer_name}</p>
              <p>{order.phone}</p>
              {order.email ? <p>{order.email}</p> : null}
              <p className="mt-2">
                {order.delivery_method === "pickup" ? "Самовывоз" : order.address}
              </p>
              {order.delivery_date ? <p>Дата: {order.delivery_date}</p> : null}
              {order.comment ? <p className="mt-2 italic">{order.comment}</p> : null}
            </div>
            <ul className="space-y-1 text-muted-foreground">
              {(order.order_items ?? []).map((item) => (
                <li key={item.id} className="flex justify-between gap-3">
                  <span>
                    {item.title} × {item.quantity}
                  </span>
                  <span>{formatPrice(item.price * item.quantity)}</span>
                </li>
              ))}
              <li className="flex justify-between gap-3 border-t border-border pt-1">
                <span>Доставка</span>
                <span>{formatPrice(order.delivery_price)}</span>
              </li>
            </ul>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {ORDER_STATUSES.map((option) => (
              <Button
                key={option.value}
                size="sm"
                variant={order.status === option.value ? "default" : "outline"}
                className="rounded-full"
                onClick={() => statusMutation.mutate({ id: order.id, status: option.value })}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input className="mt-1.5" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
