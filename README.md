# Barva

A lightweight, tree-shakable library for terminal colours using tagged template
literals.
> _"Barva" is the Czech word for colour._

[![npm version](https://img.shields.io/npm/v/barva.svg)](https://www.npmjs.com/package/barva)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🎨 **Simple API**: Intuitive tagged template literals
- 🌲 **Tree-shakable**: Import only what you need
- ⚡ **Performant**: Optimised for speed with caching
- 🔗 **Chainable**: `red.bold.underline` (fully typed — no `@ts-expect-error`)
- 🪆 **Nestable**: `` red`Error: ${blue`Info`}` ``
- 🌈 **256-color and 24-bit truecolor**: `rgb()`, `hex()`, `ansi256()`
- ⬇️ **Automatic downgrade** when the terminal only supports fewer colours
- 🎚 **Level constants**: `setLevel(ColorLevel.TrueColor)` reads better than
  a magic number
- 📦 **Tiny**: No dependencies, small package size
- 🛡️ **TypeScript**: Full type definitions included with exported helper types
- 👌 **Environment aware**: Respects `NO_COLOR`, `FORCE_COLOR`, `COLORTERM`,
  `TERM`, TTY, IntelliJ-family and VS Code terminals, and common CI providers

## Installation

Choose your preferred package manager:

```bash
# npm
npm install barva

# yarn
yarn add barva

# pnpm
pnpm add barva

# bun
bun add barva
```

### Deno

```js
import { red, bold } from "https://deno.land/x/barva/mod.ts";
```

## Usage

```javascript
// Import just what you need (tree-shakable)
import { red, green, bold, underline } from 'barva';

// Basic usage
console.log(red`This text is red`);

// With variables
const name = 'World';
console.log(green`Hello, ${name}!`);

// Chaining styles
console.log(red.bold`This is bold red text`);

// Nesting colours and styles
console.log(red`Error: ${bold`Important!`} This is critical.`);

// Combining background colours
console.log(red.bgYellow`Warning!`);

// More complex chaining
console.log(blue.underline.bgWhite`Styled text`);
```

### 256-colour palette and truecolor

```javascript
import { rgb, hex, ansi256, bgAnsi256 } from 'barva';

// 24-bit truecolor
console.log(rgb(255, 128, 0)`orange`);
console.log(hex('#ff80c0')`pink`);

// 256-colour palette (0-255)
console.log(ansi256(196)`bright red`);
console.log(bgAnsi256(21)`blue background`);

// Chain them with modifiers and basic colours
console.log(bold.rgb(0, 200, 180).bgHex('#101820')`teal on navy`);
```

On terminals that only support 256 or 16 colours, rgb/hex calls are
automatically downgraded to the nearest supported palette — no extra code
required. If you want to force a specific capability level (e.g. in a test
suite), use the `ColorLevel` constants:

```javascript
import { setLevel, ColorLevel } from 'barva';

setLevel(ColorLevel.TrueColor); // equivalent to setLevel(3)
setLevel(ColorLevel.Ansi256);
setLevel(ColorLevel.Basic);
setLevel(ColorLevel.None);
```

If you need to do your own terminal-emulator detection, the values barva
itself keys on are exported as constants so you don't have to hardcode
magic strings:

```javascript
import { TerminalEmulator } from 'barva';

if (process.env.TERMINAL_EMULATOR === TerminalEmulator.JetBrainsJediTerm) {
  // running inside any JetBrains IDE terminal — IDEA, WebStorm, PyCharm,
  // PhpStorm, RubyMine, CLion, GoLand, Rider, DataGrip, Android Studio, …
}

if (process.env.TERM_PROGRAM === TerminalEmulator.VSCode) {
  // running inside VS Code's built-in terminal
}
```

### Stripping ANSI

```javascript
import { strip, ansiRegex } from 'barva';

strip(red.bold`hi ${blue`there`}!`); // => "hi there!"

// Regex provided for custom use cases:
"some \x1b[31mred\x1b[0m text".replace(ansiRegex(), '');
```

## Available Styles and Colours

### Modifiers

`bold`, `dim`, `italic`, `underline`, `blink`, `inverse`, `hidden`,
`strikethrough`, `doubleUnderline`, `framed`, `encircled`, `overline`,
`superscript`, `subscript`.

### Colours

| Colours | Background Colours | Bright Colours | Bright Background Colours |
|---------|--------------------|----------------|---------------------------|
| black   | bgBlack            | blackBright    | bgBlackBright             |
| red     | bgRed              | redBright      | bgRedBright               |
| green   | bgGreen            | greenBright    | bgGreenBright             |
| yellow  | bgYellow           | yellowBright   | bgYellowBright            |
| blue    | bgBlue             | blueBright     | bgBlueBright              |
| magenta | bgMagenta          | magentaBright  | bgMagentaBright           |
| cyan    | bgCyan             | cyanBright     | bgCyanBright              |
| white   | bgWhite            | whiteBright    | bgWhiteBright             |
| grey    | bgGrey             | greyBright     | bgGreyBright              |

`gray`/`bgGray` aliases are provided for US spelling.

## Controlling Colour Support

Colour support is automatically detected from the environment. You can
override or inspect it at runtime:

```javascript
import {
  setEnabled, setDisabled, setLevel, getLevel,
  isEnabled, isColorSupported, ColorLevel
} from 'barva';

// Enable / disable
setEnabled();      // re-run environment detection
setEnabled(true);  // force colours on
setEnabled(false); // force colours off
setDisabled();     // alias for setEnabled(false)
setDisabled(false);// alias for setEnabled(true)

// Precise level control — use the ColorLevel constants or a raw number
setLevel(ColorLevel.TrueColor); // same as setLevel(3)
setLevel(ColorLevel.Ansi256);   // 256-colour palette
setLevel(ColorLevel.Basic);     // basic 16 colours
setLevel(ColorLevel.None);      // no colours
getLevel();                     // => 3 | 2 | 1 | 0
setLevel(undefined);            // re-run detection

// Probes
isEnabled();         // current cached state (getLevel() > 0)
isColorSupported();  // re-evaluates the environment live
```

### Detection rules

Detection honours, in priority order:

1. `NO_COLOR` (any non-empty value) → colours off.
2. `TERM=dumb` → colours off unless `FORCE_COLOR` is set.
3. Truecolor-capable CI providers (`GITHUB_ACTIONS`, `GITEA_ACTIONS`,
   `CIRCLECI`) → level 3.
4. `FORCE_COLOR=1|2|3|true` → that level. `FORCE_COLOR=0|false` is treated as
   "do not force" rather than "force off" — use `NO_COLOR` for a hard off.
5. Basic-colour CI providers (`GITLAB_CI`, `TRAVIS`, `APPVEYOR`, `BUILDKITE`,
   `DRONE`, `TF_BUILD`, `TEAMCITY_VERSION`, `CODEBUILD_BUILD_*`,
   `BITBUCKET_COMMIT`, `VERCEL`, `NOW_BUILDER`, `NETLIFY`, `SEMAPHORE`,
   `CIRRUS_CI`, `HEROKU_TEST_RUN_ID`, `WOODPECKER`, `CI_NAME=codeship`) →
   level 1.
6. `COLORTERM=truecolor|24bit`, `TERMINAL_EMULATOR=JetBrains-JediTerm`
   (every IntelliJ-family IDE terminal — IDEA, WebStorm, PyCharm, PhpStorm,
   RubyMine, CLion, GoLand, Rider, DataGrip, Android Studio, …),
   `WT_SESSION`, `TERM_PROGRAM=vscode` → level 3.
7. `TERM` matching `*-256color` → level 2.
8. Any TTY fallback → level 1.
9. Otherwise → level 0.

## Default Export

```javascript
import barva from 'barva';

console.log(barva.blue`Hello!`);
console.log(barva.green.bold`Success!`);
console.log(barva.rgb(255, 128, 0)`orange`);

if (barva.isColorSupported()) {
  console.log(barva.magenta`Colourful output!`);
}
```

## Browser Support

Barva is designed for Node.js. In non-Node environments (browsers, Workers),
`process` is unavailable so detection resolves to level 0 and tagged templates
return plain strings without ANSI codes. This means barva is safe to import in
isomorphic code — it simply produces no escape sequences. A dedicated browser
entry point (using CSS `%c` formatters in `console.log`) is on the roadmap
(see `TODO.md`).

## Bundle Size

Barva is designed to be lightweight and optimised for modern JavaScript
applications:

| Library     | Minified   | Gzipped   | Tree-Shakable     |
|-------------|------------|-----------|-------------------|
| picocolors  | 2.6 KB     | 0.8 KB    | ❌                |
| Kleur       | 2.7 KB     | 1.1 KB    | ❌                |
| ⚡️**Barva** | **8.1 KB** | **3.4 KB**| ✅                |
| Colorette   | 5.2 KB     | 1.7 KB    | ✅                |
| Ansi-colors | 5.8 KB     | 1.9 KB    | ❌                |
| Chalk       | 5.8 KB     | 2.1 KB    | ❌ (v4), ✅ (v5+) |

> Note: Sizes are for the entire bundled library file. Actual impact on your
> app may be smaller with tree-shaking.

### Tree-Shaking Support

Barva is fully tree-shakable, allowing modern bundlers like webpack, Rollup,
and esbuild to eliminate unused code. For example, if you only import `red`
and `bold`, other colours and styles won't be included in your final bundle:

```javascript
// Only red and bold will be included in your bundle
import { red, bold } from 'barva';
console.log(red`This is red text`);
console.log(bold`This is bold text`);
```

To enable tree-shaking:

1. Use ES modules syntax (`import` rather than `require`).
2. Use a bundler that supports tree-shaking (webpack, Rollup, esbuild, etc.).
3. Ensure your `package.json` includes `"sideEffects": false`.

### Run Benchmarks Yourself

Want to verify the performance on your system? Run the included benchmark
suite:

```bash
yarn install
yarn build
yarn benchmark
yarn bundle-size
```

The benchmark suite tests:

- Basic colour application
- Style chaining
- Nested styling
- Complex real-world usage patterns

See the `scripts` directory for the implementation details.

#### Profiling the barva code

In order to spot bottlenecks in the code, a profiling script is available in
the `/scripts` directory: `profile-barva.mjs`. The easiest way to run this is:

```shell
yarn profile
```

You can also run the individual steps by hand:

```shell
yarn build
node --prof scripts/profile-barva.mjs
node --prof-process isolate-*.log > profile_output.txt
```

## Development

A local cache with all npm dev dependencies exists in `.yarn/cache`; see also
<https://yarnpkg.com/features/caching>.

```shell
yarn
yarn test
yarn test:coverage   # writes coverage/ with html, lcov, and summary reports
yarn lint
yarn build
```

## License

MIT © [Bjørn Wikkeling](https://bjorn.wikkeling.com)
