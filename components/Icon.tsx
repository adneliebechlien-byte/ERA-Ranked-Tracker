"use client";

import { useState } from "react";
import { brawlerIconUrl, modeIconUrl } from "@/lib/images";

export function BrawlerIcon({
  brawlerId,
  size = 24,
}: {
  brawlerId: number;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={brawlerIconUrl(brawlerId)}
      alt=""
      width={size}
      height={size}
      className="rounded-full shrink-0"
      style={{ width: size, height: size, objectFit: "cover" }}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

export function ModeIcon({ mode, size = 20 }: { mode: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const url = modeIconUrl(mode);
  if (!url || failed) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      width={size}
      height={size}
      className="rounded shrink-0"
      style={{ width: size, height: size, objectFit: "cover" }}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
