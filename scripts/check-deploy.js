#!/usr/bin/env node
/**
 * Deployment status checker.
 *
 * Reports two things in one shot, since they can disagree during a deploy:
 *   1. What the live production URL is actually serving right now
 *   2. What Vercel says about the most recent deployment (which may still be
 *      building, or stuck, while the OLD deployment keeps serving traffic --
 *      Vercel only swaps once the new one is ready)
 *
 * Usage:
 *   node scripts/check-deploy.js
 *   npm run check-deploy
 */

const PROD_URL = process.env.CHECK_DEPLOY_URL || "https://skill-portal-mppiti.vercel.app";
const PROJECT = process.env.CHECK_DEPLOY_PROJECT || "skill-portal-mppiti";

const { execSync } = require("node:child_process");

function timestamp() {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

async function fetchJson(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    const text = await res.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = text.slice(0, 200);
    }
    return { ok: res.ok, status: res.status, body };
  } catch (err) {
    return { ok: false, status: null, error: err.message };
  } finally {
    clearTimeout(timer);
  }
}

function checkLiveSite() {
  return fetchJson(`${PROD_URL}/api/health`);
}

/**
 * Reads the most recent deployment via `vercel ls --json`.
 *
 * Uses --json rather than scraping the default table: that table is rendered
 * with terminal-only formatting which is dropped when stdout is piped, leaving
 * just a bare list of URLs with no status attached.
 */
function checkLatestDeployment() {
  let raw;
  try {
    raw = execSync(`npx vercel ls ${PROJECT} --json`, {
      encoding: "utf8",
      timeout: 30000,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (err) {
    raw = err.stdout || "";
    if (!raw) return { error: (err.message || String(err)).slice(0, 500) };
  }

  // The CLI can prepend non-JSON notices, so start at the first brace.
  const start = raw.indexOf("{");
  if (start === -1) return { error: `no JSON in output:\n${raw.slice(0, 400)}` };

  let parsed;
  try {
    parsed = JSON.parse(raw.slice(start));
  } catch (err) {
    return { error: `could not parse JSON: ${err.message}` };
  }

  const latest = parsed.deployments?.[0];
  if (!latest) return { error: "no deployments returned" };

  const ageMs = Date.now() - latest.createdAt;
  const ageMin = Math.round(ageMs / 60000);

  return {
    url: latest.url,
    state: latest.state,
    target: latest.target,
    age: ageMin < 60 ? `${ageMin}m` : `${Math.round(ageMin / 60)}h`,
  };
}

async function main() {
  console.log(`[${timestamp()}] Checking ${PROD_URL} ...`);

  const [live, deployment] = await Promise.all([
    checkLiveSite(),
    Promise.resolve(checkLatestDeployment()),
  ]);

  console.log("\n--- Live production URL (what users see right now) ---");
  if (live.ok) {
    console.log(`  ✓ ${PROD_URL} -> ${live.status}`, live.body);
  } else {
    console.log(`  ✗ ${PROD_URL} -> ${live.status ?? "unreachable"}`, live.body ?? live.error);
  }

  console.log("\n--- Most recent deployment (may not be the one serving traffic) ---");
  if (deployment.error) {
    console.log(`  ? Could not read deployment list: ${deployment.error}`);
  } else {
    const flag =
      deployment.state === "READY" ? "✓" : deployment.state === "BUILDING" ? "…" : "✗";
    console.log(`  ${flag} https://${deployment.url}`);
    console.log(`    state: ${deployment.state}   target: ${deployment.target}   age: ${deployment.age}`);
  }

  console.log("\n--- Summary ---");
  if (live.ok && live.body?.status === "ok") {
    console.log("  Site is live and healthy.");
  } else {
    console.log("  Site is NOT currently healthy -- see above.");
  }
  if (deployment.state && deployment.state !== "READY") {
    console.log(
      `  Newest deployment is "${deployment.state}", so it is NOT serving traffic.\n` +
        "  The live URL above is still served by the last READY deployment.",
    );
    if (deployment.state === "BLOCKED") {
      console.log(
        "  BLOCKED = built successfully but Vercel refused to release it.\n" +
          "  Check the dashboard: https://vercel.com/yashsharma161020072-6124s-projects/skill-portal-mppiti",
      );
    }
  }
}

main();
