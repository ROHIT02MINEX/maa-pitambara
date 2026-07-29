"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Min/max percentage filter for the analytics table. */
export function ScoreRangeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: "minScore" | "maxScore", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex items-end gap-2">
      <div className="w-[90px] space-y-1.5">
        <Label htmlFor="minScore" className="text-xs text-muted-foreground">
          Min %
        </Label>
        <Input
          id="minScore"
          type="number"
          min={0}
          max={100}
          defaultValue={searchParams.get("minScore") ?? ""}
          onBlur={(event) => setParam("minScore", event.target.value)}
        />
      </div>
      <div className="w-[90px] space-y-1.5">
        <Label htmlFor="maxScore" className="text-xs text-muted-foreground">
          Max %
        </Label>
        <Input
          id="maxScore"
          type="number"
          min={0}
          max={100}
          defaultValue={searchParams.get("maxScore") ?? ""}
          onBlur={(event) => setParam("maxScore", event.target.value)}
        />
      </div>
    </div>
  );
}
