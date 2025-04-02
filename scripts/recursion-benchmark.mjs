/* @prettier */
import { run, bench, summary } from "mitata";

import * as colorette from "colorette";
import kleur from "kleur";
import * as kleurColors from "kleur/colors";
import chalk from "chalk";
import chalk5 from "chalk5";
import ansi from "ansi-colors";
import cliColor from "cli-color";
import picocolors from "picocolors";
import * as nanocolors from "nanocolors";
import * as yoctocolors from "yoctocolors";
import barva from "../dist/index.js";

// Disable color output during benchmarking to avoid terminal pollution
barva.setEnabled(false);
chalk.level = 0;
chalk5.level = 0;
kleur.enabled = false;
cliColor.enabled = false;
ansi.enabled = false;
// For colorette, we'll use the internal API or environment variable
// Usually this would be process.env.NO_COLOR = '1';
// But for benchmarking purposes, we'll try to use the internal property if possible
if (colorette.options) {
  colorette.options.enabled = false;
} else {
  // On newer versions of colorette, we use the isColorSupported property
  Object.defineProperty(colorette, 'isColorSupported', { value: false });
}

let count = 1000;
let input = "lorem ipsum dolor sit amet";

summary(() => {
  bench("barva", () => {
    return barva.blue(barva.red`${input}`.repeat(count));
  });

  bench("chalk v4", () => {
    return chalk.blue(chalk.red(input).repeat(count));
  });

  bench("chalk v5", () => {
    return chalk5.blue(chalk5.red(input).repeat(count));
  });

  bench("cli-color", () => {
    return cliColor.blue(cliColor.red(input).repeat(count));
  });

  bench("ansi-colors", () => {
    return ansi.blue(ansi.red(input).repeat(count));
  });

  bench("kleur", () => {
    return kleur.blue(kleur.red(input).repeat(count));
  });

  bench("kleur/colors", () => {
    return kleurColors.blue(kleurColors.red(input).repeat(count));
  });

  bench("colorette", () => {
    return colorette.blue(colorette.red(input).repeat(count));
  });

  bench("nanocolors", () => {
    return nanocolors.blue(nanocolors.red(input).repeat(count));
  });

  bench("yoctocolors", () => {
    return yoctocolors.blue(yoctocolors.red(input).repeat(count));
  });

  bench("picocolors", () => {
    return picocolors.blue(picocolors.red(input).repeat(count));
  });
});

await run();
