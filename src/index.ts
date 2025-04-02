let env: NodeJS.ProcessEnv = {};
let stdoutIsTTY: boolean = false;
try {
  if (process?.env && process?.stdout) {
    env = process.env;
    stdoutIsTTY = process.stdout.isTTY;
  }
} catch {
  // Ignore errors in environments without process
}

// Define constants
const ESC = '\x1b';
const RESET = `${ESC}[0m`;
const START_PREFIX = `${ESC}[`;
const END_SUFFIX = 'm';

// Types
type ColorValue = string | number | boolean | null | undefined | Colorizer;
type TagFunction = (
  strings: TemplateStringsArray,
  ...values: ColorValue[]
) => string;
interface Colorizer extends TagFunction {
  _codes: ReadonlyArray<number>;
  [key: string]: Colorizer | TagFunction | ReadonlyArray<number> | unknown;
}

/**
 * ANSI color and style codes
 * Frozen to prevent accidental modifications
 */
const CODES = Object.freeze({
  // Modifiers
  reset: [0], bold: [1], dim: [2], italic: [3], underline: [4], inverse: [7],
  hidden: [8], strikethrough: [9],
  // Foreground colours
  black: [30], red: [31], green: [32], yellow: [33], blue: [34], magenta: [35],
  cyan: [36], white: [37], grey: [90], gray: [90],
  // Bright foreground variants
  blackBright: [90], redBright: [91], greenBright: [92], yellowBright: [93],
  blueBright: [94], magentaBright: [95], cyanBright: [96], whiteBright: [97],
  greyBright: [90], grayBright: [90],
  // Background colours
  bgBlack: [40], bgRed: [41], bgGreen: [42], bgYellow: [43], bgBlue: [44],
  bgMagenta: [45], bgCyan: [46], bgWhite: [47], bgGrey: [100], bgGray: [100],
  // Bright background variants
  bgBlackBright: [100], bgRedBright: [101], bgGreenBright: [102],
  bgYellowBright: [103], bgBlueBright: [104], bgMagentaBright: [105],
  bgCyanBright: [106], bgWhiteBright: [107], bgGreyBright: [100],
  bgGrayBright: [100]
});
type CodeName = keyof typeof CODES;

// Cache of colorizers to avoid recreating the same ones
const colorizerCache = new Map<string, Colorizer>();

/**
 * Determines if color output should be enabled based on environment variables
 * and terminal capabilities
 *
 * @returns Whether color output should be enabled
 */
const isColorSupported = (): boolean => {
  // Early return if NO_COLOR is set and not empty (https://no-color.org/)
  if (env.NO_COLOR !== undefined && env.NO_COLOR !== '') return false;
  // Check for CI environments that might not support colors
  if (env.FORCE_COLOR !== undefined && env.FORCE_COLOR !== '0' && env.FORCE_COLOR !== 'false') return true;
  // Simplified CI check - rely on TTY primarily
  return stdoutIsTTY;
};

// Global enabled state, initialized based on environment
let globalEnabled = isColorSupported();

const FINAL_RESET_REGEX = new RegExp(`${RESET.replace('[', '\\[')}$`);

/**
 * Creates a colorizer function for the specified ANSI codes.
 *
 * @param initialCodes ANSI code(s) to apply
 * @param alreadySorted Indicates if initialCodes is already sorted and unique
 * @returns A template tag function that applies the color codes
 */
const createColorizer = (initialCodes: ReadonlyArray<number>, alreadySorted = false): Colorizer => {
  // Sort codes for cache key ONLY IF necessary
  // The passed initialCodes might be already sorted from the chaining getter
  const sortedCodes = alreadySorted ? initialCodes : [...initialCodes].sort((a, b) => a - b);
  const codeKey = sortedCodes.join(';');

  // Return from cache if available
  const cached = colorizerCache.get(codeKey);

  if (cached) {
    return cached;
  }

  // Define the start code for this specific colorizer instance
  const startCode = `${START_PREFIX}${codeKey}${END_SUFFIX}`;

  /**
   * Applies color to a template literal
   *
   * @param strings String parts of the template literal
   * @param values Interpolated values in the template literal
   * @returns Colored string with ANSI codes (if enabled)
   */
  const colorizer: Colorizer = ((
    strings: TemplateStringsArray,
    ...values: ColorValue[]
  ): string => {
    // If disabled, just concat the template without color codes
    if (!globalEnabled) {
      return strings.reduce((acc, str, i) => acc + str + (i < values.length ? String(values[i]) : ''), '');
    }

    // Estimate needed array size: start code + string parts + value parts + reset code
    const parts: string[] = new Array(1 + strings.length + values.length + 1);
    let partIndex = 0;

    parts[partIndex++] = startCode; // Start with the ANSI code

    const len = strings.length; // Cache length (used strings.length here)
    const numValues = values.length; // Cache values length explicitly

    for (let i = 0; i < len; i++) {
      parts[partIndex++] = strings[i]; // Add string part

      if (i < numValues) { // Check against cached values length
        const value = values[i];
        // Handle nesting
        if (typeof value === 'function' && '_codes' in value && Array.isArray(value._codes)) {
          const nestedStrings = [''] as unknown as TemplateStringsArray;
          Object.defineProperty(nestedStrings, 'raw', { value: [''] });
          const nestedOutput = value(nestedStrings);
          // Replace final reset with outer start code and add
          parts[partIndex++] = nestedOutput.replace(FINAL_RESET_REGEX, startCode);
        } else {
          // Add stringified value directly
          // Using String() constructor is generally safe and standard
          parts[partIndex++] = String(value);
        }
      }
    }

    // Add the final reset code
    parts[partIndex++] = RESET;

    // Join all parts at the end
    // TODO If the pre-allocated array was too large, slice it? Or just let
    //   join handle undefined? Join handles potentially sparse arrays
    //   correctly, but slicing might be cleaner if performance allows.
    //   Let's stick with direct join first.
    return parts.join('');

  }) as Colorizer;

  // Store the *sorted* codes on the function itself
  colorizer._codes = sortedCodes;

  // Add chaining properties using getters for lazy creation
  for (const name in CODES) {
    if (name === 'reset' || name === '_codes') continue;

    Object.defineProperty(colorizer, name, {
      get() {
        // Chaining Logic
        const currentCodes = this._codes as ReadonlyArray<number>; // Already sorted & unique
        const newCodesToAdd = CODES[name as CodeName]; // Array, usually small

        // Combine codes (potentially with duplicates)
        const combined = [...currentCodes, ...newCodesToAdd];

        // Create Set for uniqueness
        const uniqueCodesSet = new Set(combined);

        // Convert Set back to Array
        // Using spread syntax `[...]` is often similar performance to Array.from
        // Array of unique codes, but unsorted
        const codesToProcess = [...uniqueCodesSet];

        // Sort the unique array
        codesToProcess.sort((a, b) => a - b); // Sort in-place

        // Generate the cache key
        const newCodeKey = codesToProcess.join(';');

        // Cache lookup
        const cached = colorizerCache.get(newCodeKey);
        if (cached) {
          return cached;
        }

        // Cache miss: Create new colorizer, passing the *already sorted* array
        // and the `alreadySorted = true` flag to skip redundant sort.
        return createColorizer(codesToProcess, true);
      },
      enumerable: true,
      configurable: false
    });
  }

  // Cache this newly created colorizer
  colorizerCache.set(codeKey, colorizer);

  return colorizer;
};

// Create individual base colorizers
// They will call createColorizer with alreadySorted = false (default)
const baseColorizers = {} as Record<CodeName, Colorizer>;
for (const name in CODES) {
  if (name !== 'reset') {
    baseColorizers[name as CodeName] = createColorizer(CODES[name as CodeName]);
  }
}

/**
 * Enables or disabled all colors
 *
 * @param enabled Whether colors should be enabled (defaults to true)
 */
export const setEnabled = (enabled?: boolean): void => {
  globalEnabled = enabled === undefined || enabled === null ? isColorSupported() : Boolean(enabled);
};

/**
 * Checks if colours are currently enabled
 *
 * @returns Current enabled state
 */
export const isEnabled = (): boolean => globalEnabled;

// Exports (no change needed here)
export const {
  // Modifiers
  bold, dim, italic, underline, inverse, hidden, strikethrough,
  // Foreground colors
  black, red, green, yellow, blue, magenta, cyan, white, grey, gray,
  // Bright variants
  blackBright, redBright, greenBright, yellowBright, blueBright,
  magentaBright, cyanBright, whiteBright, greyBright, grayBright,
  // Background colors
  bgBlack, bgRed, bgGreen, bgYellow, bgBlue, bgMagenta, bgCyan, bgWhite,
  bgGrey, bgGray,
  // Bright background variants
  bgBlackBright, bgRedBright, bgGreenBright, bgYellowBright, bgBlueBright,
  bgMagentaBright, bgCyanBright, bgWhiteBright, bgGreyBright, bgGrayBright,
} = baseColorizers;

// Create the default export object
const barvaExport: Record<string, Colorizer | typeof setEnabled | typeof isEnabled> & {
  setEnabled: typeof setEnabled;
  isColorSupported: typeof isEnabled;
  isEnabled: typeof isEnabled;
} = {
  ...baseColorizers,
  setEnabled,
  isEnabled,
  isColorSupported: isEnabled
};
export default barvaExport;
export { barvaExport as barva };

// Types
export type BarvaColorizer = Colorizer & {
  [K in BaseColorizerNames]: BarvaColorizer;
};
type BaseColorizerNames = keyof typeof baseColorizers;
