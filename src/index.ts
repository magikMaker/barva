/**
 * Barva — lightweight, tree-shakable ANSI color library using tagged template
 * literals.
 *
 * Features:
 *  - 16 basic colors, bright variants, and the full common SGR modifier set
 *  - 256-color palette via {@link ansi256}/{@link bgAnsi256}
 *  - 24-bit truecolor via {@link rgb}/{@link bgRgb}/{@link hex}/{@link bgHex}
 *  - Automatic downgrade to the level supported by the current terminal
 *  - Chaining (e.g. `red.bold.bgYellow`) and nesting (e.g. `red\`a ${blue\`b\`}\``)
 *  - Environment-aware (`NO_COLOR`, `FORCE_COLOR`, CI, TTY) with memoization
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Color output capability.
 *   0 — no colors
 *   1 — basic 16 ANSI colors
 *   2 — 256-color palette (8-bit)
 *   3 — truecolor (24-bit RGB)
 */
export type ColorLevel = 0 | 1 | 2 | 3;

/**
 * Named constants for {@link ColorLevel}. Use these instead of passing raw
 * numbers to {@link setLevel}:
 *
 * ```ts
 * setLevel(ColorLevel.TrueColor);
 * ```
 *
 * The `as const` assertion narrows each field to its literal type (e.g.
 * `ColorLevel.TrueColor` has type `3`), so values are assignable to the
 * {@link ColorLevel} type without casts.
 */
export const ColorLevel = {
  None: 0,
  Basic: 1,
  Ansi256: 2,
  TrueColor: 3,
} as const;

/** Values that may be interpolated into a Barva tagged template. */
export type BarvaValue =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | object
  | null
  | undefined;

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

/**
 * A single styling directive. Stored in structured form so the final rendered
 * SGR string can be computed per-call based on the current color level.
 */
type Segment =
  | { readonly kind: 'basic'; readonly code: number; readonly key: string }
  | {
      readonly kind: 'ansi256';
      readonly bg: boolean;
      readonly code: number;
      readonly key: string;
    }
  | {
      readonly kind: 'truecolor';
      readonly bg: boolean;
      readonly r: number;
      readonly g: number;
      readonly b: number;
      readonly key: string;
    };

// Symbol brand uniquely identifying Barva colorizers. Used instead of
// duck-typing on a property name so that plain objects with a `_codes` field
// cannot be mistaken for a colorizer.
const BARVA_BRAND: unique symbol = Symbol('barva.colorizer');

/** Callable core of a colorizer; augmented with chainable base names below. */
interface ColorizerCore {
  (strings: TemplateStringsArray, ...values: BarvaValue[]): string;
  readonly [BARVA_BRAND]: true;
  /** Internal: the canonical, deduplicated segments. Read-only. */
  readonly _segments: ReadonlyArray<Segment>;
  /** Create a colorizer with an added 24-bit RGB foreground. */
  rgb(r: number, g: number, b: number): BarvaColorizer;
  /** Create a colorizer with an added 24-bit RGB background. */
  bgRgb(r: number, g: number, b: number): BarvaColorizer;
  /** Create a colorizer with an added foreground from a CSS hex color. */
  hex(hex: string): BarvaColorizer;
  /** Create a colorizer with an added background from a CSS hex color. */
  bgHex(hex: string): BarvaColorizer;
  /** Create a colorizer with an added 256-palette foreground (0-255). */
  ansi256(code: number): BarvaColorizer;
  /** Create a colorizer with an added 256-palette background (0-255). */
  bgAnsi256(code: number): BarvaColorizer;
}

/** Names of all modifier-style SGR codes exposed as base colorizers. */
export type ModifierName =
  | 'bold'
  | 'dim'
  | 'italic'
  | 'underline'
  | 'blink'
  | 'inverse'
  | 'hidden'
  | 'strikethrough'
  | 'doubleUnderline'
  | 'framed'
  | 'encircled'
  | 'overline'
  | 'superscript'
  | 'subscript';

/** Names of all basic foreground colors (including bright variants + aliases). */
export type ForegroundName =
  | 'black'
  | 'red'
  | 'green'
  | 'yellow'
  | 'blue'
  | 'magenta'
  | 'cyan'
  | 'white'
  | 'grey'
  | 'gray'
  | 'blackBright'
  | 'redBright'
  | 'greenBright'
  | 'yellowBright'
  | 'blueBright'
  | 'magentaBright'
  | 'cyanBright'
  | 'whiteBright'
  | 'greyBright'
  | 'grayBright';

/** Names of all basic background colors (including bright variants + aliases). */
export type BackgroundName =
  | 'bgBlack'
  | 'bgRed'
  | 'bgGreen'
  | 'bgYellow'
  | 'bgBlue'
  | 'bgMagenta'
  | 'bgCyan'
  | 'bgWhite'
  | 'bgGrey'
  | 'bgGray'
  | 'bgBlackBright'
  | 'bgRedBright'
  | 'bgGreenBright'
  | 'bgYellowBright'
  | 'bgBlueBright'
  | 'bgMagentaBright'
  | 'bgCyanBright'
  | 'bgWhiteBright'
  | 'bgGreyBright'
  | 'bgGrayBright';

/** Union of every base-name colorizer. */
export type BaseName = ModifierName | ForegroundName | BackgroundName;

/**
 * A colorizer: a tagged template function that is also indexable by any
 * base-name to yield another colorizer (for chaining) and callable via
 * {@link ColorizerCore.rgb}/{@link ColorizerCore.hex}/etc.
 */
export type BarvaColorizer = ColorizerCore & {
  readonly [K in BaseName]: BarvaColorizer;
};

// ---------------------------------------------------------------------------
// ANSI constants
// ---------------------------------------------------------------------------

const ESC = '\x1b';
const CSI_START = `${ESC}[`;
const RESET_STR = `${CSI_START}0m`;

// ---------------------------------------------------------------------------
// Base SGR code table
// ---------------------------------------------------------------------------

/**
 * Numeric SGR code for every base-name colorizer. Frozen to prevent accidental
 * mutation.
 */
const BASIC_CODES: Readonly<Record<BaseName, number>> = Object.freeze({
  // Modifiers
  bold: 1,
  dim: 2,
  italic: 3,
  underline: 4,
  blink: 5,
  inverse: 7,
  hidden: 8,
  strikethrough: 9,
  doubleUnderline: 21,
  framed: 51,
  encircled: 52,
  overline: 53,
  superscript: 73,
  subscript: 74,
  // Foreground
  black: 30,
  red: 31,
  green: 32,
  yellow: 33,
  blue: 34,
  magenta: 35,
  cyan: 36,
  white: 37,
  grey: 90,
  gray: 90,
  blackBright: 90,
  redBright: 91,
  greenBright: 92,
  yellowBright: 93,
  blueBright: 94,
  magentaBright: 95,
  cyanBright: 96,
  whiteBright: 97,
  greyBright: 90,
  grayBright: 90,
  // Background
  bgBlack: 40,
  bgRed: 41,
  bgGreen: 42,
  bgYellow: 43,
  bgBlue: 44,
  bgMagenta: 45,
  bgCyan: 46,
  bgWhite: 47,
  bgGrey: 100,
  bgGray: 100,
  bgBlackBright: 100,
  bgRedBright: 101,
  bgGreenBright: 102,
  bgYellowBright: 103,
  bgBlueBright: 104,
  bgMagentaBright: 105,
  bgCyanBright: 106,
  bgWhiteBright: 107,
  bgGreyBright: 100,
  bgGrayBright: 100,
});

const BASIC_NAMES: ReadonlyArray<BaseName> = Object.freeze(
  Object.keys(BASIC_CODES) as BaseName[],
);

// ---------------------------------------------------------------------------
// Environment access + color level detection
// ---------------------------------------------------------------------------

/**
 * Snapshot of the process environment and stdout TTY status. Read through
 * {@link readEnv} so non-Node environments (browsers, Workers) get sensible
 * empty defaults.
 */
type EnvLike = {
  env: Record<string, string | undefined>;
  isTTY: boolean;
  hasProcess: boolean;
};

/**
 * CI env vars identifying providers known to preserve ANSI output. Providers
 * supporting truecolor are handled separately in {@link detectColorLevel}.
 */
const CI_BASIC_ENV_VARS: ReadonlyArray<string> = Object.freeze([
  'GITLAB_CI',
  'TRAVIS',
  'APPVEYOR',
  'BUILDKITE',
  'DRONE',
  'TF_BUILD',
  'TEAMCITY_VERSION',
  'CODEBUILD_BUILD_ARN',
  'CODEBUILD_BUILD_ID',
  'BITBUCKET_COMMIT',
  'VERCEL',
  'NOW_BUILDER',
  'NETLIFY',
  'SEMAPHORE',
  'CIRRUS_CI',
  'HEROKU_TEST_RUN_ID',
  'WOODPECKER',
]);

/** CI env vars for providers known to support 24-bit truecolor. */
const CI_TRUECOLOR_ENV_VARS: ReadonlyArray<string> = Object.freeze([
  'GITHUB_ACTIONS',
  'GITEA_ACTIONS',
  'CIRCLECI',
]);

/**
 * Reads `process.env` / `process.stdout.isTTY` safely. Returns empty defaults
 * in non-Node environments.
 */
const readEnv = (): EnvLike => {
  try {
    if (typeof process !== 'undefined' && process && process.env) {
      return {
        env: process.env as Record<string, string | undefined>,
        isTTY: Boolean(process.stdout && process.stdout.isTTY),
        hasProcess: true,
      };
    }
  } catch {
    // fall through to empty defaults
  }
  return { env: {}, isTTY: false, hasProcess: false };
};

/**
 * Parses a FORCE_COLOR value.
 *
 * Semantics (preserved from earlier barva releases):
 *  - Unset → no forcing; detection continues normally.
 *  - `'0'` or `'false'` → no forcing; detection continues normally.
 *    (i.e. "do not force on", not "force off"). `NO_COLOR` is the canonical
 *    way to force colors off.
 *  - `''` or `'true'` → force level 1.
 *  - `'1'` / `'2'` / `'3'` (or any positive numeric) → force that level,
 *    clamped to 1-3.
 *  - Anything else → undefined (fall through).
 */
const parseForceColor = (value: string | undefined): ColorLevel | undefined => {
  if (value === undefined) return undefined;
  if (value === '0' || value === 'false') return undefined;
  if (value === '' || value === 'true') return 1;
  const num = Number.parseInt(value, 10);
  if (!Number.isFinite(num) || num <= 0) return undefined;
  if (num >= 3) return 3;
  return num as ColorLevel;
};

/**
 * Determines the highest color level the current environment supports. Honors
 * NO_COLOR, FORCE_COLOR, TERM, COLORTERM, TTY state, and common CI env vars.
 */
const detectColorLevel = (envLike: EnvLike = readEnv()): ColorLevel => {
  const env = envLike.env;

  // NO_COLOR disables outright when set to a non-empty value (no-color.org).
  if (env.NO_COLOR !== undefined && env.NO_COLOR !== '') return 0;

  const forced = parseForceColor(env.FORCE_COLOR);
  const term = env.TERM ?? '';
  const colorTerm = env.COLORTERM ?? '';

  // TERM=dumb: only an explicit FORCE_COLOR can enable colors.
  if (term === 'dumb') return forced ?? 0;

  // Truecolor-capable CI providers bypass the TTY check entirely.
  for (const v of CI_TRUECOLOR_ENV_VARS) {
    if (env[v] !== undefined) return 3;
  }

  // FORCE_COLOR set to a positive level: honour it directly.
  if (forced !== undefined) return forced;

  // Basic-color-capable CI providers bypass TTY, at a fixed level 1.
  // (supports-color convention: CI providers are pinned rather than upgraded
  // by TERM, since many sanitize output.)
  for (const v of CI_BASIC_ENV_VARS) {
    if (env[v] !== undefined) return 1;
  }
  if (env.CI_NAME === 'codeship') return 1;

  // No forcing, no matching CI, and no TTY → no colors.
  if (!envLike.isTTY) return 0;

  // Compute capability ceiling from terminal hints.
  if (colorTerm === 'truecolor' || colorTerm === '24bit') return 3;
  // Windows Terminal (WT_SESSION), VS Code's built-in terminal, and every
  // JetBrains-family IDE terminal (IntelliJ IDEA, WebStorm, PyCharm,
  // PhpStorm, RubyMine, CLion, GoLand, Rider, DataGrip, Android Studio, ...
  // — all identified by TERMINAL_EMULATOR=JetBrains-JediTerm) support
  // truecolor.
  if (
    env.WT_SESSION !== undefined ||
    env.TERM_PROGRAM === 'vscode' ||
    env.TERMINAL_EMULATOR === 'JetBrains-JediTerm'
  ) {
    return 3;
  }
  if (/-256(color)?$/i.test(term)) return 2;
  return 1;
};

/**
 * Cached color level. `undefined` forces a re-detection on first access.
 * Invalidated by {@link refreshLevel}, {@link setEnabled}, {@link setDisabled},
 * and {@link setLevel}.
 */
let cachedLevel: ColorLevel | undefined;

/** Forces a re-detection of the color level from the current environment. */
const refreshLevel = (): ColorLevel => {
  cachedLevel = detectColorLevel();
  return cachedLevel;
};

/**
 * Returns the current color level, running detection on first access.
 */
export const getLevel = (): ColorLevel => {
  if (cachedLevel === undefined) refreshLevel();
  return cachedLevel as ColorLevel;
};

/**
 * Overrides the color level. Pass `undefined` to re-run environment detection.
 * Values outside 0-3 are clamped.
 */
export const setLevel = (level: ColorLevel | undefined): void => {
  if (level === undefined || level === null) {
    refreshLevel();
    return;
  }
  const rounded = Math.trunc(level);
  const clamped = rounded < 0 ? 0 : rounded > 3 ? 3 : rounded;
  cachedLevel = clamped as ColorLevel;
};

/**
 * Enables or disables colors. `undefined`/no argument re-runs environment
 * detection. Passing `true` keeps the detected level when it is positive, and
 * falls back to basic (level 1) when detection says none.
 */
export const setEnabled = (enabled?: boolean): void => {
  if (enabled === undefined || enabled === null) {
    refreshLevel();
    return;
  }
  if (enabled) {
    const detected = detectColorLevel();
    cachedLevel = detected > 0 ? detected : 1;
  } else {
    cachedLevel = 0;
  }
};

/**
 * Disables colors. `undefined`/no argument disables; passing `false` enables
 * (inverse of {@link setEnabled}).
 */
export const setDisabled = (disabled?: boolean): void => {
  if (disabled === undefined || disabled === null) {
    cachedLevel = 0;
    return;
  }
  if (disabled) {
    cachedLevel = 0;
  } else {
    const detected = detectColorLevel();
    cachedLevel = detected > 0 ? detected : 1;
  }
};

/** Whether any color output is currently enabled (level > 0). */
export const isEnabled = (): boolean => getLevel() > 0;

/**
 * Whether the environment (re-evaluated on every call, without relying on
 * cached state) currently supports any color output. Useful as a probe.
 */
export const isColorSupported = (): boolean => detectColorLevel() > 0;

/**
 * Internal: force a re-read of the environment. Exported so tests can verify
 * detection without relying on side effects of other APIs.
 *
 * @internal
 */
export const _refreshEnv = (): ColorLevel => refreshLevel();

// ---------------------------------------------------------------------------
// Color space conversions
// ---------------------------------------------------------------------------

/** Clamps a value to an unsigned byte (0-255), rounding to integer. */
const clampByte = (n: number): number => {
  const v = Math.round(n);
  if (!Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 255) return 255;
  return v;
};

/** Clamps a value to an unsigned 8-bit palette index (0-255). */
const clampAnsi256 = (n: number): number => {
  const v = Math.trunc(n);
  if (!Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 255) return 255;
  return v;
};

/**
 * Parses a CSS-style hex color ("#rgb", "#rrggbb", or without leading `#`)
 * into an `[r, g, b]` triple.
 */
const parseHex = (hex: string): [number, number, number] => {
  if (typeof hex !== 'string') {
    throw new TypeError(`Invalid hex color: ${String(hex)}`);
  }
  const trimmed = hex.trim().replace(/^#/, '');
  const normalized =
    trimmed.length === 3
      ? trimmed
          .split('')
          .map((c) => c + c)
          .join('')
      : trimmed;
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    throw new TypeError(`Invalid hex color: ${JSON.stringify(hex)}`);
  }
  const num = parseInt(normalized, 16);
  return [(num >> 16) & 0xff, (num >> 8) & 0xff, num & 0xff];
};

/**
 * Converts an RGB triplet to the nearest ANSI 256-palette code. Uses the
 * standard 6x6x6 cube + 24-step grayscale ramp.
 */
const rgbToAnsi256 = (r: number, g: number, b: number): number => {
  const rr = clampByte(r);
  const gg = clampByte(g);
  const bb = clampByte(b);
  if (rr === gg && gg === bb) {
    if (rr < 8) return 16;
    if (rr > 248) return 231;
    return Math.round(((rr - 8) / 247) * 24) + 232;
  }
  return (
    16 +
    36 * Math.round((rr / 255) * 5) +
    6 * Math.round((gg / 255) * 5) +
    Math.round((bb / 255) * 5)
  );
};

/**
 * Converts an RGB triplet to the nearest basic 16-color foreground code
 * (30-37, 90-97). Add 10 for the equivalent background.
 */
const rgbToAnsi16 = (r: number, g: number, b: number): number => {
  const rr = clampByte(r);
  const gg = clampByte(g);
  const bb = clampByte(b);
  const value = Math.max(rr, gg, bb);
  if (value < 50) return 30;
  const bright = value >= 200 ? 60 : 0;
  const bits =
    (bb / 255 >= 0.5 ? 4 : 0) +
    (gg / 255 >= 0.5 ? 2 : 0) +
    (rr / 255 >= 0.5 ? 1 : 0);
  return 30 + bright + bits;
};

/**
 * Converts an ANSI 256 index to the nearest basic 16-color foreground code.
 */
const ansi256ToAnsi16 = (code: number): number => {
  if (code < 8) return 30 + code;
  if (code < 16) return 90 + (code - 8);
  let r: number;
  let g: number;
  let b: number;
  if (code >= 232) {
    r = g = b = (code - 232) * 10 + 8;
  } else {
    const offset = code - 16;
    r = Math.floor(offset / 36) * 51;
    g = Math.floor((offset % 36) / 6) * 51;
    b = (offset % 6) * 51;
  }
  return rgbToAnsi16(r, g, b);
};

// ---------------------------------------------------------------------------
// Segment builders & rendering
// ---------------------------------------------------------------------------

/** Builds a basic-SGR segment (modifier or 16-color). */
const basicSegment = (code: number): Segment => ({
  kind: 'basic',
  code,
  key: `b:${code}`,
});

/** Builds a 256-palette segment with bounds-checking. */
const ansi256Segment = (bg: boolean, raw: number): Segment => {
  const code = clampAnsi256(raw);
  return { kind: 'ansi256', bg, code, key: `a:${bg ? 1 : 0}:${code}` };
};

/** Builds a truecolor segment with byte-level clamping. */
const truecolorSegment = (
  bg: boolean,
  r: number,
  g: number,
  b: number,
): Segment => {
  const rr = clampByte(r);
  const gg = clampByte(g);
  const bb = clampByte(b);
  return {
    kind: 'truecolor',
    bg,
    r: rr,
    g: gg,
    b: bb,
    key: `t:${bg ? 1 : 0}:${rr}:${gg}:${bb}`,
  };
};

/**
 * Returns the sort priority of a segment, equal to the first numeric code it
 * emits. Used so the rendered SGR sequence is deterministic (modifiers first,
 * then colors) regardless of the order styles were chained.
 */
const segmentPriority = (s: Segment): number => {
  if (s.kind === 'basic') return s.code;
  return s.bg ? 48 : 38;
};

const compareSegments = (a: Segment, b: Segment): number => {
  const pa = segmentPriority(a);
  const pb = segmentPriority(b);
  if (pa !== pb) return pa - pb;
  return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
};

/**
 * Renders a segment to the numeric SGR parameter string at the given level.
 * Returns `null` when `level === 0` (color disabled).
 */
const renderSegment = (seg: Segment, level: ColorLevel): string | null => {
  if (level === 0) return null;
  if (seg.kind === 'basic') return String(seg.code);
  if (seg.kind === 'ansi256') {
    if (level >= 2) return `${seg.bg ? 48 : 38};5;${seg.code}`;
    const base = ansi256ToAnsi16(seg.code);
    return String(seg.bg ? base + 10 : base);
  }
  // truecolor
  if (level >= 3) return `${seg.bg ? 48 : 38};2;${seg.r};${seg.g};${seg.b}`;
  if (level >= 2) {
    const code = rgbToAnsi256(seg.r, seg.g, seg.b);
    return `${seg.bg ? 48 : 38};5;${code}`;
  }
  const base = rgbToAnsi16(seg.r, seg.g, seg.b);
  return String(seg.bg ? base + 10 : base);
};

/** Computes the complete start-of-sequence escape string for a colorizer. */
const computeStartCode = (
  segments: ReadonlyArray<Segment>,
  level: ColorLevel,
): string => {
  if (level === 0 || segments.length === 0) return '';
  const parts: string[] = [];
  for (const s of segments) {
    const rendered = renderSegment(s, level);
    if (rendered !== null) parts.push(rendered);
  }
  if (parts.length === 0) return '';
  return `${CSI_START}${parts.join(';')}m`;
};

// ---------------------------------------------------------------------------
// Regex helpers
// ---------------------------------------------------------------------------

// Pattern adapted from the widely-used `ansi-regex` module. Matches CSI
// sequences and OSC sequences terminated by BEL.
const ANSI_PATTERN =
  '[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)|(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))';

/**
 * Returns a fresh `RegExp` matching any ANSI escape sequence. A new instance
 * is returned on every call so callers can safely use it with stateful
 * methods (e.g. `.exec`) without interference.
 */
export const ansiRegex = (): RegExp => new RegExp(ANSI_PATTERN, 'g');

/**
 * Removes every ANSI escape sequence from the input string. Safe for
 * non-string inputs (returned via `String()`).
 */
export const strip = (input: string): string => {
  if (typeof input !== 'string') return String(input);
  return input.replace(new RegExp(ANSI_PATTERN, 'g'), '');
};

/** Alias for {@link strip} matching the `strip-ansi` package name. */
export const stripAnsi = strip;

// ---------------------------------------------------------------------------
// Colorizer factory & cache
// ---------------------------------------------------------------------------

const colorizerCache = new Map<string, BarvaColorizer>();

/**
 * Type guard: true when `value` is a Barva colorizer (callable with the
 * module-private brand symbol). Cannot be spoofed by plain objects.
 */
const isColorizer = (value: unknown): value is BarvaColorizer =>
  typeof value === 'function' &&
  (value as { [BARVA_BRAND]?: true })[BARVA_BRAND] === true;

// Pre-built empty template used to evaluate a nested bare colorizer passed
// as a template expression (e.g. `red\`${blue}\``).
const EMPTY_TEMPLATE: TemplateStringsArray = (() => {
  const arr = [''] as unknown as TemplateStringsArray;
  Object.defineProperty(arr, 'raw', { value: [''] });
  return arr;
})();

/**
 * Returns the content produced by calling `fn` as an empty template literal.
 * Used when a bare colorizer is interpolated into another colorizer's
 * template.
 */
const callEmpty = (fn: BarvaColorizer): string => fn(EMPTY_TEMPLATE);

/** Escapes a literal string for use in a RegExp. */
const escapeForRegex = (s: string): string =>
  s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Canonicalises a list of segments: dedupes by key, sorts for a stable cache
 * key and rendering order.
 */
const canonicalise = (segments: ReadonlyArray<Segment>): Segment[] => {
  const seen = new Set<string>();
  const out: Segment[] = [];
  for (const s of segments) {
    if (!seen.has(s.key)) {
      seen.add(s.key);
      out.push(s);
    }
  }
  out.sort(compareSegments);
  return out;
};

/**
 * Creates (or retrieves from cache) a colorizer for the given segment set.
 */
const makeColorizer = (segments: ReadonlyArray<Segment>): BarvaColorizer => {
  const canonical = canonicalise(segments);
  const cacheKey = canonical.map((s) => s.key).join('|');

  const cached = colorizerCache.get(cacheKey);
  if (cached) return cached;

  const frozen: ReadonlyArray<Segment> = Object.freeze(canonical);

  const tag = (
    strings: TemplateStringsArray,
    ...values: BarvaValue[]
  ): string => {
    const level = getLevel();
    const start = computeStartCode(frozen, level);

    // Disabled (or empty-style) path: just concatenate.
    if (start === '') {
      const len = strings.length;
      const numValues = values.length;
      let out = '';
      for (let i = 0; i < len; i++) {
        out += strings[i];
        if (i < numValues) {
          const v = values[i];
          if (isColorizer(v)) {
            out += callEmpty(v);
          } else {
            out += String(v);
          }
        }
      }
      return out;
    }

    // Enabled path.
    const len = strings.length;
    const numValues = values.length;
    const parts: string[] = new Array(1 + len + numValues + 1);
    let idx = 0;
    parts[idx++] = start;

    const trailingReset = new RegExp(escapeForRegex(RESET_STR) + '$');

    for (let i = 0; i < len; i++) {
      parts[idx++] = strings[i];
      if (i < numValues) {
        const v = values[i];
        if (isColorizer(v)) {
          const nested = callEmpty(v);
          parts[idx++] = nested.replace(trailingReset, start);
        } else {
          parts[idx++] = String(v);
        }
      }
    }
    parts[idx] = RESET_STR;
    return parts.join('');
  };

  const colorizer = tag as unknown as BarvaColorizer;

  Object.defineProperty(colorizer, BARVA_BRAND, {
    value: true,
    enumerable: false,
    configurable: false,
    writable: false,
  });
  Object.defineProperty(colorizer, '_segments', {
    value: frozen,
    enumerable: false,
    configurable: false,
    writable: false,
  });

  // Chainable base properties (lazy, cached through makeColorizer).
  for (const name of BASIC_NAMES) {
    Object.defineProperty(colorizer, name, {
      get: () =>
        makeColorizer([...frozen, basicSegment(BASIC_CODES[name])]),
      enumerable: true,
      configurable: false,
    });
  }

  // Chainable palette/truecolor factories.
  Object.defineProperty(colorizer, 'rgb', {
    value: (r: number, g: number, b: number) =>
      makeColorizer([...frozen, truecolorSegment(false, r, g, b)]),
    enumerable: false,
    configurable: false,
    writable: false,
  });
  Object.defineProperty(colorizer, 'bgRgb', {
    value: (r: number, g: number, b: number) =>
      makeColorizer([...frozen, truecolorSegment(true, r, g, b)]),
    enumerable: false,
    configurable: false,
    writable: false,
  });
  Object.defineProperty(colorizer, 'hex', {
    value: (hexCode: string) => {
      const [r, g, b] = parseHex(hexCode);
      return makeColorizer([...frozen, truecolorSegment(false, r, g, b)]);
    },
    enumerable: false,
    configurable: false,
    writable: false,
  });
  Object.defineProperty(colorizer, 'bgHex', {
    value: (hexCode: string) => {
      const [r, g, b] = parseHex(hexCode);
      return makeColorizer([...frozen, truecolorSegment(true, r, g, b)]);
    },
    enumerable: false,
    configurable: false,
    writable: false,
  });
  Object.defineProperty(colorizer, 'ansi256', {
    value: (code: number) =>
      makeColorizer([...frozen, ansi256Segment(false, code)]),
    enumerable: false,
    configurable: false,
    writable: false,
  });
  Object.defineProperty(colorizer, 'bgAnsi256', {
    value: (code: number) =>
      makeColorizer([...frozen, ansi256Segment(true, code)]),
    enumerable: false,
    configurable: false,
    writable: false,
  });

  colorizerCache.set(cacheKey, colorizer);
  return colorizer;
};

// ---------------------------------------------------------------------------
// Base colorizers, palette factories, and exports
// ---------------------------------------------------------------------------

const baseColorizers = Object.freeze(
  BASIC_NAMES.reduce(
    (acc, name) => {
      acc[name] = makeColorizer([basicSegment(BASIC_CODES[name])]);
      return acc;
    },
    {} as Record<BaseName, BarvaColorizer>,
  ),
);

/**
 * Emits a plain ANSI reset sequence. Useful when manually writing to streams
 * and needing to cancel prior styling without wrapping content.
 */
export const reset: BarvaColorizer = makeColorizer([basicSegment(0)]);

/** Returns a colorizer for a 24-bit RGB foreground color. */
export const rgb = (r: number, g: number, b: number): BarvaColorizer =>
  makeColorizer([truecolorSegment(false, r, g, b)]);

/** Returns a colorizer for a 24-bit RGB background color. */
export const bgRgb = (r: number, g: number, b: number): BarvaColorizer =>
  makeColorizer([truecolorSegment(true, r, g, b)]);

/** Returns a colorizer for a foreground color parsed from a CSS hex string. */
export const hex = (hexCode: string): BarvaColorizer => {
  const [r, g, b] = parseHex(hexCode);
  return makeColorizer([truecolorSegment(false, r, g, b)]);
};

/** Returns a colorizer for a background color parsed from a CSS hex string. */
export const bgHex = (hexCode: string): BarvaColorizer => {
  const [r, g, b] = parseHex(hexCode);
  return makeColorizer([truecolorSegment(true, r, g, b)]);
};

/** Returns a colorizer for a 256-palette (8-bit) foreground color. */
export const ansi256 = (code: number): BarvaColorizer =>
  makeColorizer([ansi256Segment(false, code)]);

/** Returns a colorizer for a 256-palette (8-bit) background color. */
export const bgAnsi256 = (code: number): BarvaColorizer =>
  makeColorizer([ansi256Segment(true, code)]);

export const {
  // Modifiers
  bold,
  dim,
  italic,
  underline,
  blink,
  inverse,
  hidden,
  strikethrough,
  doubleUnderline,
  framed,
  encircled,
  overline,
  superscript,
  subscript,
  // Foreground colors
  black,
  red,
  green,
  yellow,
  blue,
  magenta,
  cyan,
  white,
  grey,
  gray,
  // Bright foreground variants
  blackBright,
  redBright,
  greenBright,
  yellowBright,
  blueBright,
  magentaBright,
  cyanBright,
  whiteBright,
  greyBright,
  grayBright,
  // Background colors
  bgBlack,
  bgRed,
  bgGreen,
  bgYellow,
  bgBlue,
  bgMagenta,
  bgCyan,
  bgWhite,
  bgGrey,
  bgGray,
  // Bright background variants
  bgBlackBright,
  bgRedBright,
  bgGreenBright,
  bgYellowBright,
  bgBlueBright,
  bgMagentaBright,
  bgCyanBright,
  bgWhiteBright,
  bgGreyBright,
  bgGrayBright,
} = baseColorizers;

/** Namespace export with every base colorizer plus utility functions. */
export interface BarvaNamespace extends Record<BaseName, BarvaColorizer> {
  reset: BarvaColorizer;
  rgb: typeof rgb;
  bgRgb: typeof bgRgb;
  hex: typeof hex;
  bgHex: typeof bgHex;
  ansi256: typeof ansi256;
  bgAnsi256: typeof bgAnsi256;
  strip: typeof strip;
  stripAnsi: typeof stripAnsi;
  ansiRegex: typeof ansiRegex;
  setEnabled: typeof setEnabled;
  setDisabled: typeof setDisabled;
  setLevel: typeof setLevel;
  getLevel: typeof getLevel;
  isEnabled: typeof isEnabled;
  isColorSupported: typeof isColorSupported;
  ColorLevel: typeof ColorLevel;
}

const barvaExport: BarvaNamespace = {
  ...baseColorizers,
  reset,
  rgb,
  bgRgb,
  hex,
  bgHex,
  ansi256,
  bgAnsi256,
  strip,
  stripAnsi,
  ansiRegex,
  setEnabled,
  setDisabled,
  setLevel,
  getLevel,
  isEnabled,
  isColorSupported,
  ColorLevel,
};

export default barvaExport;
export { barvaExport as barva };
