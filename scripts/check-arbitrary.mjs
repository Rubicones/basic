/**
 * Fails the build on arbitrary Tailwind values and raw colors in components.
 *
 * The token layer in src/styles/globals.css is the single source of truth. A
 * bracket value in a component is a token that was never added to the scale —
 * which is exactly how the reference ended up with mt-[13px], three sizes of one
 * label and three radii for one card.
 *
 * Escape hatch: none. If a value is missing, add it to @theme.
 */
import { readdir, readFile } from "node:fs/promises";
import { join, extname } from "node:path";

const ROOTS = ["src"];
const EXTS = new Set([".ts", ".tsx", ".css"]);

// Bracket values that describe *behaviour* rather than a design value, and have
// no token equivalent. Kept deliberately short.
const ALLOWED = [
  /\[env\(safe-area-inset-[a-z]+\)\]/,
  /\[&::-webkit-[a-z-]+\]/,
  /\[&::selection\]/,
  /\[--[a-z-]+:/, // setting a custom property inline, e.g. [--gap:0]
];

const ARBITRARY = /(?:^|[\s"'`:])(-?[a-z][a-z0-9-]*)-\[([^\]]+)\]/g;
const RAW_COLOR = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/g;

// Tailwind's stock palette. The radius and text namespaces are cleared in
// globals.css so those cannot be reached at all; colors keep `transparent`,
// `current`, `white` and `black`, so the stock hues are caught here instead.
const STOCK_PALETTE =
  /\b(?:bg|text|border|ring|outline|fill|stroke|from|via|to|divide|shadow|accent|caret|decoration)-(?:slate|gray|grey|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g;

const findings = [];

async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (EXTS.has(extname(entry.name))) await check(path);
  }
}

async function check(path) {
  const source = await readFile(path, "utf8");
  const isTokenFile = path.endsWith("globals.css");
  const lines = source.split("\n");

  lines.forEach((line, i) => {
    if (!isTokenFile) {
      for (const match of line.matchAll(ARBITRARY)) {
        const whole = `${match[1]}-[${match[2]}]`;
        if (ALLOWED.some((re) => re.test(whole))) continue;
        findings.push({ path, line: i + 1, text: whole, why: "arbitrary value" });
      }
    }
    // Raw colors and stock palette hues are banned everywhere except the token
    // file, where oklch() is the point.
    if (!isTokenFile) {
      for (const match of line.matchAll(RAW_COLOR)) {
        findings.push({ path, line: i + 1, text: match[0], why: "raw color" });
      }
      for (const match of line.matchAll(STOCK_PALETTE)) {
        findings.push({ path, line: i + 1, text: match[0], why: "stock palette color" });
      }
    }
  });
}

for (const root of ROOTS) await walk(root);

if (findings.length > 0) {
  console.error(`\n${findings.length} token violation(s):\n`);
  for (const f of findings) {
    console.error(`  ${f.path}:${f.line}  ${f.why}: ${f.text}`);
  }
  console.error("\nAdd the value to @theme in src/styles/globals.css instead.\n");
  process.exit(1);
}

console.log("tokens ok — no arbitrary values, no raw colors");
