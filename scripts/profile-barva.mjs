// IMPORTANT: Run 'yarn build' before running this script
//            so it imports the latest code from the 'dist' directory.
import {
  red, green, blue, yellow, bold, underline, bgWhite, bgYellow, setEnabled, isEnabled
} from '../dist/index.mjs';

// --- Configuration ---
// Increase this number significantly if the script finishes too quickly (under 2-3 seconds).
// Aim for a runtime that gives the profiler enough samples.
const ITERATIONS = 5_000_000; // Start with 5 million, adjust as needed

// --- Test Data ---
const testString = "Profiling Test String";
const variable1 = 12345;
const variable2 = true;

// --- Profiling Setup ---
console.log(`🚀 Starting Barva profiling script...`);
console.log(`🛠️  Iterations: ${ITERATIONS.toLocaleString()}`);
console.log(`🎨 Color Enabled Status: ${isEnabled() ? 'Enabled' : 'Disabled'} (based on environment)`);
// Optional: Force enable/disable for specific profiling scenarios
// setEnabled(true); // Force enable
// setEnabled(false); // Force disable

// --- Prevent V8 Optimization ---
// Assign results to this variable within the loop to ensure V8 doesn't
// optimize away the function calls because their results seem unused.
let volatileSink = '';

// --- Main Profiling Loop ---
console.log('⏱️  Starting main loop...');
console.time('Profiling Loop');

for (let i = 0; i < ITERATIONS; i++) {
  // 1. Basic Usage
  volatileSink = red`Basic red color for iteration ${i}`;

  // 2. Usage with Variables
  volatileSink = green`Values: ${variable1}, ${variable2}, ${testString}`;

  // 3. Simple Chaining
  volatileSink = blue.bold`Simple chained style: ${i}`;

  // 4. Complex Chaining
  volatileSink = yellow.underline.bgWhite`More complex chain with ${testString}`;

  // 5. Nesting
  volatileSink = red`Error: ${blue.bold`Nested bold blue ${i}`} - Back to red.`;

  // 6. Different Combinations
  volatileSink = bold.bgYellow`Just bold on yellow background ${variable1}`;

  // Add more specific scenarios you want to profile heavily if needed
  // e.g., volatileSink = underline`Just underline ${i}`;
}

console.timeEnd('Profiling Loop');
console.log('🏁 Profiling loop finished.');

// Log the final length just to be absolutely sure 'volatileSink' is used post-loop.
console.log(`📊 Final volatileSink length (ignore value): ${volatileSink.length}`);
console.log('✅ Script Complete.');
