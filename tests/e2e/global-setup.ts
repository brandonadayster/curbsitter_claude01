import fs from "node:fs";
import path from "node:path";

import { adminClient, provisionE2E } from "./fixtures/provision";

/**
 * Load .env.local, then provision deterministic E2E fixtures via the service
 * role before the suite runs. Skips provisioning (with a warning) if the local
 * Supabase stack isn't configured, so public-only specs can still run.
 */
function loadEnv() {
  const envPath = path.resolve(__dirname, "../../.env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match && !(match[1] in process.env)) process.env[match[1]] = match[2];
  }
}

export default async function globalSetup() {
  loadEnv();

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("127.0.0.1") ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    console.warn("[e2e] Local Supabase not configured — skipping fixture provisioning.");
    return;
  }

  const db = adminClient();
  await provisionE2E(db);
  console.info("[e2e] Fixtures provisioned.");
}
