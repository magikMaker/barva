/// <reference types="jest" />

import * as barvaImport from '../index';
import defaultExport, { barva } from '../index';

// Snapshot of the real environment so afterAll can restore it.
const originalEnv = process.env;
const originalStdoutIsTTY = process.stdout.isTTY;

// Env vars that influence color detection. Cleared in beforeEach so every
// test starts from a deterministic baseline.
const COLOR_ENV_VARS = [
  'NO_COLOR',
  'FORCE_COLOR',
  'COLORTERM',
  'TERM',
  'TERM_PROGRAM',
  'TERMINAL_EMULATOR',
  'WT_SESSION',
  'CI',
  'CI_NAME',
  'GITHUB_ACTIONS',
  'GITEA_ACTIONS',
  'CIRCLECI',
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
];

const clearColorEnv = (): void => {
  for (const key of COLOR_ENV_VARS) delete process.env[key];
};

const setTTY = (value: boolean): void => {
  Object.defineProperty(process.stdout, 'isTTY', {
    value,
    writable: true,
    configurable: true,
  });
};

beforeEach(() => {
  process.env = { ...originalEnv };
  clearColorEnv();
  process.env.TERM = 'xterm-256color';
  setTTY(true);
  barvaImport._refreshEnv();
});

afterAll(() => {
  process.env = originalEnv;
  setTTY(originalStdoutIsTTY ?? false);
});

// Control-character helpers for test matchers.
const ESC = '\x1b';
const startCode = (code: string): RegExp => new RegExp(`${ESC}\\[${code}m`);
const resetCode = startCode('0');
const stripAnsi = (str: string): string =>
  str.replace(new RegExp(`${ESC}\\[[\\d;]+m`, 'g'), '');

describe('Barva Library', () => {
  describe('Basic functionality', () => {
    test('should apply foreground colors', () => {
      const redText = barvaImport.red`This is red`;
      expect(redText).toMatch(startCode('31'));
      expect(redText).toMatch(resetCode);
      expect(redText).toContain('This is red');
    });

    test('should apply background colors', () => {
      const bgBlueText = barvaImport.bgBlue`Blue background`;
      expect(bgBlueText).toMatch(startCode('44'));
      expect(bgBlueText).toContain('Blue background');
    });

    test('should apply modifiers', () => {
      const boldText = barvaImport.bold`Bold text`;
      expect(boldText).toMatch(startCode('1'));
      expect(boldText).toContain('Bold text');
    });

    test('should apply bright color variants', () => {
      const brightText = barvaImport.redBright`Bright red`;
      expect(brightText).toMatch(startCode('91'));
      expect(brightText).toContain('Bright red');
    });

    test('should handle template expressions', () => {
      const name = 'World';
      const greeting = barvaImport.green`Hello, ${name}!`;
      expect(greeting).toMatch(startCode('32'));
      expect(greeting).toContain('Hello, World!');
    });

    test('should apply grey and gray colors', () => {
      expect(barvaImport.grey`This is grey`).toMatch(startCode('90'));
      expect(barvaImport.gray`This is gray`).toMatch(startCode('90'));
    });

    test('should apply bgGrey and bgGray background colors', () => {
      expect(barvaImport.bgGrey`g`).toMatch(startCode('100'));
      expect(barvaImport.bgGray`g`).toMatch(startCode('100'));
    });
  });

  describe('New ANSI modifiers', () => {
    test('blink emits SGR 5', () => {
      expect(barvaImport.blink`flash`).toMatch(startCode('5'));
    });

    test('doubleUnderline emits SGR 21', () => {
      expect(barvaImport.doubleUnderline`hi`).toMatch(startCode('21'));
    });

    test('framed emits SGR 51', () => {
      expect(barvaImport.framed`box`).toMatch(startCode('51'));
    });

    test('encircled emits SGR 52', () => {
      expect(barvaImport.encircled`o`).toMatch(startCode('52'));
    });

    test('overline emits SGR 53', () => {
      expect(barvaImport.overline`top`).toMatch(startCode('53'));
    });

    test('superscript emits SGR 73', () => {
      expect(barvaImport.superscript`^`).toMatch(startCode('73'));
    });

    test('subscript emits SGR 74', () => {
      expect(barvaImport.subscript`_`).toMatch(startCode('74'));
    });
  });

  describe('Chaining functionality', () => {
    test('should allow chaining styles without @ts-expect-error', () => {
      const styledText = barvaImport.blue.bold`Bold blue text`;
      expect(styledText).toMatch(startCode('1;34'));
      expect(styledText).toContain('Bold blue text');
    });

    test('should sort codes deterministically regardless of chain order', () => {
      const a = barvaImport.red.bgYellow.underline`hi`;
      const b = barvaImport.underline.bgYellow.red`hi`;
      expect(a).toMatch(startCode('4;31;43'));
      expect(b).toMatch(startCode('4;31;43'));
    });

    test('should dedupe repeated codes in a chain', () => {
      const text = barvaImport.red.red.bold.red`hi`;
      expect(text).toMatch(startCode('1;31'));
    });

    test('should return cached colorizer instances across equivalent chains', () => {
      expect(barvaImport.red.bold).toBe(barvaImport.bold.red);
      expect(barvaImport.red.bold).toBe(barvaImport.red.bold);
    });

    test('should not mutate original base colorizer when chained', () => {
      const redOnly = barvaImport.red`only`;
      const redBoldUnderline = barvaImport.red.bold.underline`x`;
      expect(redOnly).toMatch(startCode('31'));
      expect(redOnly).not.toMatch(startCode('1;'));
      expect(redBoldUnderline).toMatch(startCode('1;4;31'));
    });
  });

  describe('Nested colorizers', () => {
    test('should handle nested colors', () => {
      const nested = barvaImport.red`Red ${barvaImport.blue`Blue`} Red`;
      expect(nested).toMatch(startCode('31'));
      expect(nested).toMatch(startCode('34'));
      expect(nested).toMatch(resetCode);
      expect(stripAnsi(nested)).toBe('Red Blue Red');
    });

    test('should handle deeply nested colors', () => {
      const deep = barvaImport.red`A ${barvaImport.blue`B ${barvaImport.green`C`} B`} A`;
      expect(stripAnsi(deep)).toBe('A B C B A');
      expect(deep).toMatch(startCode('31'));
      expect(deep).toMatch(startCode('34'));
      expect(deep).toMatch(startCode('32'));
    });

    test('should handle bare nested colorizer interpolation', () => {
      const bare = barvaImport.red`Outer ${barvaImport.blue} still outer`;
      expect(bare).toMatch(startCode('31'));
      expect(bare).toMatch(startCode('34'));
      expect(bare).toMatch(resetCode);
    });

    test('should not mistake plain objects with _codes for colorizers', () => {
      const fake = { _codes: 'not-an-array', _segments: 'nope' };
      const result = barvaImport.red`Testing ${fake as unknown as string} handling`;
      expect(result).toContain('[object Object]');
    });

    test('should handle Symbol and object values safely', () => {
      type SelfRef = { self?: SelfRef };
      const circular: SelfRef = {};
      circular.self = circular;
      const sym = Symbol('test');
      const out = barvaImport.green`C: ${circular} S: ${sym}`;
      expect(out).toMatch(startCode('32'));
      expect(out).toContain('C:');
      expect(out).toContain('S:');
    });

    test('should handle empty nested content', () => {
      const out = barvaImport.red`A ${barvaImport.blue``} B`;
      expect(stripAnsi(out)).toBe('A  B');
    });
  });

  describe('Color enabling/disabling', () => {
    test('setEnabled(false) disables colors', () => {
      barvaImport.setEnabled(false);
      const out = barvaImport.red`no color`;
      expect(out).toBe('no color');
      expect(barvaImport.isEnabled()).toBe(false);
    });

    test('setEnabled(true) re-enables colors', () => {
      barvaImport.setEnabled(false);
      barvaImport.setEnabled(true);
      expect(barvaImport.green`yes`).toMatch(startCode('32'));
    });

    test('setEnabled() without args uses env detection (TTY=true)', () => {
      setTTY(true);
      barvaImport.setEnabled();
      expect(barvaImport.isEnabled()).toBe(true);
    });

    test('setEnabled() without args uses env detection (TTY=false)', () => {
      setTTY(false);
      barvaImport.setEnabled();
      expect(barvaImport.isEnabled()).toBe(false);
    });

    test('setDisabled() disables colors', () => {
      barvaImport.setDisabled();
      expect(barvaImport.isEnabled()).toBe(false);
      expect(barvaImport.red`hi`).toBe('hi');
    });

    test('setDisabled(true) disables colors', () => {
      barvaImport.setDisabled(true);
      expect(barvaImport.isEnabled()).toBe(false);
    });

    test('setDisabled(false) enables colors', () => {
      barvaImport.setEnabled(false);
      barvaImport.setDisabled(false);
      expect(barvaImport.isEnabled()).toBe(true);
    });

    test('NO_COLOR disables colors on detection', () => {
      process.env.NO_COLOR = '1';
      barvaImport.setEnabled();
      expect(barvaImport.isEnabled()).toBe(false);
    });

    test('NO_COLOR="" does not disable colors', () => {
      process.env.NO_COLOR = '';
      setTTY(true);
      barvaImport.setEnabled();
      expect(barvaImport.isEnabled()).toBe(true);
    });

    test('FORCE_COLOR=1 enables colors even without TTY', () => {
      setTTY(false);
      process.env.FORCE_COLOR = '1';
      barvaImport.setEnabled();
      expect(barvaImport.isEnabled()).toBe(true);
      expect(barvaImport.getLevel()).toBe(1);
    });

    test('FORCE_COLOR=true enables colors at level 1', () => {
      setTTY(false);
      process.env.FORCE_COLOR = 'true';
      barvaImport.setEnabled();
      expect(barvaImport.getLevel()).toBe(1);
    });

    test('FORCE_COLOR=2 forces level 2', () => {
      setTTY(false);
      process.env.FORCE_COLOR = '2';
      barvaImport.setEnabled();
      expect(barvaImport.getLevel()).toBe(2);
    });

    test('FORCE_COLOR=3 forces level 3', () => {
      setTTY(false);
      process.env.FORCE_COLOR = '3';
      barvaImport.setEnabled();
      expect(barvaImport.getLevel()).toBe(3);
    });

    test('FORCE_COLOR=0 does not force; falls back to TTY', () => {
      process.env.FORCE_COLOR = '0';
      setTTY(false);
      barvaImport.setEnabled();
      expect(barvaImport.isEnabled()).toBe(false);
      setTTY(true);
      barvaImport.setEnabled();
      expect(barvaImport.isEnabled()).toBe(true);
    });

    test('FORCE_COLOR=false does not force; falls back to TTY', () => {
      process.env.FORCE_COLOR = 'false';
      setTTY(false);
      barvaImport.setEnabled();
      expect(barvaImport.isEnabled()).toBe(false);
      setTTY(true);
      barvaImport.setEnabled();
      expect(barvaImport.isEnabled()).toBe(true);
    });

    test('TERM=dumb disables colors unless FORCE_COLOR is set', () => {
      process.env.TERM = 'dumb';
      setTTY(true);
      barvaImport.setEnabled();
      expect(barvaImport.getLevel()).toBe(0);
      process.env.FORCE_COLOR = '2';
      barvaImport.setEnabled();
      expect(barvaImport.getLevel()).toBe(2);
    });
  });

  describe('Color level (getLevel / setLevel)', () => {
    test('getLevel is 0 when disabled', () => {
      barvaImport.setEnabled(false);
      expect(barvaImport.getLevel()).toBe(0);
    });

    test('setLevel clamps to 0-3', () => {
      barvaImport.setLevel(99 as unknown as 3);
      expect(barvaImport.getLevel()).toBe(3);
      barvaImport.setLevel(-5 as unknown as 0);
      expect(barvaImport.getLevel()).toBe(0);
    });

    test('setLevel(undefined) triggers re-detection', () => {
      setTTY(true);
      barvaImport.setLevel(0);
      expect(barvaImport.getLevel()).toBe(0);
      barvaImport.setLevel(undefined);
      expect(barvaImport.getLevel()).toBeGreaterThan(0);
    });

    test('COLORTERM=truecolor detected as level 3', () => {
      setTTY(true);
      process.env.COLORTERM = 'truecolor';
      barvaImport.setEnabled();
      expect(barvaImport.getLevel()).toBe(3);
    });

    test('COLORTERM=24bit detected as level 3', () => {
      setTTY(true);
      process.env.COLORTERM = '24bit';
      barvaImport.setEnabled();
      expect(barvaImport.getLevel()).toBe(3);
    });

    test('TERM=xterm-256color detected as level 2', () => {
      setTTY(true);
      delete process.env.COLORTERM;
      process.env.TERM = 'xterm-256color';
      barvaImport.setEnabled();
      expect(barvaImport.getLevel()).toBe(2);
    });

    test('TERM=xterm detected as level 1', () => {
      setTTY(true);
      delete process.env.COLORTERM;
      process.env.TERM = 'xterm';
      barvaImport.setEnabled();
      expect(barvaImport.getLevel()).toBe(1);
    });

    test('GITHUB_ACTIONS detected as level 3 even without TTY', () => {
      setTTY(false);
      process.env.GITHUB_ACTIONS = 'true';
      barvaImport.setEnabled();
      expect(barvaImport.getLevel()).toBe(3);
    });

    test('GITLAB_CI detected as level 1 even without TTY', () => {
      setTTY(false);
      process.env.GITLAB_CI = 'true';
      barvaImport.setEnabled();
      expect(barvaImport.getLevel()).toBe(1);
    });

    test('CI_NAME=codeship detected as level 1', () => {
      setTTY(false);
      process.env.CI_NAME = 'codeship';
      barvaImport.setEnabled();
      expect(barvaImport.getLevel()).toBe(1);
    });

    test('TERM_PROGRAM=vscode upgraded to truecolor', () => {
      setTTY(true);
      delete process.env.COLORTERM;
      process.env.TERM = 'xterm-256color';
      process.env.TERM_PROGRAM = 'vscode';
      barvaImport.setEnabled();
      expect(barvaImport.getLevel()).toBe(3);
    });

    test('JetBrains-JediTerm upgraded to truecolor (IntelliJ family)', () => {
      setTTY(true);
      delete process.env.COLORTERM;
      process.env.TERM = 'xterm-256color';
      process.env.TERMINAL_EMULATOR = 'JetBrains-JediTerm';
      barvaImport.setEnabled();
      expect(barvaImport.getLevel()).toBe(3);
    });

    test('WT_SESSION upgraded to truecolor (Windows Terminal)', () => {
      setTTY(true);
      delete process.env.COLORTERM;
      process.env.TERM = 'xterm-256color';
      process.env.WT_SESSION = 'some-guid';
      barvaImport.setEnabled();
      expect(barvaImport.getLevel()).toBe(3);
    });
  });

  describe('ColorLevel constants', () => {
    test('expose named numeric levels', () => {
      expect(barvaImport.ColorLevel.None).toBe(0);
      expect(barvaImport.ColorLevel.Basic).toBe(1);
      expect(barvaImport.ColorLevel.Ansi256).toBe(2);
      expect(barvaImport.ColorLevel.TrueColor).toBe(3);
    });

    test('are assignable to setLevel without cast', () => {
      barvaImport.setLevel(barvaImport.ColorLevel.TrueColor);
      expect(barvaImport.getLevel()).toBe(3);
      barvaImport.setLevel(barvaImport.ColorLevel.Ansi256);
      expect(barvaImport.getLevel()).toBe(2);
      barvaImport.setLevel(barvaImport.ColorLevel.Basic);
      expect(barvaImport.getLevel()).toBe(1);
      barvaImport.setLevel(barvaImport.ColorLevel.None);
      expect(barvaImport.getLevel()).toBe(0);
    });

    test('exposed on the default namespace export', () => {
      expect(defaultExport.ColorLevel).toBe(barvaImport.ColorLevel);
      expect(defaultExport.ColorLevel.TrueColor).toBe(3);
    });

    test('numeric arguments to setLevel still work alongside constants', () => {
      barvaImport.setLevel(3);
      expect(barvaImport.getLevel()).toBe(3);
      barvaImport.setLevel(0);
      expect(barvaImport.getLevel()).toBe(0);
    });
  });

  describe('isColorSupported', () => {
    test('reflects current environment without relying on cache', () => {
      barvaImport.setEnabled(false);
      setTTY(true);
      expect(barvaImport.isColorSupported()).toBe(true);
      setTTY(false);
      expect(barvaImport.isColorSupported()).toBe(false);
    });
  });

  describe('256-color palette', () => {
    test('ansi256 emits foreground 38;5;n', () => {
      barvaImport.setLevel(2);
      expect(barvaImport.ansi256(196)`hot`).toMatch(startCode('38;5;196'));
    });

    test('bgAnsi256 emits background 48;5;n', () => {
      barvaImport.setLevel(2);
      expect(barvaImport.bgAnsi256(21)`ocean`).toMatch(startCode('48;5;21'));
    });

    test('clamps out-of-range indices', () => {
      barvaImport.setLevel(2);
      expect(barvaImport.ansi256(999)`x`).toMatch(startCode('38;5;255'));
      expect(barvaImport.ansi256(-5)`x`).toMatch(startCode('38;5;0'));
    });

    test('chainable with basic modifiers', () => {
      barvaImport.setLevel(2);
      const out = barvaImport.bold.ansi256(82)`leaf`;
      expect(out).toMatch(startCode('1;38;5;82'));
    });
  });

  describe('Truecolor (rgb / hex)', () => {
    test('rgb emits 38;2;R;G;B at level 3', () => {
      barvaImport.setLevel(3);
      expect(barvaImport.rgb(10, 20, 30)`x`).toMatch(startCode('38;2;10;20;30'));
    });

    test('bgRgb emits 48;2;R;G;B at level 3', () => {
      barvaImport.setLevel(3);
      expect(barvaImport.bgRgb(1, 2, 3)`x`).toMatch(startCode('48;2;1;2;3'));
    });

    test('hex #ff0080 parsed to rgb(255,0,128)', () => {
      barvaImport.setLevel(3);
      expect(barvaImport.hex('#ff0080')`x`).toMatch(startCode('38;2;255;0;128'));
    });

    test('hex without # accepted', () => {
      barvaImport.setLevel(3);
      expect(barvaImport.hex('00ff00')`x`).toMatch(startCode('38;2;0;255;0'));
    });

    test('short-form hex #f0c expanded to #ff00cc', () => {
      barvaImport.setLevel(3);
      expect(barvaImport.hex('#f0c')`x`).toMatch(startCode('38;2;255;0;204'));
    });

    test('bgHex supported', () => {
      barvaImport.setLevel(3);
      expect(barvaImport.bgHex('#112233')`x`).toMatch(
        startCode('48;2;17;34;51'),
      );
    });

    test('rgb clamps components to 0-255', () => {
      barvaImport.setLevel(3);
      expect(barvaImport.rgb(-10, 999, 128)`x`).toMatch(
        startCode('38;2;0;255;128'),
      );
    });

    test('invalid hex throws TypeError', () => {
      expect(() => barvaImport.hex('notahex')).toThrow(TypeError);
      expect(() => barvaImport.hex('#ggg')).toThrow(TypeError);
      expect(() => barvaImport.hex('#12')).toThrow(TypeError);
      expect(() =>
        (barvaImport.hex as unknown as (h: unknown) => void)(123),
      ).toThrow(TypeError);
    });

    test('chainable: red.rgb(...).bgHex(...)', () => {
      barvaImport.setLevel(3);
      const out = barvaImport.bold.rgb(255, 0, 0).bgHex('#00ff00')`X`;
      expect(out).toMatch(
        startCode('1;38;2;255;0;0;48;2;0;255;0'),
      );
    });

    test('chainable: bold.bgRgb(...)', () => {
      barvaImport.setLevel(3);
      const out = barvaImport.bold.bgRgb(10, 20, 30)`X`;
      expect(out).toMatch(startCode('1;48;2;10;20;30'));
    });

    test('chainable: bold.hex(...)', () => {
      barvaImport.setLevel(3);
      const out = barvaImport.bold.hex('#010203')`X`;
      expect(out).toMatch(startCode('1;38;2;1;2;3'));
    });

    test('chainable: bold.bgAnsi256(...)', () => {
      barvaImport.setLevel(2);
      const out = barvaImport.bold.bgAnsi256(17)`X`;
      expect(out).toMatch(startCode('1;48;5;17'));
    });

    test('chaining two truecolor segments of same bg produces stable order', () => {
      barvaImport.setLevel(3);
      const a = barvaImport.rgb(1, 2, 3).rgb(4, 5, 6)`X`;
      const b = barvaImport.rgb(4, 5, 6).rgb(1, 2, 3)`X`;
      expect(a).toBe(b);
    });
  });

  describe('Color downgrade by level', () => {
    test('rgb downgrades to ansi256 at level 2', () => {
      barvaImport.setLevel(2);
      const out = barvaImport.rgb(255, 0, 0)`r`;
      expect(out).toMatch(startCode('38;5;196'));
      expect(out).not.toContain(';2;255;0;0');
    });

    test('rgb downgrades to basic fg at level 1', () => {
      barvaImport.setLevel(1);
      const out = barvaImport.rgb(255, 0, 0)`r`;
      expect(out).toMatch(startCode('91'));
    });

    test('rgb emits nothing at level 0', () => {
      barvaImport.setLevel(0);
      expect(barvaImport.rgb(255, 0, 0)`r`).toBe('r');
    });

    test('ansi256 downgrades to basic fg at level 1', () => {
      barvaImport.setLevel(1);
      const out = barvaImport.ansi256(196)`r`;
      expect(out).toMatch(new RegExp(`${ESC}\\[\\d+m`));
      expect(out).not.toContain('38;5;');
    });

    test('bgRgb downgrades to basic bg at level 1', () => {
      barvaImport.setLevel(1);
      const out = barvaImport.bgRgb(0, 0, 255)`b`;
      expect(out).toMatch(startCode('104'));
    });

    test('gray rgb maps to grayscale ramp at level 2', () => {
      barvaImport.setLevel(2);
      const out = barvaImport.rgb(128, 128, 128)`g`;
      expect(out).toMatch(startCode('38;5;244'));
    });

    test('ansi256 grayscale index downgrades to basic at level 1', () => {
      barvaImport.setLevel(1);
      const out = barvaImport.ansi256(250)`g`;
      expect(out).toMatch(new RegExp(`${ESC}\\[\\d+m`));
      expect(out).not.toContain('38;5;');
    });

    test('ansi256 cube-color index downgrades to basic at level 1', () => {
      barvaImport.setLevel(1);
      const out = barvaImport.ansi256(196)`r`;
      expect(out).toMatch(startCode('91'));
    });

    test('near-black rgb uses grayscale start', () => {
      barvaImport.setLevel(2);
      const out = barvaImport.rgb(2, 2, 2)`b`;
      expect(out).toMatch(startCode('38;5;16'));
    });

    test('near-white rgb uses grayscale end', () => {
      barvaImport.setLevel(2);
      const out = barvaImport.rgb(250, 250, 250)`w`;
      expect(out).toMatch(startCode('38;5;231'));
    });
  });

  describe('reset colorizer', () => {
    test('emits bare reset sequence', () => {
      const out = barvaImport.reset`x`;
      expect(out).toMatch(new RegExp(`^${ESC}\\[0m`));
      expect(out).toContain('x');
      expect(out).toMatch(resetCode);
    });
  });

  describe('strip / stripAnsi / ansiRegex', () => {
    test('strip removes ANSI codes', () => {
      const colored = barvaImport.red.bold`Hi ${barvaImport.blue`there`}!`;
      const plain = barvaImport.strip(colored);
      expect(plain).toBe('Hi there!');
    });

    test('stripAnsi is alias for strip', () => {
      expect(barvaImport.stripAnsi).toBe(barvaImport.strip);
    });

    test('strip on non-string returns String(input)', () => {
      expect(
        barvaImport.strip(42 as unknown as string),
      ).toBe('42');
    });

    test('ansiRegex returns a fresh global regex each call', () => {
      const a = barvaImport.ansiRegex();
      const b = barvaImport.ansiRegex();
      expect(a).not.toBe(b);
      expect(a.flags).toContain('g');
    });

    test('ansiRegex matches truecolor sequences', () => {
      barvaImport.setLevel(3);
      const colored = barvaImport.rgb(1, 2, 3)`x`;
      expect(colored.replace(barvaImport.ansiRegex(), '')).toBe('x');
    });
  });

  describe('Specific exports', () => {
    test('exports every declared modifier', () => {
      const modifiers = [
        'bold',
        'dim',
        'italic',
        'underline',
        'blink',
        'inverse',
        'hidden',
        'strikethrough',
        'doubleUnderline',
        'framed',
        'encircled',
        'overline',
        'superscript',
        'subscript',
      ] as const;
      for (const m of modifiers) {
        expect(typeof barvaImport[m]).toBe('function');
      }
    });

    test('exports every foreground color', () => {
      const fg = [
        'black',
        'red',
        'green',
        'yellow',
        'blue',
        'magenta',
        'cyan',
        'white',
        'grey',
        'gray',
      ] as const;
      for (const c of fg) expect(typeof barvaImport[c]).toBe('function');
    });

    test('exports every bright foreground', () => {
      const fg = [
        'blackBright',
        'redBright',
        'greenBright',
        'yellowBright',
        'blueBright',
        'magentaBright',
        'cyanBright',
        'whiteBright',
        'greyBright',
        'grayBright',
      ] as const;
      for (const c of fg) expect(typeof barvaImport[c]).toBe('function');
    });

    test('exports every background color', () => {
      const bg = [
        'bgBlack',
        'bgRed',
        'bgGreen',
        'bgYellow',
        'bgBlue',
        'bgMagenta',
        'bgCyan',
        'bgWhite',
        'bgGrey',
        'bgGray',
      ] as const;
      for (const c of bg) expect(typeof barvaImport[c]).toBe('function');
    });

    test('exports every bright background', () => {
      const bg = [
        'bgBlackBright',
        'bgRedBright',
        'bgGreenBright',
        'bgYellowBright',
        'bgBlueBright',
        'bgMagentaBright',
        'bgCyanBright',
        'bgWhiteBright',
        'bgGreyBright',
        'bgGrayBright',
      ] as const;
      for (const c of bg) expect(typeof barvaImport[c]).toBe('function');
    });
  });

  describe('Default export namespace', () => {
    test('default and named barva exports share the same object', () => {
      expect(barva).toBe(defaultExport);
    });

    test('includes every base colorizer and utility', () => {
      expect(typeof defaultExport.red).toBe('function');
      expect(typeof defaultExport.bold).toBe('function');
      expect(typeof defaultExport.rgb).toBe('function');
      expect(typeof defaultExport.bgRgb).toBe('function');
      expect(typeof defaultExport.hex).toBe('function');
      expect(typeof defaultExport.bgHex).toBe('function');
      expect(typeof defaultExport.ansi256).toBe('function');
      expect(typeof defaultExport.bgAnsi256).toBe('function');
      expect(typeof defaultExport.reset).toBe('function');
      expect(typeof defaultExport.strip).toBe('function');
      expect(typeof defaultExport.stripAnsi).toBe('function');
      expect(typeof defaultExport.ansiRegex).toBe('function');
      expect(typeof defaultExport.setEnabled).toBe('function');
      expect(typeof defaultExport.setDisabled).toBe('function');
      expect(typeof defaultExport.setLevel).toBe('function');
      expect(typeof defaultExport.getLevel).toBe('function');
      expect(typeof defaultExport.isEnabled).toBe('function');
      expect(typeof defaultExport.isColorSupported).toBe('function');
    });

    test('barva.red yields working colorizer', () => {
      expect(barva.red`hi`).toMatch(startCode('31'));
    });
  });

  describe('Edge cases', () => {
    test('empty template yields start + reset', () => {
      expect(barvaImport.red``).toMatch(
        new RegExp(`^${ESC}\\[31m${ESC}\\[0m$`),
      );
    });

    test('null and undefined interpolations stringify', () => {
      expect(barvaImport.green`v: ${null}`).toContain('v: null');
      expect(barvaImport.green`v: ${undefined}`).toContain('v: undefined');
    });

    test('numeric and boolean interpolations', () => {
      expect(barvaImport.yellow`n=${42}`).toContain('n=42');
      expect(barvaImport.magenta`b=${true}`).toContain('b=true');
    });

    test('bigint interpolation', () => {
      expect(barvaImport.cyan`b=${BigInt(5)}`).toContain('b=5');
    });

    test('caches colorizers for perf', () => {
      expect(barvaImport.red.bold).toBe(barvaImport.red.bold);
    });

    test('disabled path concatenates nested colorizer output cleanly', () => {
      barvaImport.setEnabled(false);
      const out = barvaImport.red`A ${barvaImport.blue`B`} C`;
      expect(out).toBe('A B C');
    });

    test('disabled path with bare nested colorizer interpolation', () => {
      barvaImport.setEnabled(false);
      const out = barvaImport.red`X ${barvaImport.blue} Y`;
      expect(out).toBe('X  Y');
    });
  });
});

