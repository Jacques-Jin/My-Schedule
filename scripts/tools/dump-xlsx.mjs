import { readFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2];
const shared = readFileSync(join(dir, "xl/sharedStrings.xml"), "utf8");
const strings = [...shared.matchAll(/<si><t[^>]*>([\s\S]*?)<\/t><\/si>/g)].map(m => m[1]);
const sheet = readFileSync(join(dir, "xl/worksheets/sheet1.xml"), "utf8");
const rows = [...sheet.matchAll(/<row r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)];
for (const [, r, inner] of rows) {
  const cells = [...inner.matchAll(/<c r="([A-Z]+)\d+"([^>]*)>(?:<v>([^<]*)<\/v>)?/g)];
  const out = [];
  for (const [, col, attrs, v] of cells) {
    if (v === undefined || v === "") continue;
    const val = attrs.includes('t="s"') ? strings[+v].split(/\r?\n/).join(" | ") : v;
    out.push(`${col}${r}=${val}`);
  }
  if (out.length) console.log(out.join("  ||  "));
}
