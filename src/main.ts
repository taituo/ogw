import fs from "node:fs";
import { OpenCodeStackGatewayBackend } from "./adapter.js";
import { createInferenceGateway } from "./gateway/server.js";
import { createTransparentModels, openCodeGoAccountsFromEnv } from "./router/index.js";

loadAccounts();

const host = process.env.GATEWAY_HOST ?? "127.0.0.1";
const port = Number(process.env.PORT ?? process.env.GATEWAY_PORT ?? "8787");
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be an integer from 1 to 65535");

const { models } = await createTransparentModels({
  sessionId: process.env.OGW_SESSION_ID ?? "ogw",
  config: {
    openCodeGo: { strategy: "sticky-least-loaded", accounts: openCodeGoAccountsFromEnv() },
  },
});

const modelList = process.env.OPENCODE_GO_MODELS?.split(",").map((id) => id.trim()).filter(Boolean);
const backend = new OpenCodeStackGatewayBackend(models, {
  provider: "opencode-go",
  ...(modelList && modelList.length > 0 ? { modelIds: modelList } : {}),
});
const gateway = createInferenceGateway({ backend, host, port });
await gateway.listen();
console.log(`gateway listening at ${gateway.url}`);

function loadAccounts(): void {
  if (process.env.PI_OPENCODE_GO_STACK?.trim()) {
    console.log(`opencode-go accounts: ${namesFromStack(process.env.PI_OPENCODE_GO_STACK)}`);
    return;
  }
  const accountsFile = process.env.OPENCODE_ACCOUNTS_FILE;
  if (accountsFile) {
    const { accounts } = JSON.parse(fs.readFileSync(accountsFile, "utf8")) as {
      accounts: Array<{ name: string; env: string; key: string }>;
    };
    if (!Array.isArray(accounts) || accounts.length === 0) throw new Error("OPENCODE_ACCOUNTS_FILE has no accounts");
    for (const account of accounts) {
      if (!account.name || !account.env || !account.key) throw new Error("each account needs name, env, and key");
      process.env[account.env] = account.key;
    }
    process.env.PI_OPENCODE_GO_STACK = accounts.map((account) => `${account.name}:${account.env}`).join(",");
    console.log(`opencode-go accounts: ${accounts.map((account) => account.name).join(", ")}`);
    return;
  }
  const authFile = process.env.OPENCODE_AUTH_FILE;
  if (authFile) {
    const key = JSON.parse(fs.readFileSync(authFile, "utf8"))?.["opencode-go"]?.key;
    if (typeof key !== "string" || !key) throw new Error("opencode-go credential missing");
    process.env.OPENCODE_GO_KEY_A = key;
    process.env.PI_OPENCODE_GO_STACK = "go-a:OPENCODE_GO_KEY_A";
    console.log("opencode-go accounts: go-a");
    return;
  }
  throw new Error("Set PI_OPENCODE_GO_STACK, OPENCODE_ACCOUNTS_FILE, or OPENCODE_AUTH_FILE");
}

function namesFromStack(spec: string): string {
  return spec.split(",").map((entry) => entry.split(":")[0]?.trim()).filter(Boolean).join(", ");
}
