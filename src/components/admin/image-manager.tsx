import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "product-images";
const SIGNED_TTL = 60 * 60 * 24 * 365 * 10; // 10 лет

export function storagePathFromUrl(url: string): string | null {
  const marker = `/${BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  const rest = url.slice(index + marker.length);
  const path = rest.split("?")[0];
  return path ? decodeURIComponent(path) : null;
}

async function uploadOne(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name}: это не изображение`);
  if (file.size > 10 * 1024 * 1024) throw new Error(`${file.name}: больше 10 МБ`);
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `products/${crypto.randomUUID()}.${ext || "jpg"}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  const { data, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_TTL);
  if (signError || !data?.signedUrl) throw new Error(signError?.message ?? "Не удалось получить ссылку");
  return data.signedUrl;
}

export function ImageManager({
  images,
  onChange,
}: {
  images: string[];
  onChange: (next: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [link, setLink] = useState("");

  const handleFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    setBusy(true);
    const uploaded: string[] = [];
    for (const file of list) {
      try {
        uploaded.push(await uploadOne(file));
      } catch (error) {
        toast.error((error as Error).message);
      }
    }
    setBusy(false);
    if (uploaded.length > 0) {
      onChange([...images, ...uploaded].slice(0, 8));
      toast.success(`Загружено фото: ${uploaded.length}`);
    }
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    const next = [...images];
    const [item] = next.splice(from, 1);
    if (item) next.splice(to, 0, item);
    onChange(next);
  };

  const remove = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <Label>Фото товара</Label>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFiles(e.dataTransfer.files);
        }}
        className={`rounded-2xl border-2 border-dashed p-5 text-center text-sm transition-colors ${
          dragging ? "border-primary bg-primary/5" : "border-border"
        }`}
      >
        <p className="text-muted-foreground">
          Перетащите фото сюда или выберите файлы на компьютере
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3 rounded-full"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? "Загрузка…" : "Загрузить фото"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {images.length > 0 ? (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((src, index) => (
            <li key={`${src}-${index}`} className="space-y-1">
              <div className="relative overflow-hidden rounded-2xl border border-border">
                <img src={src} alt="" className="aspect-square w-full object-cover" />
                {index === 0 ? (
                  <span className="absolute left-1 top-1 rounded-full bg-background/90 px-2 py-0.5 text-[10px]">
                    главное
                  </span>
                ) : null}
              </div>
              <div className="flex items-center justify-center gap-1">
                <button
                  type="button"
                  className="rounded-full px-1.5 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => move(index, index - 1)}
                  aria-label="Левее"
                >
                  ←
                </button>
                <button
                  type="button"
                  className="rounded-full px-1.5 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => move(index, index + 1)}
                  aria-label="Правее"
                >
                  →
                </button>
                <button
                  type="button"
                  className="rounded-full px-1.5 text-xs text-destructive"
                  onClick={() => remove(index)}
                  aria-label="Удалить"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex gap-2">
        <Input
          placeholder="или вставьте ссылку на фото"
          value={link}
          onChange={(e) => setLink(e.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          className="shrink-0 rounded-full"
          onClick={() => {
            const value = link.trim();
            if (!value) return;
            onChange([...images, value].slice(0, 8));
            setLink("");
          }}
        >
          Добавить
        </Button>
      </div>
    </div>
  );
}
