"use client";

const LOGOS = [
  "Aave",
  "Lido",
  "EigenLayer",
  "Pendle",
  "Curve",
  "Aerodrome",
  "GMX",
  "Jupiter",
  "Wintermute",
  "Galaxy",
];

export function Marquee() {
  return (
    <div className="container py-10">
      <div className="text-center text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
        Trusted by operators across
      </div>
      <div className="relative mt-6 mask-fade-edges overflow-hidden">
        <div className="flex w-max animate-ticker-x gap-12 whitespace-nowrap">
          {[...LOGOS, ...LOGOS].map((l, i) => (
            <span
              key={`${l}-${i}`}
              className="font-display text-xl font-semibold tracking-tight text-foreground/40"
            >
              {l}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
