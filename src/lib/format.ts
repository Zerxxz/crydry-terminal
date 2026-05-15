const compactUSD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 2,
});

const fullUSD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const numFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 });
const pctFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 2,
  signDisplay: "always",
});

export function formatUsd(value: number | string | null | undefined, opts: { compact?: boolean } = {}) {
  const n = typeof value === "string" ? Number(value) : value ?? 0;
  if (!Number.isFinite(n)) return "$0";
  if (opts.compact || Math.abs(n) >= 100_000) return compactUSD.format(n);
  if (Math.abs(n) > 0 && Math.abs(n) < 0.01) {
    return "$" + n.toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
  }
  return fullUSD.format(n);
}

export function formatNumber(value: number | string | null | undefined, decimals = 4) {
  const n = typeof value === "string" ? Number(value) : value ?? 0;
  if (!Number.isFinite(n)) return "0";
  if (Math.abs(n) >= 1_000_000) return numFormatter.format(Math.round(n));
  return n.toLocaleString("en-US", { maximumFractionDigits: decimals });
}

export function formatPct(value: number | null | undefined) {
  const n = value ?? 0;
  if (!Number.isFinite(n)) return "+0%";
  return pctFormatter.format(n / 100);
}

export function shortAddress(addr: string, head = 6, tail = 4) {
  if (!addr) return "";
  if (addr.length <= head + tail + 2) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

export function timeAgo(date: Date | string | number) {
  const d = new Date(date).getTime();
  const diff = Date.now() - d;
  const sec = Math.round(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.round(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.round(mo / 12)}y ago`;
}
