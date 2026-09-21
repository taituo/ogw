import type { RouteFailureClass } from "./router/types.js";

export type FaultName = "timeout" | "reset" | "dns" | "refused" | "502" | "503" | "504" | "429";

export interface FaultRule {
  /** Unset matches every account. */
  accountId?: string;
  /** Unset matches every model. */
  modelId?: string;
  fault: FaultName;
  /** Unset repeats. A number fires that many times and then stops. */
  times?: number;
}

const NAMES = new Set<FaultName>(["timeout", "reset", "dns", "refused", "502", "503", "504", "429"]);

export function parseFaultSpec(spec: string | undefined): FaultRule[] {
  if (!spec?.trim()) return [];
  return spec.split(",").map((entry) => entry.trim()).filter(Boolean).map(parseFaultRule);
}

export function parseFaultRule(entry: string): FaultRule {
  const parts = entry.split(":").map((part) => part.trim()).filter(Boolean);
  let times: number | undefined;
  if (parts.length >= 2 && /^\d+$/.test(parts[parts.length - 1]!) && isFaultName(parts[parts.length - 2]!)) {
    times = Number(parts.pop());
  }
  const fault = parts.pop();
  if (!fault || !isFaultName(fault)) throw new Error(`Unknown fault '${entry}'. Use timeout, reset, dns, refused, 502, 503, 504, or 429.`);
  const target = parts.join(":");
  if (!target || target === "*") return { fault, ...(times === undefined ? {} : { times }) };
  const slash = target.indexOf("/");
  if (slash === -1) return { accountId: target, fault, ...(times === undefined ? {} : { times }) };
  return {
    accountId: target.slice(0, slash),
    modelId: target.slice(slash + 1),
    fault,
    ...(times === undefined ? {} : { times }),
  };
}

export function faultEffect(fault: FaultName): { failure: RouteFailureClass; message: string } {
  switch (fault) {
    case "timeout":
      return { failure: "timeout", message: "connection timed out" };
    case "reset":
      return { failure: "timeout", message: "read ECONNRESET" };
    case "dns":
      return { failure: "timeout", message: "getaddrinfo ENOTFOUND" };
    case "refused":
      return { failure: "timeout", message: "connect ECONNREFUSED" };
    case "502":
      return { failure: "provider_5xx", message: "502 bad gateway" };
    case "503":
      return { failure: "provider_5xx", message: "503 service unavailable" };
    case "504":
      return { failure: "provider_5xx", message: "504 gateway timeout" };
    case "429":
      return { failure: "rate_limit", message: "429 too many requests" };
  }
}

/** Standing rules repeat. Armed rules are one-shot unless they carry an explicit count. */
export class FaultGate {
  private readonly standing: FaultRule[];
  private readonly armed: FaultRule[] = [];

  constructor(standing: readonly FaultRule[] = []) {
    this.standing = standing.map((rule) => ({ ...rule }));
  }

  arm(spec: string): void {
    for (const rule of parseFaultSpec(spec)) this.armed.push({ ...rule, times: rule.times ?? 1 });
  }

  take(accountId: string, modelId: string): { fault: FaultName; failure: RouteFailureClass; message: string } | undefined {
    const rule = this.#match(this.armed, accountId, modelId) ?? this.#match(this.standing, accountId, modelId);
    if (!rule) return undefined;
    if (rule.times !== undefined) rule.times -= 1;
    return { fault: rule.fault, ...faultEffect(rule.fault) };
  }

  #match(rules: FaultRule[], accountId: string, modelId: string): FaultRule | undefined {
    return rules.find((rule) =>
      rule.times !== 0 &&
      (rule.accountId === undefined || rule.accountId === accountId) &&
      (rule.modelId === undefined || rule.modelId === modelId),
    );
  }
}

function isFaultName(value: string): value is FaultName {
  return NAMES.has(value as FaultName);
}
