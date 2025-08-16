# Barva

A lightweight (zero dependency - 1.7KB), tree-shakable library for terminal colours 
using tagged template literals.
> _"Barva" is the Czech word for colour._

[![npm version](https://img.shields.io/npm/v/barva.svg)](https://www.npmjs.com/package/barva)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🎨 **Simple API**: Intuitive tagged template literals
- 🌲 **Tree-shakable**: Import only what you need
- ⚡ **Performant**: Optimized for speed with caching
- 🔗 **Chainable**: `red.bold.underline`
- 🪆 **Nestable**: red\Error: ${blue\Info\}\`
- 📦 **Tiny**: No dependencies, small package size
- 🛡️ **TypeScript**: Full type definitions included
- 👌 **Environment aware**: Respects NO_COLOR standard

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

## Available Styles and Colours

## Supported colors

| Colours | Background Colours | Bright Colours | Bright Background Colours | Modifiers         |
|---------|--------------------|----------------|---------------------------|-------------------|
| black   | bgBlack            | blackBright    | bgBlackBright             | **bold**          |
| red     | bgRed              | redBright      | bgRedBright               | dim               |
| green   | bgGreen            | greenBright    | bgGreenBright             | hidden            |
| yellow  | bgYellow           | yellowBright   | bgYellowBright            | inverse           |
| blue    | bgBlue             | blueBright     | bgBlueBright              | _italic_          |
| magenta | bgMagenta          | magentaBright  | bgMagentaBright           | ~~strikethrough~~ |
| cyan    | bgCyan             | cyanBright     | bgCyanBright              | <u>underline</u>  |
| white   | bgWhite            | whiteBright    | bgWhiteBright             |                   |
| geay    | bgGrey             | greyBright     | bgGreyBright              |                   |


## Controlling Colour Support

Colour support is automatically detected based on your environment. You can 
manually enable or disable colours:

```javascript
import { setEnabled, setDisabled } from 'barva';

// Enable colours (explicitly or by default when called without arguments)
setEnabled();      // Enables colours
setEnabled(true);  // Explicitly enables colours
setEnabled(false); // Disables colours (inverse logic)

// Disable colours using the convenience function
setDisabled();      // Disables colours
setDisabled(true);  // Explicitly disables colours
setDisabled(false); // Enables colours (inverse logic)

// Check if colours are currently enabled
import { isEnabled } from 'barva';
if (isEnabled()) {
  console.log('Colours are enabled');
}
```

The library follows the [NO_COLOR](https://no-color.org/) standard and will 
automatically disable colours if:

- The `NO_COLOR` environment variable is set
- You're in a CI environment
- STDOUT is not a TTY

## Default Export

You can also import the entire library:

```javascript
import barva from 'barva';

console.log(barva.blue`Hello!`);
console.log(barva.green.bold`Success!`);

// Check if colors are supported
if (barva.isColorSupported()) {
  console.log(barva.magenta`Colourful output!`);
}

// Enable/disable colours
barva.setEnabled();      // Enable colours
barva.setDisabled();     // Disable colours
barva.setEnabled(false); // Also disables colours
```

## Browser Support
This library is designed for Node.js environments, but it can work in browsers 
with appropriate bundling. When used in a browser, colour enabling/disabling 
logic will fall back to always enabled since browser environments don't have 
the concept of TTY.

## Bundle Size
Barva is designed to be lightweight and optimized for modern
JavaScript applications:

| Library     | Minified    | Gzipped    | Tree-Shakable     |
|-------------|-------------|------------|-------------------|
| picocolors  | 2.6 KB      | 0.8 KB     | ❌                |
| Kleur       | 2.7 KB      | 1.1 KB     | ❌                |
| ⚡️**Barva** | **3.9 KB**  | **1.8 KB** | ✅                |
| Colorette   | 5.2 KB      | 1.7 KB     | ✅                |
| Ansi-colors | 5.8 KB      | 1.9 KB     | ❌                |
| Chalk       | 5.8 KB      | 2.1 KB     | ❌ (v4), ✅ (v5+) |
> Note: Sizes are for the entire bundled library file. 
> Actual impact on your app may be smaller with tree-shaking

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

1. Use ES modules syntax (`import` rather than `require`)
2. Use a bundler that supports tree-shaking (webpack, Rollup, esbuild, etc.)
3. Ensure your package.json includes `"sideEffects": false`

Tree-shaking can significantly reduce your final bundle size in real-world applications.


### Run Benchmarks Yourself

Want to verify the performance on your system? Run the included benchmark suite:

```bash
# Install dev dependencies first (choose your package manager)
npm install
# or
yarn install
# or
pnpm install
# or
bun install

# Build the library
npm run build
# or
yarn build
# or
pnpm build
# or
bun run build

# Run performance script
npm run benchmark
# or
yarn benchmark
# or
pnpm benchmark
# or
bun run benchmark

# Measure bundle sizes
npm run bundle-size
# or
yarn bundle-size
# or
pnpm bundle-size
# or
bun run bundle-size
```

The benchmark suite tests:
- Basic colour application
- Style chaining
- Nested styling
- Complex real-world usage patterns

See the `scripts` directory for the implementation details.

#### Profiling the barva code
In order to spot bottlenecks in the code, a profiling scripts is available
in the `/scripts` directory: `profile-barva.mjs`. The easiest way to run this 
is:

```shell
yarn profile
```
You can also run the individual steps by hand, run the following commands:

```shell
# build the script
yarn build

# Run profiling and generate isolate log files
node --prof benchmarks/profile-barva.mjs 

# Combine the generated log files:
node --prof-process isolate-*.log > profile_output.txt
```

## Development
A local cache with all npm dev dependencies exists in `.yarn/cache`
see also: https://yarnpkg.com/features/caching

```shell
# add all dev dependencies
yarn 
```

## License

MIT © [Bjørn Wikkeling](https://bjorn.wikkeling.com)
