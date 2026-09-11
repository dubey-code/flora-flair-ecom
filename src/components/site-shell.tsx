import type { ReactNode } from "react";

import { ChatWidget } from "@/components/chat/chat-widget";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export function SiteShell({
  children,
  hideChat = false,
}: {
  children: ReactNode;
  hideChat?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      {!hideChat && <ChatWidget />}
    </div>
  );
}
