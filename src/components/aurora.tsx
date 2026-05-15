"use client";

import { motion } from "framer-motion";

/**
 * Background "aurora" — two large blurred radial blobs (magenta + autumn amber)
 * gently drifting over a noisy grid. Rendered fixed and pointer-events-none so it
 * never interferes with interactions.
 */
export function Aurora() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,61,160,0.18),transparent_55%)]" />
      <motion.div
        className="absolute -top-40 -left-32 h-[520px] w-[520px] rounded-full bg-magenta-500/30 blur-[120px]"
        animate={{ x: [0, 80, -40, 0], y: [0, 40, 80, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-1/3 -right-40 h-[460px] w-[460px] rounded-full bg-autumn-amber/25 blur-[110px]"
        animate={{ x: [0, -60, 40, 0], y: [0, 60, 20, 0] }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-32 left-1/3 h-[420px] w-[420px] rounded-full bg-autumn-rust/20 blur-[110px]"
        animate={{ x: [0, 60, -30, 0], y: [0, -30, 30, 0] }}
        transition={{ duration: 32, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute inset-0 grid-overlay opacity-40" />
      <div className="absolute inset-0 bg-noise opacity-[0.05] mix-blend-overlay" />
    </div>
  );
}
