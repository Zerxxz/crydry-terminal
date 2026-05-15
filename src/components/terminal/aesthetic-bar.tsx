"use client";

import { useEffect, useState } from "react";
import { Music2, Pause, Play, Radio, SkipForward } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatPct, formatUsd } from "@/lib/format";

interface Tick {
  symbol: string;
  price: number;
  change: number;
}

interface Track {
  title: string;
  artist: string;
}

const TRACKS: Track[] = [
  { title: "Pumpkin Spice & Liquidity", artist: "Autumn FM · Vol. 03" },
  { title: "Magenta Sunrise",            artist: "Autumn FM · Vol. 03" },
  { title: "Late October Trades",        artist: "Autumn FM · Vol. 03" },
  { title: "Maple Funding Rates",        artist: "Autumn FM · Vol. 03" },
];

export function AestheticBar({ ticks }: { ticks: Tick[] }) {
  const [trackIdx, setTrackIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [now, setNow] = useState<string>("");

  useEffect(() => {
    const update = () =>
      setNow(
        new Date().toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZone: "UTC",
        })
      );
    update();
    const i = setInterval(update, 1_000);
    return () => clearInterval(i);
  }, []);

  const track = TRACKS[trackIdx % TRACKS.length];

  const ribbon = ticks.length > 0 ? [...ticks, ...ticks] : [];

  return (
    <div className="sticky bottom-0 z-30 mt-4 border-t border-white/5 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-12 items-center gap-4 px-4 lg:px-6">
        {/* Lo-fi player */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-magenta-500 to-autumn-rust text-white">
            <Music2 className="h-3.5 w-3.5" />
            {playing && (
              <motion.span
                className="absolute -inset-0.5 rounded-md ring-2 ring-magenta-400/60"
                animate={{ opacity: [0.2, 0.7, 0.2] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </div>
          <div className="hidden md:block leading-tight">
            <div className="font-display text-xs font-semibold">{track.title}</div>
            <div className="text-[10px] text-muted-foreground">{track.artist}</div>
          </div>
          <div className="flex items-end gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "block w-0.5 origin-bottom rounded-sm bg-magenta-400",
                  playing ? "animate-eq" : "h-1"
                )}
                style={{
                  height: playing ? `${6 + ((i * 11) % 14)}px` : undefined,
                  animationDelay: `${i * 120}ms`,
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-1 ml-1">
            <button
              onClick={() => setPlaying((p) => !p)}
              className="grid h-7 w-7 place-items-center rounded-md border border-white/10 bg-white/[0.03] hover:bg-white/[0.07]"
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={() => setTrackIdx((i) => i + 1)}
              className="grid h-7 w-7 place-items-center rounded-md border border-white/10 bg-white/[0.03] hover:bg-white/[0.07]"
              aria-label="Next track"
            >
              <SkipForward className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="hidden h-6 w-px shrink-0 bg-white/10 md:block" />

        {/* Live ticker */}
        <div className="relative flex-1 overflow-hidden mask-fade-edges">
          {ribbon.length === 0 ? (
            <div className="text-xs text-muted-foreground">Awaiting market feed…</div>
          ) : (
            <motion.div
              className="flex w-max gap-8 whitespace-nowrap"
              animate={{ x: ["0%", "-50%"] }}
              transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
            >
              {ribbon.map((t, i) => (
                <span key={`${t.symbol}-${i}`} className="flex items-center gap-2 text-xs">
                  <span className="font-display font-semibold">{t.symbol}</span>
                  <span className="num text-muted-foreground">{formatUsd(t.price)}</span>
                  <span
                    className={cn(
                      "num",
                      t.change >= 0 ? "text-emerald-400" : "text-rose-400"
                    )}
                  >
                    {formatPct(t.change)}
                  </span>
                </span>
              ))}
            </motion.div>
          )}
        </div>

        <div className="hidden md:flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
          <Radio className="h-3.5 w-3.5 text-magenta-400" />
          <span className="num">{now} UTC</span>
        </div>
      </div>
    </div>
  );
}
