// Assemble the standalone "Local Edition" package from dist/.
// Usage: node scripts/build-local-package.mjs
// Requires: dist/ already built (npm run build), deno.exe at DENO_SRC.
import { cpSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "output");
const PKG = path.join(OUT, "MySchedule-Local");
const DENO_SRC = "C:/Users/Jack/.qoder-cn/bin/deno/deno.exe";
const TPL = path.join(ROOT, "scripts", "local-package");

if (!existsSync(path.join(ROOT, "dist", "index.html"))) {
  console.error("dist/ not found - run `npm run build` first.");
  process.exit(1);
}
if (!existsSync(DENO_SRC)) {
  console.error("deno.exe not found at " + DENO_SRC);
  process.exit(1);
}

rmSync(PKG, { recursive: true, force: true });
mkdirSync(path.join(PKG, "server"), { recursive: true });
mkdirSync(path.join(PKG, "deno"), { recursive: true });

cpSync(path.join(ROOT, "dist"), path.join(PKG, "app"), { recursive: true });
cpSync(path.join(ROOT, "functions", "handler.mjs"), path.join(PKG, "server", "handler.mjs"));
cpSync(path.join(TPL, "server.ts"), path.join(PKG, "server", "server.ts"));
cpSync(DENO_SRC, path.join(PKG, "deno", "deno.exe"));
cpSync(path.join(TPL, "启动本地版.bat"), path.join(PKG, "启动本地版.bat"));
cpSync(path.join(TPL, "stop-local.bat"), path.join(PKG, "stop-local.bat"));
cpSync(path.join(TPL, "README.txt"), path.join(PKG, "README.txt"));

const zip = path.join(OUT, "我的日程-本地版-v62.zip");
rmSync(zip, { force: true });
execFileSync("powershell", [
  "-NoProfile", "-Command",
  `Compress-Archive -LiteralPath '${PKG}' -DestinationPath '${zip}' -Force`,
]);

console.log("Package:  " + PKG);
console.log("Zip:      " + zip);
