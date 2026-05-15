import { z } from "zod";

export const evmAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid EVM address");

export const solAddressSchema = z
  .string()
  .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "Invalid Solana address");

export const anyAddressSchema = z.union([evmAddressSchema, solAddressSchema]);

export const chainEnum = z.enum([
  "ETHEREUM", "ARBITRUM", "OPTIMISM", "BASE", "POLYGON", "BSC", "SOLANA", "AVALANCHE",
]);

export const auditRequestSchema = z.object({
  address: evmAddressSchema,
  chain: chainEnum.default("ETHEREUM"),
  source: z.string().max(80_000).optional(),
});

export const revokeRequestSchema = z.object({
  approvalId: z.string().min(1),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
});

export type AuditRequest = z.infer<typeof auditRequestSchema>;
export type RevokeRequest = z.infer<typeof revokeRequestSchema>;
