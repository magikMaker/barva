/* @prettier */
import { run, bench, boxplot } from "mitata";

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

// Show sample output from each library
console.log(colorette.green("colorette"));
console.log(kleur.green("kleur"));
console.log(kleurColors.green("kleur/colors"));
console.log(chalk.green("chalk v4"));
console.log(chalk5.green("chalk v5"));
console.log(ansi.green("ansi-colors"));
console.log(cliColor.green("cli-color"));
console.log(picocolors.green("picocolors"));
console.log(nanocolors.green("nanocolors"));
console.log(yoctocolors.green("yoctocolors"));
console.log(barva.green`barva`);

boxplot(() => {
  bench("barva", () => {
    return barva.red`Add plugin to use time limit`;
  });

  bench("chalk v4", () => {
    return chalk.red("Add plugin to use time limit");
  });

  bench("chalk v5", () => {
    return chalk5.red("Add plugin to use time limit");
  });

  bench("cli-color", () => {
    return cliColor.red("Add plugin to use time limit");
  });

  bench("ansi-colors", () => {
    return ansi.red("Add plugin to use time limit");
  });

  bench("kleur", () => {
    return kleur.red("Add plugin to use time limit");
  });

  bench("kleur/colors", () => {
    return kleurColors.red("Add plugin to use time limit");
  });

  bench("colorette", () => {
    return colorette.red("Add plugin to use time limit");
  });

  bench("nanocolors", () => {
    return nanocolors.red("Add plugin to use time limit");
  });

  bench("yoctocolors", () => {
    return yoctocolors.red("Add plugin to use time limit");
  });

  bench("picocolors", () => {
    return picocolors.red("Add plugin to use time limit");
  });
});

await run();
