"use client";

import { motion } from "framer-motion";

const QUOTES = [
  {
    body: "We finally killed our internal whale-tracking spreadsheet. Crydry replaced four tools in our trading desk's stack.",
    name: "Sasha K.",
    role: "Head of OTC, mid-tier MM",
  },
  {
    body: "The revoke surface is the single best UX I've used for approval hygiene. We now require it pre-airdrop for every team member.",
    name: "Linh N.",
    role: "Security Lead, L2 protocol",
  },
  {
    body: "I caught a rug in the audit tool 30 seconds before signing. The honey-pot rule alone has paid for the company a thousand times over.",
    name: "Diego F.",
    role: "Solana memecoin trader",
  },
];

export function Testimonials() {
  return (
    <section className="container py-20">
      <div className="mx-auto max-w-2xl text-center">
        <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-magenta-400/80">
          Operators
        </div>
        <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
          Used by funds, founders & power-users.
        </h2>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {QUOTES.map((q, i) => (
          <motion.figure
            key={q.name}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: i * 0.06 }}
            className="glass rounded-2xl p-6"
          >
            <span className="font-display text-3xl text-magenta-400">&ldquo;</span>
            <blockquote className="-mt-3 text-sm leading-relaxed text-foreground/90">
              {q.body}
            </blockquote>
            <figcaption className="mt-5 flex items-center gap-3">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-magenta-500/40 to-autumn-amber/30 font-display text-xs font-semibold">
                {q.name.split(" ").map((p) => p[0]).join("")}
              </span>
              <div>
                <div className="text-xs font-semibold">{q.name}</div>
                <div className="text-[11px] text-muted-foreground">{q.role}</div>
              </div>
            </figcaption>
          </motion.figure>
        ))}
      </div>
    </section>
  );
}
