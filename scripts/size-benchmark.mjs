/* @prettier */
import { buildSync } from "esbuild";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

console.table({
  barva: build(`export { default as barva } from "../dist/index.js"`),
  picocolors: build(`export { default as picocolors } from "picocolors"`),
  colorette: build(`export * as colorette from "colorette"`),
  "chalk v4": build(`export { default as chalk } from "chalk"`),
  "chalk v5": build(`export * as chalk from "chalk5"`),
  kleur: build(`export { default as kleur } from "kleur"`),
  "kleur/colors": build(`export * as kleurColors from "kleur/colors"`),
  "ansi-colors": build(`export { default as ansi } from "ansi-colors"`),
  "cli-color": build(`export { default as cliColor } from "cli-color"`),
  nanocolors: build(`export * as nanocolors from "nanocolors"`),
  yoctocolors: build(`export * as yoctocolors from "yoctocolors"`),
});

function build(contents) {
  let result = buildSync({
    bundle: true,
    write: false,
    minify: false,
    platform: "node",
    stdin: { contents, loader: "js", resolveDir: __dirname },
  });
  let code = result.outputFiles[0].text;
  return { "size (KB)": toKB(code.length) };
}

function toKB(value) {
  return (((value / 1024) * 100) | 0) / 100;
}
