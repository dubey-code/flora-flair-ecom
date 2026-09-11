export interface ChatProductRef {
  id: string;
  slug: string;
  title: string;
  price: number;
  image: string | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "operator" | "system";
  content: string;
  products: ChatProductRef[];
  created_at: string;
}

export type ChatStatus = "bot" | "needs_operator" | "operator" | "closed";

export interface ChatSessionState {
  sessionId: string;
  status: ChatStatus;
  messages: ChatMessage[];
  orderNumber?: string | null;
}

export const CHAT_STATUS_LABELS: Record<ChatStatus, string> = {
  bot: "ИИ-консультант",
  needs_operator: "Нужен оператор",
  operator: "Отвечает оператор",
  closed: "Закрыт",
};
