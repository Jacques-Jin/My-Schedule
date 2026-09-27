#!/usr/bin/env node
// Phase 1 verification: skeleton + nav + function proxy
import http from "node:http";

const VITE = "http://127.0.0.1:5173";
let pass = 0, fail = 0;

function check(name, cond) {
  if (cond) { console.log(`  ✅ ${name}`); pass++; }
  else { console.log(`  ❌ ${name}`); fail++; }
}

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = "";
      res.on("data", (c) => body += c);
      res.on("end", () => resolve({ status: res.statusCode, body }));
    }).on("error", reject);
  });
}

async function main() {
  console.log("Phase 1: 项目骨架与本地链路");

  // 1. Vite dev server responds
  const r1 = await get(`${VITE}/`);
  check("Vite dev server returns 200", r1.status === 200);
  check("index.html contains root div", r1.body.includes('id="root"'));

  // 2. Bootstrap through proxy
  const r2 = await get(`${VITE}/functions/v1/app?action=bootstrap`);
  check("Bootstrap proxy returns 200", r2.status === 200);
  const j2 = JSON.parse(r2.body);
  check("Bootstrap returns ok:true", j2.ok === true);
  check("Bootstrap has all 9 keys",
    ["semesters","periodSlots","holidays","courses","campaigns","tasks","completions","countdowns","settings"]
      .every(k => k in j2.data));
  check("Settings has defaults", j2.data.settings?.remind_minutes === 10);

  // 3. Unknown action returns 404
  const r3 = await get(`${VITE}/functions/v1/app?action=nonexistent`);
  check("Unknown action returns 404", r3.status === 404);

  // 4. Missing action returns 400
  const r4 = await get(`${VITE}/functions/v1/app`);
  check("Missing action returns 400", r4.status === 400);

  // 5. Build compiles
  const { execSync } = await import("node:child_process");
  try {
    execSync("npx tsc --noEmit", { cwd: "D:/AI_WorkStation/my-schedule", stdio: "pipe" });
    check("TypeScript compiles cleanly", true);
  } catch { check("TypeScript compiles cleanly", false); }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
