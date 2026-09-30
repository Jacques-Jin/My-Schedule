#!/usr/bin/env node
// Phase 11 verification: theme switching infrastructure
const BASE = (typeof process !== "undefined" && process.env?.TEST_PORT)
  ? `http://127.0.0.1:${process.env.TEST_PORT}/functions/v1/app`
  : "http://127.0.0.1:8001/functions/v1/app";

let passed = 0;
let failed = 0;

function check(name, condition) {
  if (condition) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.log(`  ✗ ${name}`);
    failed++;
  }
}

async function request(action, payload) {
  const isGet = payload === undefined;
  const init = isGet
    ? { method: "GET", headers: { Accept: "application/json" } }
    : { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload) };
  const res = await fetch(`${BASE}?action=${encodeURIComponent(action)}`, init);
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error || `http_${res.status}`);
  return json.data;
}

async function main() {
  console.log("\n=== Phase 11: Theme Switching ===\n");

  // Test 1: bootstrap returns settings with theme field
  console.log("1. Bootstrap includes theme field");
  const boot = await request("bootstrap");
  check("bootstrap.settings exists", !!boot.settings);
  check("bootstrap.settings.theme exists", boot.settings.theme !== undefined);
  check("bootstrap.settings.theme defaults to 'default'", boot.settings.theme === "default");

  // Test 2: settings.save accepts theme field
  console.log("\n2. settings.save accepts theme");
  const original = boot.settings.theme;
  await request("settings.save", { theme: "dark" });

  // Test 3: theme persists after save
  console.log("\n3. Theme persists after save");
  const boot2 = await request("bootstrap");
  check("theme saved as 'dark'", boot2.settings.theme === "dark");

  // Test 4: restore original theme
  console.log("\n4. Restore original theme");
  await request("settings.save", { theme: original });
  const boot3 = await request("bootstrap");
  check("theme restored", boot3.settings.theme === original);

  // Test 5: settings.save still accepts other fields
  console.log("\n5. settings.save still works for other fields");
  await request("settings.save", { remind_minutes: 15 });
  const boot4 = await request("bootstrap");
  check("remind_minutes updated", boot4.settings.remind_minutes === 15);
  check("theme unchanged after other save", boot4.settings.theme === original);

  // Test 6: data export includes theme
  console.log("\n6. Data export includes theme");
  const exported = await request("data.export");
  check("export has settings", !!exported.settings);
  const settingsRows = Array.isArray(exported.settings) ? exported.settings : [exported.settings];
  check("exported settings has theme", settingsRows[0]?.theme !== undefined);

  // Restore remind_minutes
  await request("settings.save", { remind_minutes: 10 });

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0) process.exit(1);
}

main().catch(e => {
  console.error("Test error:", e.message);
  process.exit(1);
});
