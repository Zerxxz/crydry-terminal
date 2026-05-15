import { AuditSeverity, RiskLevel } from "@prisma/client";

export interface AuditFinding {
  rule: string;
  title: string;
  severity: AuditSeverity;
  description: string;
  recommendation: string;
  line?: number;
}

export interface AuditOutput {
  riskScore: number; // 0-100
  overallRisk: RiskLevel;
  findings: AuditFinding[];
  summary: string;
}

interface Rule {
  id: string;
  title: string;
  severity: AuditSeverity;
  description: string;
  recommendation: string;
  test: (src: string) => boolean;
  line?: (src: string) => number | undefined;
}

const lineOf = (src: string, needle: RegExp) => {
  const m = needle.exec(src);
  if (!m) return undefined;
  return src.slice(0, m.index).split("\n").length;
};

const RULES: Rule[] = [
  {
    id: "DELEGATECALL",
    title: "Use of delegatecall",
    severity: "HIGH",
    description: "delegatecall executes external code in the caller's storage context. If the target is upgradable or attacker-influenced, full state takeover is possible.",
    recommendation: "Restrict delegatecall to a trusted, immutable, audited target. Prefer staticcall when reads are sufficient.",
    test: (s) => /\.delegatecall\s*\(/.test(s),
    line: (s) => lineOf(s, /\.delegatecall\s*\(/),
  },
  {
    id: "TX_ORIGIN",
    title: "Authorization via tx.origin",
    severity: "HIGH",
    description: "tx.origin checks can be bypassed via phishing intermediate contracts.",
    recommendation: "Use msg.sender and OpenZeppelin AccessControl.",
    test: (s) => /tx\.origin/.test(s),
    line: (s) => lineOf(s, /tx\.origin/),
  },
  {
    id: "SELFDESTRUCT",
    title: "selfdestruct present",
    severity: "CRITICAL",
    description: "selfdestruct allows the contract (and any user funds it custodies) to be wiped, often leaving approvals dangling against an empty shell.",
    recommendation: "Remove selfdestruct. If absolutely required, gate behind a multi-sig timelock.",
    test: (s) => /selfdestruct\s*\(/.test(s),
    line: (s) => lineOf(s, /selfdestruct\s*\(/),
  },
  {
    id: "OWNER_TRANSFER",
    title: "Centralized ownership",
    severity: "MEDIUM",
    description: "Single-EOA ownership grants the owner privileged actions (mint, fee changes, withdrawals).",
    recommendation: "Transfer ownership to a multi-sig + timelock. Document privileged functions.",
    test: (s) => /\bonlyOwner\b/.test(s) || /Ownable\s*[\{,\s]/.test(s),
    line: (s) => lineOf(s, /\bonlyOwner\b/),
  },
  {
    id: "UNCHECKED_CALL",
    title: "Low-level call return value ignored",
    severity: "MEDIUM",
    description: "Low-level call() that ignores the boolean return can fail silently and leave state inconsistent.",
    recommendation: "Always check the boolean and revert on false; prefer SafeERC20 / Address.functionCall.",
    test: (s) => /(?:^|\s)\(?\s*\.call\s*\{?[^}]*\}?\s*\([^)]*\)\s*;/.test(s) && !/require\s*\(\s*success/.test(s),
    line: (s) => lineOf(s, /\.call\s*\{?/),
  },
  {
    id: "REENTRANCY",
    title: "Possible reentrancy",
    severity: "HIGH",
    description: "External call followed by state mutation. Without nonReentrant, a malicious receiver can re-enter and double-spend.",
    recommendation: "Apply OpenZeppelin's ReentrancyGuard / nonReentrant modifier and follow checks-effects-interactions.",
    test: (s) => /(?:transfer|call)\s*\([^)]*\)/.test(s) && !/nonReentrant/.test(s),
    line: (s) => lineOf(s, /(?:transfer|call)\s*\(/),
  },
  {
    id: "INFINITE_MINT",
    title: "Unbounded mint authority",
    severity: "CRITICAL",
    description: "_mint or mint() callable by an EOA without supply cap permits infinite issuance and rug-pull dilution.",
    recommendation: "Cap supply, gate behind governance, or remove minter role at deploy.",
    test: (s) => /function\s+mint\s*\(/.test(s) && !/totalSupply\s*\(\)\s*[<>=]/.test(s),
    line: (s) => lineOf(s, /function\s+mint\s*\(/),
  },
  {
    id: "BLOCKLIST",
    title: "Blocklist / blacklist function present",
    severity: "MEDIUM",
    description: "Owner-controlled blocklists can freeze user funds at will.",
    recommendation: "Document the policy publicly. Move to DAO-controlled freezing with appeals.",
    test: (s) => /(blacklist|blocklist|isBanned|_freeze)/i.test(s),
    line: (s) => lineOf(s, /(blacklist|blocklist|isBanned|_freeze)/i),
  },
  {
    id: "FEE_UNCAPPED",
    title: "Fee parameter without ceiling",
    severity: "HIGH",
    description: "setFee/setTax accepting any value lets the owner set 99% transfer tax and trap holders (honey-pot).",
    recommendation: "require(newFee <= MAX_FEE) where MAX_FEE is hard-coded ≤ 5%.",
    test: (s) => /(setFee|setTax|updateFee)\s*\(/.test(s) && !/MAX_FEE/.test(s),
    line: (s) => lineOf(s, /(setFee|setTax|updateFee)\s*\(/),
  },
  {
    id: "PROXY_NO_TIMELOCK",
    title: "Upgradable proxy without timelock",
    severity: "HIGH",
    description: "EIP-1967 proxy with EOA admin allows instant logic swap into a malicious implementation.",
    recommendation: "Wrap proxy admin in 24-72h timelock + multi-sig.",
    test: (s) => /(UUPSUpgradeable|TransparentUpgradeableProxy|_authorizeUpgrade)/.test(s) && !/Timelock/i.test(s),
    line: (s) => lineOf(s, /(UUPSUpgradeable|TransparentUpgradeableProxy)/),
  },
  {
    id: "PRAGMA_FLOATING",
    title: "Floating compiler pragma",
    severity: "INFO",
    description: "`pragma solidity ^0.x.y` accepts a wide compiler range, making reproducibility worse.",
    recommendation: "Pin pragma to a single, audited compiler version.",
    test: (s) => /pragma\s+solidity\s+\^/.test(s),
    line: (s) => lineOf(s, /pragma\s+solidity\s+\^/),
  },
  {
    id: "RANDOMNESS",
    title: "Insecure source of randomness",
    severity: "HIGH",
    description: "block.timestamp / blockhash / block.difficulty are miner-influenceable and unsuitable for randomness.",
    recommendation: "Use Chainlink VRF or commit-reveal scheme.",
    test: (s) => /(block\.timestamp|blockhash|block\.difficulty|block\.prevrandao)/.test(s) && /random|winner|jackpot/i.test(s),
    line: (s) => lineOf(s, /(block\.timestamp|blockhash|block\.difficulty)/),
  },
];

const SEVERITY_WEIGHT: Record<AuditSeverity, number> = {
  INFO: 2,
  LOW: 6,
  MEDIUM: 14,
  HIGH: 24,
  CRITICAL: 38,
};

export function runAudit(source: string): AuditOutput {
  const findings: AuditFinding[] = [];
  for (const r of RULES) {
    try {
      if (r.test(source)) {
        findings.push({
          rule: r.id,
          title: r.title,
          severity: r.severity,
          description: r.description,
          recommendation: r.recommendation,
          line: r.line ? r.line(source) : undefined,
        });
      }
    } catch {
      // single rule errors must never fail the run
    }
  }

  const score = Math.min(
    100,
    findings.reduce((a, f) => a + SEVERITY_WEIGHT[f.severity], 0)
  );

  let overallRisk: RiskLevel = "LOW";
  if (score >= 80) overallRisk = "CRITICAL";
  else if (score >= 50) overallRisk = "HIGH";
  else if (score >= 20) overallRisk = "MEDIUM";

  const counts = findings.reduce<Record<string, number>>((acc, f) => {
    acc[f.severity] = (acc[f.severity] ?? 0) + 1;
    return acc;
  }, {});
  const summary = findings.length === 0
    ? "No rules triggered. Source appears clean against the configured rule-set, but a manual review is still recommended."
    : `Detected ${findings.length} issue(s) across ${Object.keys(counts).length} severity classes — ${Object.entries(counts).map(([k, v]) => `${v} ${k.toLowerCase()}`).join(", ")}.`;

  return { riskScore: score, overallRisk, findings, summary };
}
