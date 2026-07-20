import fs from "node:fs";
import path from "node:path";

/**
 * Load .env.local into process.env for integration tests against the local
 * Supabase stack. Values already present in the environment win.
 */
const envPath = path.resolve(__dirname, "../../.env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match && !(match[1] in process.env)) {
      process.env[match[1]] = match[2];
    }
  }
}
