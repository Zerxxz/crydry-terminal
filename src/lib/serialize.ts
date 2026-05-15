/**
 * Prisma returns Decimal/BigInt values that don't serialize to JSON natively.
 * This walks an object and coerces those types to numbers/strings the client can use.
 */
import { Prisma } from "@prisma/client";

export function jsonSafe<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (typeof value === "bigint") return value.toString() as unknown as T;
  if (value instanceof Prisma.Decimal) return Number(value.toString()) as unknown as T;
  if (value instanceof Date) return value.toISOString() as unknown as T;
  if (Array.isArray(value)) return value.map(jsonSafe) as unknown as T;
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = jsonSafe(v);
    }
    return out as unknown as T;
  }
  return value;
}
