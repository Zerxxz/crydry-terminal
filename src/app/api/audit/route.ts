import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auditRequestSchema } from "@/lib/types";
import { runAudit } from "@/lib/audit/engine";
import { jsonSafe } from "@/lib/serialize";

export const dynamic = "force-dynamic";

function detectContractName(src: string): string {
  const m = src.match(/contract\s+([A-Za-z_][A-Za-z0-9_]*)/);
  return m ? m[1] : "UnknownContract";
}

function detectCompiler(src: string): string | null {
  const m = src.match(/pragma\s+solidity\s+([\^~>=<\s\d.]+)/);
  return m ? m[1].trim() : null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = auditRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 }
      );
    }

    const { address, chain, source } = parsed.data;
    const src = source ?? "";
    const contractName = src ? detectContractName(src) : "UnknownContract";
    const compiler = src ? detectCompiler(src) : null;

    const verdict = runAudit(src);
    const bytecodeSize = src.length;

    // Try persisting to DB. If DB is unavailable, still return the verdict.
    let reportId = "ephemeral-" + Date.now().toString(36);

    const report = await db.auditReport
      .create({
        data: {
          contractName,
          chain,
          address,
          bytecodeSize,
          verified: src.length > 0,
          compiler,
          riskScore: verdict.riskScore,
          overallRisk: verdict.overallRisk,
          summary: verdict.summary,
          findings: { create: verdict.findings },
        },
        include: { findings: true },
      })
      .catch(() => null);

    if (report) reportId = report.id;

    return NextResponse.json({
      reportId,
      contractName,
      chain,
      address,
      bytecodeSize,
      verified: src.length > 0,
      compiler,
      riskScore: verdict.riskScore,
      overallRisk: verdict.overallRisk,
      summary: verdict.summary,
      findings: jsonSafe(report?.findings ?? verdict.findings),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to run audit" },
      { status: 500 }
    );
  }
}
