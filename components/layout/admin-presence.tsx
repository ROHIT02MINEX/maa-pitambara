"use client";
import { T } from "@/components/translated-text";


import * as React from "react";
import { Circle } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export function AdminPresence({ isAdmin }: { isAdmin: boolean }) {
  const [online, setOnline] = React.useState(isAdmin);

  React.useEffect(() => {
    let active = true;

    async function refresh() {
      try {
        if (isAdmin) {
          await fetch("/api/presence", { method: "POST", cache: "no-store" });
        }
        const response = await fetch("/api/presence", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { online?: boolean };
        if (active) setOnline(Boolean(data.online));
      } catch {
        if (active && !isAdmin) setOnline(false);
      }
    }

    void refresh();
    const timer = window.setInterval(refresh, 30_000);
    const onVisible = () => document.visibilityState === "visible" && void refresh();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [isAdmin]);

  return (
    <Badge variant={online ? "success" : "outline"} title="Administrator availability">
      <Circle className={online ? "h-2.5 w-2.5 fill-current" : "h-2.5 w-2.5"} /><T>{" Admin "}</T><T>{online ? "online" : "offline"}</T>
    </Badge>
  );
}
