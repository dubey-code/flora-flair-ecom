import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  adminGetChat,
  adminListChats,
  adminSendChatMessage,
  adminSetChatStatus,
} from "@/lib/admin.functions";
import { CHAT_STATUS_LABELS, type ChatStatus } from "@/lib/chat-types";
import { formatDate } from "@/lib/format";

const FILTERS = [
  { value: "all", label: "Все" },
  { value: "needs_operator", label: "Нужен оператор" },
  { value: "operator", label: "У оператора" },
  { value: "bot", label: "ИИ" },
  { value: "closed", label: "Закрытые" },
] as const;

function statusTone(status: string): string {
  if (status === "needs_operator") return "bg-destructive/15 text-destructive";
  if (status === "operator") return "bg-primary/15 text-primary";
  if (status === "closed") return "bg-muted text-muted-foreground";
  return "bg-secondary text-foreground";
}

export function ChatsTab() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reply, setReply] = useState("");

  const listFn = useServerFn(adminListChats);
  const getFn = useServerFn(adminGetChat);
  const sendFn = useServerFn(adminSendChatMessage);
  const statusFn = useServerFn(adminSetChatStatus);

  const chats = useQuery({
    queryKey: ["admin-chats"],
    queryFn: () => listFn(),
    refetchInterval: 8000,
  });

  const thread = useQuery({
    queryKey: ["admin-chat", activeId],
    queryFn: () => getFn({ data: { id: activeId as string } }),
    enabled: Boolean(activeId),
    refetchInterval: 6000,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-chats"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-chat", activeId] });
  };

  const send = useMutation({
    mutationFn: (text: string) => sendFn({ data: { id: activeId as string, text } }),
    onSuccess: () => {
      setReply("");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const changeStatus = useMutation({
    mutationFn: (status: ChatStatus) => statusFn({ data: { id: activeId as string, status } }),
    onSuccess: () => invalidate(),
    onError: (error: Error) => toast.error(error.message),
  });

  const all = chats.data?.chats ?? [];
  const today = new Date().toDateString();
  const stats = {
    total: all.length,
    waiting: all.filter((c) => c.status === "needs_operator").length,
    today: all.filter((c) => new Date(c.createdAt).toDateString() === today).length,
    orders: all.filter((c) => c.orderNumber).length,
  };

  const query = search.trim().toLowerCase();
  const visible = all.filter((chat) => {
    if (filter !== "all" && chat.status !== filter) return false;
    if (!query) return true;
    return (
      chat.visitorName.toLowerCase().includes(query) ||
      chat.phone.toLowerCase().includes(query) ||
      (chat.orderNumber ?? "").toLowerCase().includes(query)
    );
  });

  const active = all.find((chat) => chat.id === activeId) ?? null;

  return (
    <div className="mt-6 space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Всего чатов", value: stats.total },
          { label: "Ждут оператора", value: stats.waiting },
          { label: "Сегодня", value: stats.today },
          { label: "С заказом", value: stats.orders },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-border/60 bg-card p-4">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="mt-1 font-display text-2xl tabular-nums">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Имя, телефон или номер заказа"
          className="h-9 w-full sm:w-64"
        />
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <Button
              key={item.value}
              size="sm"
              variant={filter === item.value ? "default" : "outline"}
              className="rounded-full"
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <div className="space-y-2">
          {chats.isLoading && <p className="text-sm text-muted-foreground">Загружаем чаты…</p>}
          {!chats.isLoading && visible.length === 0 && (
            <p className="text-sm text-muted-foreground">Чатов пока нет.</p>
          )}
          {visible.map((chat) => (
            <button
              key={chat.id}
              type="button"
              onClick={() => setActiveId(chat.id)}
              className={`w-full rounded-2xl border p-3 text-left transition-colors ${
                activeId === chat.id
                  ? "border-primary bg-secondary/50"
                  : "border-border/60 bg-card hover:bg-secondary/30"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {chat.visitorName}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] ${statusTone(chat.status)}`}>
                  {CHAT_STATUS_LABELS[chat.status as ChatStatus] ?? chat.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{chat.phone}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDate(chat.lastMessageAt)}
                {chat.orderNumber ? ` · заказ ${chat.orderNumber}` : ""}
              </p>
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-4">
          {!active ? (
            <p className="text-sm text-muted-foreground">Выберите чат слева.</p>
          ) : (
            <div className="flex h-full flex-col">
              <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{active.visitorName}</p>
                  <p className="text-xs text-muted-foreground">
                    {active.phone} · согласие {formatDate(active.consentAt)}
                  </p>
                </div>
                <div className="ml-auto flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="rounded-full"
                    disabled={changeStatus.isPending}
                    onClick={() => changeStatus.mutate("operator")}
                  >
                    Взять в работу
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    disabled={changeStatus.isPending}
                    onClick={() => changeStatus.mutate("bot")}
                  >
                    Вернуть ИИ
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-full"
                    disabled={changeStatus.isPending}
                    onClick={() => changeStatus.mutate("closed")}
                  >
                    Закрыть
                  </Button>
                </div>
              </div>

              {active.orderNumber && (
                <Badge variant="secondary" className="mt-3 w-fit">
                  Заявка: заказ {active.orderNumber}
                </Badge>
              )}

              <div className="mt-3 max-h-[420px] flex-1 space-y-2 overflow-y-auto pr-1">
                {thread.isLoading && (
                  <p className="text-sm text-muted-foreground">Загружаем переписку…</p>
                )}
                {(thread.data?.messages ?? []).map((message) => (
                  <div
                    key={message.id}
                    className={
                      message.role === "system"
                        ? "text-center text-[11px] uppercase tracking-wide text-muted-foreground"
                        : message.role === "user"
                          ? "mr-auto max-w-[80%] rounded-2xl bg-secondary px-3 py-2 text-sm"
                          : message.role === "operator"
                            ? "ml-auto max-w-[80%] rounded-2xl bg-primary px-3 py-2 text-sm text-primary-foreground"
                            : "mr-auto max-w-[80%] rounded-2xl border border-border/60 px-3 py-2 text-sm"
                    }
                  >
                    {message.role !== "system" && (
                      <p className="mb-1 text-[11px] opacity-70">
                        {message.role === "user"
                          ? active.visitorName
                          : message.role === "operator"
                            ? "Оператор"
                            : "ИИ-консультант"}{" "}
                        · {formatDate(message.createdAt)}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex items-end gap-2 border-t border-border/60 pt-3">
                <Textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Ответ покупателю…"
                  className="min-h-10 max-h-32 flex-1 resize-none text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && reply.trim()) {
                      e.preventDefault();
                      send.mutate(reply.trim());
                    }
                  }}
                />
                <Button
                  size="icon"
                  className="rounded-full"
                  aria-label="Отправить ответ"
                  disabled={!reply.trim() || send.isPending}
                  onClick={() => send.mutate(reply.trim())}
                >
                  {send.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
