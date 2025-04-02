#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

/**
 * Main performance runner that installs dependencies, runs scripts, and cleans up
 */
async function main() {
  // Required dependencies for benchmarking
  const dependencies = [
    'benchmark',
    'chalk',
    'kleur',
    'colorette',
    'ansi-colors'
  ];

  try {
    // Step 1: Build barva
    console.log('🔨 Building barva...');
    execSync('yarn build', { stdio: 'inherit' });

    // ----- <<<

    // // Step 2: Install dependencies
    // console.log('\n📥 Installing dependencies for benchmarking...');
    // execSync(`yarn add -D ${dependencies.join('@latest ')}@latest`, {
    //   stdio: 'inherit'
    // });

    // Step 2: Create a temporary benchmark runner file
    console.log('\n🔧 Setting up benchmark runner...');
    const tempBenchmarkFile = path.join(rootDir, 'temp-benchmark-runner.mjs');

    fs.writeFileSync(tempBenchmarkFile, `
// Temporary benchmark runner
import Benchmark from 'benchmark';
const { Suite } = Benchmark;
import barva from './dist/index.js';
import chalk from 'chalk';
import kleur from 'kleur';
import * as colorette from 'colorette';
import ansiColors from 'ansi-colors';

/**
 * Helper to format numbers with commas
 * @param {number} num The number to format
 * @returns {string} Formatted number with commas
 */
function formatNumber(num) {
  return num.toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, ',');
}

/**
 * Helper to format benchmark results
 * @param {string} name Library name
 * @param {number} ops Operations per second
 * @returns {string} Formatted result string
 */
function formatResult(name, ops) {
  const opsFormatted = formatNumber(Math.round(ops));
  return \`\${name.padEnd(25)} \${opsFormatted.padStart(15)} ops/sec\`;
}

/**
 * Runs benchmark for basic color application
 */
function runBasicColorBenchmark() {
  console.log('\\n🔍 BENCHMARK: Basic color application');

  const suite = new Suite();

  suite
    .add('barva', () => {
      barva.red\`This is red text\`;
    })
    .add('chalk', () => {
      chalk.red('This is red text');
    })
    .add('kleur', () => {
      kleur.red('This is red text');
    })
    .add('colorette', () => {
      colorette.red('This is red text');
    })
    .add('ansi-colors', () => {
      ansiColors.red('This is red text');
    })
    .on('cycle', (event) => {
      console.log(formatResult(event.target.name, event.target.hz));
    })
    .on('complete', function() {
      console.log(\`\\n🥇 Fastest is \${this.filter('fastest').map('name')}\`);
    })
    .run();
}

/**
 * Runs benchmark for style chaining
 */
function runChainingBenchmark() {
  console.log('\\n🔍 BENCHMARK: Style chaining (multiple styles)');

  const suite = new Suite();

  suite
    .add('barva', () => {
      barva.red.bold.underline\`Styled text\`;
    })
    .add('chalk', () => {
      chalk.red.bold.underline('Styled text');
    })
    .add('kleur', () => {
      kleur.red().bold().underline('Styled text');
    })
    .add('colorette', () => {
      colorette.red(colorette.bold(colorette.underline('Styled text')));
    })
    .add('ansi-colors', () => {
      ansiColors.red.bold.underline('Styled text');
    })
    .on('cycle', (event) => {
      console.log(formatResult(event.target.name, event.target.hz));
    })
    .on('complete', function() {
      console.log(\`\\n🥇 Fastest is \${this.filter('fastest').map('name')}\`);
    })
    .run();
}

/**
 * Runs benchmark for nested styles
 */
function runNestingBenchmark() {
  console.log('\\n🔍 BENCHMARK: Nested styles');

  const suite = new Suite();

  suite
    .add('barva', () => {
      barva.bold\`Hello \${barva.red\`world\`}!\`;
    })
    .add('chalk', () => {
      chalk.bold(\`Hello \${chalk.red('world')}!\`);
    })
    .add('kleur', () => {
      kleur.bold(\`Hello \${kleur.red('world')}!\`);
    })
    .add('colorette', () => {
      colorette.bold(\`Hello \${colorette.red('world')}!\`);
    })
    .add('ansi-colors', () => {
      ansiColors.bold(\`Hello \${ansiColors.red('world')}!\`);
    })
    .on('cycle', (event) => {
      console.log(formatResult(event.target.name, event.target.hz));
    })
    .on('complete', function() {
      console.log(\`\\n🥇 Fastest is \${this.filter('fastest').map('name')}\`);
    })
    .run();
}

/**
 * Runs benchmark for complex real-world usage scenarios
 */
function runComplexBenchmark() {
  console.log('\\n🔍 BENCHMARK: Complex real-world usage');

  const suite = new Suite();

  suite
    .add('barva', () => {
      const name = 'User';
      const count = 42;
      barva.bold\`Hello, \${barva.green\`\${name}\`}! You have \${
        count > 10
          ? barva.red.bold\`\${count} unread messages\`
          : barva.blue\`\${count} unread messages\`
      }.\`;
    })
    .add('chalk', () => {
      const name = 'User';
      const count = 42;
      chalk.bold(\`Hello, \${chalk.green(name)}! You have \${
        count > 10
          ? chalk.red.bold(\`\${count} unread messages\`)
          : chalk.blue(\`\${count} unread messages\`)
      }.\`);
    })
    .add('kleur', () => {
      const name = 'User';
      const count = 42;
      kleur.bold(\`Hello, \${kleur.green(name)}! You have \${
        count > 10
          ? kleur.red().bold(\`\${count} unread messages\`)
          : kleur.blue(\`\${count} unread messages\`)
      }.\`);
    })
    .add('colorette', () => {
      const name = 'User';
      const count = 42;
      colorette.bold(\`Hello, \${colorette.green(name)}! You have \${
        count > 10
          ? colorette.bold(colorette.red(\`\${count} unread messages\`))
          : colorette.blue(\`\${count} unread messages\`)
      }.\`);
    })
    .add('ansi-colors', () => {
      const name = 'User';
      const count = 42;
      ansiColors.bold(\`Hello, \${ansiColors.green(name)}! You have \${
        count > 10
          ? ansiColors.red.bold(\`\${count} unread messages\`)
          : ansiColors.blue(\`\${count} unread messages\`)
      }.\`);
    })
    .on('cycle', (event) => {
      console.log(formatResult(event.target.name, event.target.hz));
    })
    .on('complete', function() {
      console.log(\`\\n🥇 Fastest is \${this.filter('fastest').map('name')}\`);
    })
    .run();
}

// Import the actual bundle size information
async function getBundleSizeInfo() {
  try {
    // Run the bundle-size script
    const { execSync } = await import('node:child_process');
    execSync('node scripts/bundle-size.mjs', { stdio: 'inherit' });
  } catch (err) {
    console.error(\`Error getting bundle sizes: \${err.message}\`);
  }
}

// Run all benchmarks
console.log('🚀 TERMINAL COLORS BENCHMARKS');
console.log('=================================');
console.log('Comparing performance across popular terminal coloring libraries:');
console.log('• ansi-colors');
console.log('• barva (this library)');
console.log('• chalk');
console.log('• colorette');
console.log('• kleur');
console.log('=================================');

// Run each benchmark
runBasicColorBenchmark();
runChainingBenchmark();
runNestingBenchmark();
runComplexBenchmark();

// Show bundle size comparison
getBundleSizeInfo();

console.log('\\n✅ Benchmark complete!');
`);

    // Step 3: Run the temporary benchmark file
    console.log('\n🏃 Running scripts...');
    execSync(`node ${tempBenchmarkFile}`, { stdio: 'inherit' });

  } catch (err) {
    console.error(`\n❌ Error: ${err.message}`);
  } finally {
    // Step 5: Clean up - remove temporary file and dependencies
    console.log('\n🧹 Cleaning up...');
    try {
      // Remove temporary benchmark file
      const tempBenchmarkFile = path.join(rootDir, 'temp-benchmark-runner.mjs');
      if (fs.existsSync(tempBenchmarkFile)) {
        fs.unlinkSync(tempBenchmarkFile);
      }

      // Remove installed dependencies
      // execSync(`yarn remove ${dependencies.join(' ')}`, { stdio: 'inherit' });
      // console.log('\n✅ All done!');
    } catch (cleanupErr) {
      console.error(`\n⚠️ Cleanup error: ${cleanupErr.message}`);
      console.error('You may need to manually remove the installed packages.');
    }
  }
}

// Run the main function
main().catch(err => {
  console.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
