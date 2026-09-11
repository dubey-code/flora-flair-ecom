import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ChatsTab } from "@/components/admin/chats-tab";
import { ImageManager } from "@/components/admin/image-manager";
import { SiteShell } from "@/components/site-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  adminDeleteCategory,
  adminDeleteImageFile,
  adminDeleteProduct,
  adminDuplicateProduct,
  adminListOrders,
  adminListProducts,
  adminPatchProduct,
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

const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i",
  й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t",
  у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "",
  э: "e", ю: "yu", я: "ya",
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .split("")
    .map((char) => (char in TRANSLIT ? TRANSLIT[char] : char))
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

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
  images: [] as string[],
  stock: 0,
  published: true,
  featured: false,
};

type ProductForm = typeof emptyProduct;

function AdminPage() {
  const [session, setSession] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(Boolean(next)));
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === null) {
    return (
      <SiteShell hideChat>
        <p className="mx-auto max-w-md px-5 py-24 text-center text-muted-foreground">Загрузка…</p>
      </SiteShell>
    );
  }

  return <SiteShell hideChat>{session ? <AdminArea /> : <SignIn />}</SiteShell>;
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
        : supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: `${window.location.origin}/admin` },
          });
    const { error } = await action;
    setBusy(false);
    if (error) toast.error(error.message);
    else if (mode === "up")
      toast.success("Аккаунт создан. Подтвердите адрес по ссылке из письма и войдите.");
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
    return (
      <p className="mx-auto max-w-md px-5 py-24 text-center text-muted-foreground">
        Проверяем доступ…
      </p>
    );
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
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-5 sm:py-12">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <p className="eyebrow">админ-панель</p>
          <h1 className="mt-2 font-display text-2xl sm:text-4xl">Магазин изнутри</h1>
        </div>
        <Button
          variant="outline"
          className="shrink-0 rounded-full"
          onClick={() => supabase.auth.signOut()}
        >
          Выйти
        </Button>
      </div>

      <Tabs defaultValue="products" className="mt-8">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="products">Товары</TabsTrigger>
          <TabsTrigger value="categories">Категории</TabsTrigger>
          <TabsTrigger value="orders">Заказы</TabsTrigger>
          <TabsTrigger value="chats">Чаты</TabsTrigger>
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
        <TabsContent value="chats">
          <ChatsTab />
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
  const patch = useServerFn(adminPatchProduct);
  const duplicate = useServerFn(adminDuplicateProduct);
  const deleteFile = useServerFn(adminDeleteImageFile);

  const [form, setForm] = useState<ProductForm | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [visibility, setVisibility] = useState("all");
  const [sort, setSort] = useState("new");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-products"] });
  };

  const saveMutation = useMutation({
    mutationFn: (current: ProductForm) =>
      save({
        data: {
          ...(current.id ? { id: current.id } : {}),
          slug: current.slug.trim() || slugify(current.title),
          title: current.title.trim(),
          subtitle: current.subtitle.trim(),
          description: current.description.trim(),
          composition: current.composition.trim(),
          care: current.care.trim(),
          price: Number(current.price) || 0,
          oldPrice: current.oldPrice === "" ? null : Number(current.oldPrice),
          categoryId: current.categoryId || null,
          tags: current.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          images: current.images.map((i) => i.trim()).filter(Boolean),
          stock: Number(current.stock) || 0,
          published: current.published,
          featured: current.featured,
        },
      }),
    onSuccess: () => {
      toast.success("Товар сохранён");
      setForm(null);
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

  const patchMutation = useMutation({
    mutationFn: (input: { id: string; published?: boolean; featured?: boolean; stock?: number }) =>
      patch({ data: input }),
    onSuccess: () => invalidate(),
    onError: (error: Error) => toast.error(error.message),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => duplicate({ data: { id } }),
    onSuccess: () => {
      toast.success("Копия создана и скрыта — отредактируйте её");
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
      images: product.images ?? [],
      stock: product.stock,
      published: product.published,
      featured: product.featured,
    });

  const products = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = (data?.products ?? []).filter((product) => {
      if (query && !`${product.title} ${product.slug}`.toLowerCase().includes(query)) return false;
      if (categoryFilter !== "all" && (product.category_id ?? "") !== categoryFilter) return false;
      if (visibility === "published" && !product.published) return false;
      if (visibility === "hidden" && product.published) return false;
      return true;
    });
    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sort === "price-asc") return a.price - b.price;
      if (sort === "price-desc") return b.price - a.price;
      if (sort === "title") return a.title.localeCompare(b.title, "ru");
      return (b.created_at ?? "").localeCompare(a.created_at ?? "");
    });
    return sorted;
  }, [data?.products, search, categoryFilter, visibility, sort]);

  return (
    <div className="mt-6 space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Button className="rounded-full" onClick={() => setForm({ ...emptyProduct })}>
          Новый товар
        </Button>
        <Input
          placeholder="Поиск по названию"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:max-w-56"
        />
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">Все категории</option>
          <option value="">Без категории</option>
          {(data?.categories ?? []).map((c: Category) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value)}
        >
          <option value="all">Все</option>
          <option value="published">Опубликованные</option>
          <option value="hidden">Скрытые</option>
        </select>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="new">Сначала новые</option>
          <option value="price-asc">Цена ↑</option>
          <option value="price-desc">Цена ↓</option>
          <option value="title">По названию</option>
        </select>
      </div>

      <div className="space-y-3">
        {isLoading ? <p className="text-sm text-muted-foreground">Загрузка…</p> : null}
        {!isLoading && products.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ничего не найдено.</p>
        ) : null}
        {products.map((product) => (
          <article
            key={product.id}
            className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 rounded-3xl border border-border bg-card p-4 sm:flex"
          >
            <img
              src={product.images?.[0] ?? "/hero.jpg"}
              alt=""
              className="h-16 w-16 shrink-0 rounded-2xl object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-lg">{product.title}</p>
              <p className="text-xs text-muted-foreground">
                {formatPrice(product.price)} ·{" "}
                {data?.categories.find((c) => c.id === product.category_id)?.title ??
                  "без категории"}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <label className="flex items-center gap-1.5">
                  остаток
                  <Input
                    type="number"
                    min={0}
                    defaultValue={product.stock}
                    className="h-8 w-20"
                    onBlur={(e) => {
                      const value = Number(e.target.value) || 0;
                      if (value !== product.stock)
                        patchMutation.mutate({ id: product.id, stock: value });
                    }}
                  />
                </label>
                <label className="flex items-center gap-1.5">
                  <Switch
                    checked={product.published}
                    onCheckedChange={(v) =>
                      patchMutation.mutate({ id: product.id, published: v })
                    }
                  />
                  на сайте
                </label>
                <label className="flex items-center gap-1.5">
                  <Switch
                    checked={product.featured}
                    onCheckedChange={(v) => patchMutation.mutate({ id: product.id, featured: v })}
                  />
                  витрина
                </label>
              </div>
            </div>
            <div className="col-span-2 flex flex-wrap items-center gap-2 sm:col-auto sm:shrink-0">
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
                onClick={() => duplicateMutation.mutate(product.id)}
              >
                Дублировать
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
            </div>
          </article>
        ))}
      </div>

      <Dialog open={form !== null} onOpenChange={(open) => (open ? null : setForm(null))}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {form?.id ? "Редактирование товара" : "Новый товар"}
            </DialogTitle>
          </DialogHeader>
          {form ? (
            <div className="space-y-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Название"
                  value={form.title}
                  onChange={(v) =>
                    setForm({
                      ...form,
                      title: v,
                      slug: form.id || form.slug ? form.slug : slugify(v),
                    })
                  }
                />
                <div>
                  <Label>Адрес страницы (латиницей)</Label>
                  <div className="mt-1.5 flex gap-2">
                    <Input
                      value={form.slug}
                      onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0 rounded-full"
                      onClick={() => setForm({ ...form, slug: slugify(form.title) })}
                    >
                      Из названия
                    </Button>
                  </div>
                </div>
              </div>

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
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Состав"
                  value={form.composition}
                  onChange={(v) => setForm({ ...form, composition: v })}
                />
                <Field
                  label="Уход"
                  value={form.care}
                  onChange={(v) => setForm({ ...form, care: v })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
                <Field
                  label="Остаток"
                  value={String(form.stock)}
                  onChange={(v) => setForm({ ...form, stock: Number(v) || 0 })}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
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
              </div>

              <ImageManager
                images={form.images}
                onChange={(next) => setForm({ ...form, images: next })}
                onDeleteFile={(path) => {
                  deleteFile({ data: { path } }).catch(() => undefined);
                }}
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

              <div className="flex gap-2 pt-2">
                <Button
                  className="rounded-full"
                  disabled={saveMutation.isPending}
                  onClick={() => saveMutation.mutate(form)}
                >
                  Сохранить
                </Button>
                <Button variant="ghost" className="rounded-full" onClick={() => setForm(null)}>
                  Отмена
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CategoriesTab() {
  const queryClient = useQueryClient();
  const { data } = useAdminData();
  const save = useServerFn(adminSaveCategory);
  const del = useServerFn(adminDeleteCategory);
  const empty = { id: "", slug: "", title: "", description: "", sortOrder: 0 };
  const [form, setForm] = useState<typeof empty | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-products"] });
  };

  const saveMutation = useMutation({
    mutationFn: (current: typeof empty) =>
      save({
        data: {
          ...(current.id ? { id: current.id } : {}),
          slug: current.slug.trim() || slugify(current.title),
          title: current.title.trim(),
          description: current.description.trim(),
          sortOrder: Number(current.sortOrder) || 0,
        },
      }),
    onSuccess: () => {
      toast.success("Категория сохранена");
      setForm(null);
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
    <div className="mt-6 space-y-5">
      <Button className="rounded-full" onClick={() => setForm({ ...empty })}>
        Новая категория
      </Button>

      <div className="space-y-3">
        {(data?.categories ?? []).map((category: Category) => {
          const count = (data?.products ?? []).filter((p) => p.category_id === category.id).length;
          return (
            <article
              key={category.id}
              className="flex flex-wrap items-center gap-3 rounded-3xl border border-border bg-card p-4 sm:gap-4"
            >
              <div className="min-w-0 flex-1 basis-full sm:basis-auto">
                <p className="truncate font-display text-lg">{category.title}</p>
                <p className="text-xs text-muted-foreground">
                  /{category.slug} · товаров: {count}
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
                  const message =
                    count > 0
                      ? `В категории «${category.title}» ${count} товаров — они останутся без категории. Удалить?`
                      : `Удалить категорию «${category.title}»?`;
                  if (confirm(message)) deleteMutation.mutate(category.id);
                }}
              >
                Удалить
              </Button>
            </article>
          );
        })}
      </div>

      <Dialog open={form !== null} onOpenChange={(open) => (open ? null : setForm(null))}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {form?.id ? "Изменить категорию" : "Новая категория"}
            </DialogTitle>
          </DialogHeader>
          {form ? (
            <div className="space-y-3 text-sm">
              <Field
                label="Название"
                value={form.title}
                onChange={(v) =>
                  setForm({ ...form, title: v, slug: form.id || form.slug ? form.slug : slugify(v) })
                }
              />
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
              <div className="flex gap-2 pt-2">
                <Button
                  className="rounded-full"
                  disabled={saveMutation.isPending}
                  onClick={() => saveMutation.mutate(form)}
                >
                  Сохранить
                </Button>
                <Button variant="ghost" className="rounded-full" onClick={() => setForm(null)}>
                  Отмена
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
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
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const statusMutation = useMutation({
    mutationFn: (input: { id: string; status: string }) => update({ data: input }),
    onSuccess: () => {
      toast.success("Статус обновлён");
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const all = data?.orders ?? [];

  const stats = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    let fresh = 0;
    let inWork = 0;
    let done = 0;
    let today = 0;
    let month = 0;
    for (const order of all) {
      const created = new Date(order.created_at).getTime();
      if (order.status === "new") fresh += 1;
      if (order.status === "confirmed" || order.status === "shipped") inWork += 1;
      if (order.status === "done") done += 1;
      if (order.status !== "cancelled") {
        if (created >= startOfDay) today += order.total;
        if (created >= startOfMonth) month += order.total;
      }
    }
    return { fresh, inWork, done, today, month };
  }, [all]);

  const orders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return all.filter((order) => {
      if (statusFilter !== "all" && order.status !== statusFilter) return false;
      if (
        query &&
        !`${order.order_number} ${order.customer_name} ${order.phone} ${order.email ?? ""}`
          .toLowerCase()
          .includes(query)
      )
        return false;
      return true;
    });
  }, [all, statusFilter, search]);

  if (isLoading) return <p className="mt-6 text-sm text-muted-foreground">Загрузка…</p>;

  return (
    <div className="mt-6 space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Новые" value={String(stats.fresh)} />
        <Stat label="В работе" value={String(stats.inWork)} />
        <Stat label="Выполнены" value={String(stats.done)} />
        <Stat label="Сегодня" value={formatPrice(stats.today)} />
        <Stat label="За месяц" value={formatPrice(stats.month)} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Номер, имя, телефон"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:max-w-64"
        />
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Все статусы</option>
          {ORDER_STATUSES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">Заказов не найдено.</p>
      ) : null}

      {orders.map((order) => (
        <article key={order.id} className="rounded-3xl border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-display text-xl">{order.order_number}</p>
            <Badge variant="secondary" className="rounded-full">
              {statusLabel(order.status)}
            </Badge>
            <span className="text-xs text-muted-foreground">{formatDate(order.created_at)}</span>
            {order.updated_at && order.updated_at !== order.created_at ? (
              <span className="text-xs text-muted-foreground">
                · изменён {formatDate(order.updated_at)}
              </span>
            ) : null}
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
            <ul className="space-y-2 text-muted-foreground">
              {(order.order_items ?? []).map((item) => (
                <li key={item.id} className="flex items-center gap-3">
                  <img
                    src={item.image ?? "/hero.jpg"}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-xl object-cover"
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {item.title} × {item.quantity}
                  </span>
                  <span>{formatPrice(item.price * item.quantity)}</span>
                </li>
              ))}
              <li className="flex justify-between gap-3 border-t border-border pt-2">
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl">{value}</p>
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
