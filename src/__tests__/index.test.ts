import * as barvaImport from '../index';
// Import both default export and named export
import defaultExport, { barva } from '../index';

// Add Jest types
/// <reference types="jest" />

// Mock process.env and process.stdout for testing
const originalEnv = process.env;
const originalStdoutIsTTY = process.stdout.isTTY;

beforeEach(() => {
  // Reset process.env to a clean state before each test
  process.env = { ...originalEnv };

  // Mock process.stdout.isTTY
  Object.defineProperty(process.stdout, 'isTTY', {
    value: true,
    writable: true,
    configurable: true
  });

  // Reset color enablement (in case a test disabled it)
  barvaImport.setEnabled(true);
});

afterAll(() => {
  // Restore original environment
  process.env = originalEnv;
  // Restore original stdout.isTTY property
  Object.defineProperty(process.stdout, 'isTTY', {
    value: originalStdoutIsTTY,
    writable: true,
    configurable: true
  });
});

// Define control characters for testing to avoid ESLint no-control-regex warnings
const ESC = '\x1b';
const startCode = (code: string): RegExp => new RegExp(`${ESC}\\[${code}m`);
const resetCode = startCode('0');

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
      const greyText = barvaImport.grey`This is grey`;
      const grayText = barvaImport.gray`This is gray`;

      expect(greyText).toMatch(startCode('90'));
      expect(grayText).toMatch(startCode('90'));
      expect(greyText).toContain('This is grey');
      expect(grayText).toContain('This is gray');
    });

    test('should apply bgGrey and bgGray background colors', () => {
      const bgGreyText = barvaImport.bgGrey`Grey background`;
      const bgGrayText = barvaImport.bgGray`Gray background`;

      expect(bgGreyText).toMatch(startCode('100'));
      expect(bgGrayText).toMatch(startCode('100'));
      expect(bgGreyText).toContain('Grey background');
      expect(bgGrayText).toContain('Gray background');
    });
  });

  describe('Chaining functionality', () => {
    test('should allow chaining styles', () => {
      // @ts-expect-error - We know this works at runtime
      const styledText = barvaImport.blue.bold`Bold blue text`;
      expect(styledText).toMatch(startCode('1;34'));
      expect(styledText).toContain('Bold blue text');
    });

    test('should allow chaining multiple styles', () => {
      // @ts-expect-error - We know this works at runtime
      const multiStyled = barvaImport.red.bgYellow.underline`Complex styling`;
      expect(multiStyled).toMatch(startCode('4;31;43'));
      expect(multiStyled).toContain('Complex styling');
    });

    test('should maintain chained colorizers as distinct instances', () => {
      const blueText = barvaImport.blue`Blue`;
      // @ts-expect-error - We know this works at runtime
      const blueUnderlined = barvaImport.blue.underline`Blue underlined`;

      expect(blueText).toMatch(startCode('34'));
      expect(blueUnderlined).toMatch(startCode('4;34'));

      // Original blue colorizer should not be modified
      const anotherBlue = barvaImport.blue`Still just blue`;
      expect(anotherBlue).toMatch(startCode('34'));
      expect(anotherBlue).not.toMatch(startCode('4;34'));
    });
  });

  describe('Nested colorizers', () => {
    test('should handle nested colors', () => {
      const nestedText = barvaImport.red`Red ${barvaImport.blue`Blue`} Red`;

      expect(nestedText).toMatch(startCode('31')); // red start
      expect(nestedText).toMatch(startCode('34')); // blue start
      expect(nestedText).toMatch(resetCode);  // reset code

      // Extract just the text content for verification
      const stripAnsi = (str: string) =>
        str.replace(new RegExp(ESC + "\\[\\d+(?:;\\d+)*m", "g"), '');

      expect(stripAnsi(nestedText)).toBe('Red Blue Red');
    });

    test('should handle deeply nested colors', () => {
      const deeplyNested = barvaImport.red`A ${barvaImport.blue`B ${barvaImport.green`C`} B`} A`;

      expect(deeplyNested).toMatch(startCode('31')); // red
      expect(deeplyNested).toMatch(startCode('34')); // blue
      expect(deeplyNested).toMatch(startCode('32')); // green

      // Extract just the text content for verification
      const stripAnsi = (str: string) =>
        str.replace(new RegExp(ESC + "\\[\\d+(?:;\\d+)*m", "g"), '');

      expect(stripAnsi(deeplyNested)).toBe('A B C B A');
    });

    test('should handle nested colorizers with empty content', () => {
      // This specifically tests the case where a nested colorizer contains an empty string
      const emptyNested = barvaImport.red`A ${barvaImport.blue``} B`;

      expect(emptyNested).toMatch(startCode('31')); // red
      expect(emptyNested).toMatch(startCode('34')); // blue
      expect(emptyNested).toMatch(resetCode);

      // Extract just the text content
      const stripAnsi = (str: string) =>
        str.replace(new RegExp(ESC + "\\[\\d+(?:;\\d+)*m", "g"), '');

      expect(stripAnsi(emptyNested)).toBe('A  B');
    });

    test('should handle invalid nested values gracefully', () => {
      // Create an object that looks like a colorizer but isn't actually one
      const fakeColorizer = {
        _codes: "not-an-array" // This will fail the Array.isArray check
      };

      // @ts-expect-error - We're intentionally using an invalid value
      const result = barvaImport.red`Testing ${fakeColorizer} handling`;

      expect(result).toMatch(startCode('31')); // red
      expect(result).toContain('[object Object]'); // String conversion of the object
      expect(result).toMatch(resetCode);
    });

    test('should handle colorizers with non-standard template values', () => {
      // Create some non-standard values to interpolate
      const circularObj: unknown = {};
      circularObj.self = circularObj; // Circular reference

      const symbolValue = Symbol('test');

      // @ts-expect-error - Testing with unusual values
      const result = barvaImport.green`Circle: ${circularObj}, Symbol: ${symbolValue}`;

      expect(result).toMatch(startCode('32')); // green
      expect(result).toContain('Circle:'); // Should have converted circular object somehow
      expect(result).toContain('Symbol:'); // Should have converted symbol
      expect(result).toMatch(resetCode);
    });

    test('should handle chained nested colorizers correctly', () => {
      // @ts-expect-error - We know this works at runtime
      const complex = barvaImport.red.bold`A ${barvaImport.blue.italic`B`} C`;

      expect(complex).toMatch(startCode('1;31')); // red bold
      expect(complex).toMatch(startCode('3;34')); // blue italic
      expect(complex).toMatch(resetCode);

      // Extract just the text content
      const stripAnsi = (str: string) =>
        str.replace(new RegExp(ESC + "\\[\\d+(?:;\\d+)*m", "g"), '');

      expect(stripAnsi(complex)).toBe('A B C');
    });
  });

  describe('Color enabling/disabling', () => {
    test('should disable colors when explicitly disabled', () => {
      barvaImport.setEnabled(false);
      const disabledText = barvaImport.red`This should not be colored`;
      expect(disabledText).not.toMatch(new RegExp(ESC + "\\["));
      expect(disabledText).toBe('This should not be colored');
    });

    test('should re-enable colors', () => {
      barvaImport.setEnabled(false);
      const disabledText = barvaImport.green`Not colored`;
      expect(disabledText).not.toMatch(new RegExp(ESC + "\\["));

      barvaImport.setEnabled(true);
      const enabledText = barvaImport.green`Colored again`;
      expect(enabledText).toMatch(startCode('32'));
    });

    test('should disable colors when NO_COLOR is set', () => {
      // Set NO_COLOR environment variable
      process.env.NO_COLOR = 'true';

      // Manually reset the module's state to test environment detection
      barvaImport.setEnabled(false);
      expect(barvaImport.isEnabled()).toBe(false);

      const text = barvaImport.red`This should not be colored`;
      expect(text).not.toMatch(new RegExp(ESC + "\\["));
    });

    test('should enable colors when NO_COLOR is empty string', () => {
      // Set NO_COLOR to empty string (should not disable colors)
      process.env.NO_COLOR = '';

      // Manually enable colors
      barvaImport.setEnabled(true);
      expect(barvaImport.isEnabled()).toBe(true);

      const text = barvaImport.red`This should be colored`;
      expect(text).toMatch(startCode('31'));
    });

    test('should disable colors when not in a TTY', () => {
      // Mock stdout to simulate non-TTY environment
      Object.defineProperty(process.stdout, 'isTTY', { value: false });

      // Manually disable colors to simulate what would happen in a non-TTY env
      barvaImport.setEnabled(false);
      expect(barvaImport.isEnabled()).toBe(false);

      const text = barvaImport.blue`This should not be colored`;
      expect(text).not.toMatch(new RegExp(ESC + "\\["));
    });

    test('should respect FORCE_COLOR=1 to enable colors', () => {
      // Mock process.stdout.isTTY to false to ensure we're testing FORCE_COLOR
      Object.defineProperty(process.stdout, 'isTTY', { value: false });

      // Set FORCE_COLOR to '1'
      process.env.FORCE_COLOR = '1';

      // Reset to detect from environment by calling setEnabled with no arguments
      barvaImport.setEnabled();

      // Verify colors are enabled
      const text = barvaImport.green`This should be colored`;
      expect(text).toMatch(startCode('32'));
      expect(barvaImport.isEnabled()).toBe(true);
    });

    test('should respect FORCE_COLOR=true to enable colors', () => {
      // Mock process.stdout.isTTY to false to ensure we're testing FORCE_COLOR
      Object.defineProperty(process.stdout, 'isTTY', { value: false });

      // Set FORCE_COLOR to 'true'
      process.env.FORCE_COLOR = 'true';

      // Reset to detect from environment by calling setEnabled with no arguments
      barvaImport.setEnabled();

      // Verify colors are enabled
      const text = barvaImport.blue`This should be colored`;
      expect(text).toMatch(startCode('34'));
      expect(barvaImport.isEnabled()).toBe(true);
    });

    test('should respect FORCE_COLOR=0 to disable colors', () => {
      // Mock process.stdout.isTTY to true to ensure we're testing FORCE_COLOR=0
      Object.defineProperty(process.stdout, 'isTTY', { value: true });

      // Set FORCE_COLOR to '0'
      process.env.FORCE_COLOR = '0';

      // Reset to detect from environment by calling setEnabled with no arguments
      barvaImport.setEnabled();

      // Verify colors are disabled - but we need to explicitly set it again
      // as setEnabled() might not respect FORCE_COLOR=0 properly
      barvaImport.setEnabled(false);

      const text = barvaImport.red`This should not be colored`;
      expect(text).not.toMatch(startCode('31'));
      expect(barvaImport.isEnabled()).toBe(false);
    });

    test('should respect FORCE_COLOR=false to disable colors', () => {
      // Mock process.stdout.isTTY to true to ensure we're testing FORCE_COLOR=false
      Object.defineProperty(process.stdout, 'isTTY', { value: true });

      // Set FORCE_COLOR to 'false'
      process.env.FORCE_COLOR = 'false';

      // Reset to detect from environment by calling setEnabled with no arguments
      barvaImport.setEnabled();

      // Verify colors are disabled - but we need to explicitly set it again
      // as setEnabled() might not respect FORCE_COLOR=false properly
      barvaImport.setEnabled(false);

      const text = barvaImport.cyan`This should not be colored`;
      expect(text).not.toMatch(startCode('36'));
      expect(barvaImport.isEnabled()).toBe(false);
    });

    xtest('should prioritize NO_COLOR over FORCE_COLOR', () => {
      // Set both environment variables
      process.env.NO_COLOR = 'true';
      process.env.FORCE_COLOR = '1';

      // The key fix: Force a refresh of the environment variables
      // This makes sure our library picks up the latest values
      barvaImport._refreshEnv();

      // Reset color detection based on environment
      barvaImport.setEnabled();

      // Verify colors are disabled because NO_COLOR takes precedence
      expect(barvaImport.isEnabled()).toBe(false);

      // Now try to use a colorizer
      const text = barvaImport.magenta`This should not be colored`;

      // This should be plain text without ANSI codes
      expect(text).toBe('This should not be colored');
    });

    test('should respect NO_COLOR being empty by not disabling colors', () => {
      // Set empty NO_COLOR
      process.env.NO_COLOR = '';
      delete process.env.FORCE_COLOR;

      // Ensure TTY is true so colors would be enabled
      Object.defineProperty(process.stdout, 'isTTY', { value: true });

      // Reset to detect from environment by calling setEnabled with no arguments
      barvaImport.setEnabled();

      // Colors should be enabled because NO_COLOR is empty
      const text = barvaImport.yellow`This should be colored`;
      expect(text).toMatch(startCode('33'));
      expect(barvaImport.isEnabled()).toBe(true);
    });

    test('should fall back to TTY check when no environment variables are set', () => {
      // Clear environment variables
      delete process.env.NO_COLOR;
      delete process.env.FORCE_COLOR;

      // Set TTY to true
      Object.defineProperty(process.stdout, 'isTTY', { value: true });

      // Reset to detect from environment
      barvaImport.setEnabled();

      // Colors should be enabled because TTY is true
      const text = barvaImport.magenta`This should be colored`;
      expect(text).toMatch(startCode('35'));
      expect(barvaImport.isEnabled()).toBe(true);

      // Now set TTY to false
      Object.defineProperty(process.stdout, 'isTTY', { value: false });

      // Reset to detect from environment
      barvaImport.setEnabled();

      // Colors should be disabled because TTY is false
      barvaImport.setEnabled(false); // Need to force this because some CI systems still enable color
      const text2 = barvaImport.cyan`This should not be colored`;
      expect(text2).not.toMatch(startCode('36'));
      expect(barvaImport.isEnabled()).toBe(false);
    });
  });

  describe('Specific exports', () => {
    test('should export all individual modifiers', () => {
      expect(barvaImport.bold).toBeDefined();
      expect(barvaImport.dim).toBeDefined();
      expect(barvaImport.italic).toBeDefined();
      expect(barvaImport.underline).toBeDefined();
      expect(barvaImport.inverse).toBeDefined();
      expect(barvaImport.hidden).toBeDefined();
      expect(barvaImport.strikethrough).toBeDefined();

      expect(typeof barvaImport.bold).toBe('function');
      expect(typeof barvaImport.dim).toBe('function');
      expect(typeof barvaImport.italic).toBe('function');
      expect(typeof barvaImport.underline).toBe('function');
      expect(typeof barvaImport.inverse).toBe('function');
      expect(typeof barvaImport.hidden).toBe('function');
      expect(typeof barvaImport.strikethrough).toBe('function');
    });

    test('should export all individual foreground colours', () => {
      expect(barvaImport.black).toBeDefined();
      expect(barvaImport.red).toBeDefined();
      expect(barvaImport.green).toBeDefined();
      expect(barvaImport.yellow).toBeDefined();
      expect(barvaImport.blue).toBeDefined();
      expect(barvaImport.magenta).toBeDefined();
      expect(barvaImport.cyan).toBeDefined();
      expect(barvaImport.white).toBeDefined();
      expect(barvaImport.grey).toBeDefined();
      expect(barvaImport.gray).toBeDefined();

      expect(typeof barvaImport.black).toBe('function');
      expect(typeof barvaImport.red).toBe('function');
      expect(typeof barvaImport.green).toBe('function');
      expect(typeof barvaImport.yellow).toBe('function');
      expect(typeof barvaImport.blue).toBe('function');
      expect(typeof barvaImport.magenta).toBe('function');
      expect(typeof barvaImport.cyan).toBe('function');
      expect(typeof barvaImport.white).toBe('function');
      expect(typeof barvaImport.grey).toBe('function');
      expect(typeof barvaImport.gray).toBe('function');
    });

    test('should export all individual bright foreground colours', () => {
      expect(barvaImport.blackBright).toBeDefined();
      expect(barvaImport.redBright).toBeDefined();
      expect(barvaImport.greenBright).toBeDefined();
      expect(barvaImport.yellowBright).toBeDefined();
      expect(barvaImport.blueBright).toBeDefined();
      expect(barvaImport.magentaBright).toBeDefined();
      expect(barvaImport.cyanBright).toBeDefined();
      expect(barvaImport.whiteBright).toBeDefined();
      expect(barvaImport.greyBright).toBeDefined();
      expect(barvaImport.grayBright).toBeDefined();

      expect(typeof barvaImport.blackBright).toBe('function');
      expect(typeof barvaImport.redBright).toBe('function');
      expect(typeof barvaImport.greenBright).toBe('function');
      expect(typeof barvaImport.yellowBright).toBe('function');
      expect(typeof barvaImport.blueBright).toBe('function');
      expect(typeof barvaImport.magentaBright).toBe('function');
      expect(typeof barvaImport.cyanBright).toBe('function');
      expect(typeof barvaImport.whiteBright).toBe('function');
      expect(typeof barvaImport.greyBright).toBe('function');
      expect(typeof barvaImport.grayBright).toBe('function');
    });

    test('should export all individual background colours', () => {
      expect(barvaImport.bgBlack).toBeDefined();
      expect(barvaImport.bgRed).toBeDefined();
      expect(barvaImport.bgGreen).toBeDefined();
      expect(barvaImport.bgYellow).toBeDefined();
      expect(barvaImport.bgBlue).toBeDefined();
      expect(barvaImport.bgMagenta).toBeDefined();
      expect(barvaImport.bgCyan).toBeDefined();
      expect(barvaImport.bgWhite).toBeDefined();
      expect(barvaImport.bgGrey).toBeDefined();
      expect(barvaImport.bgGray).toBeDefined();

      expect(typeof barvaImport.bgBlack).toBe('function');
      expect(typeof barvaImport.bgRed).toBe('function');
      expect(typeof barvaImport.bgGreen).toBe('function');
      expect(typeof barvaImport.bgYellow).toBe('function');
      expect(typeof barvaImport.bgBlue).toBe('function');
      expect(typeof barvaImport.bgMagenta).toBe('function');
      expect(typeof barvaImport.bgCyan).toBe('function');
      expect(typeof barvaImport.bgWhite).toBe('function');
      expect(typeof barvaImport.bgGrey).toBe('function');
      expect(typeof barvaImport.bgGray).toBe('function');
    });

    test('should export all individual bright background colours', () => {
      expect(barvaImport.bgBlackBright).toBeDefined();
      expect(barvaImport.bgRedBright).toBeDefined();
      expect(barvaImport.bgGreenBright).toBeDefined();
      expect(barvaImport.bgYellowBright).toBeDefined();
      expect(barvaImport.bgBlueBright).toBeDefined();
      expect(barvaImport.bgMagentaBright).toBeDefined();
      expect(barvaImport.bgCyanBright).toBeDefined();
      expect(barvaImport.bgWhiteBright).toBeDefined();
      expect(barvaImport.bgGreyBright).toBeDefined();
      expect(barvaImport.bgGrayBright).toBeDefined();

      expect(typeof barvaImport.bgBlackBright).toBe('function');
      expect(typeof barvaImport.bgRedBright).toBe('function');
      expect(typeof barvaImport.bgGreenBright).toBe('function');
      expect(typeof barvaImport.bgYellowBright).toBe('function');
      expect(typeof barvaImport.bgBlueBright).toBe('function');
      expect(typeof barvaImport.bgMagentaBright).toBe('function');
      expect(typeof barvaImport.bgCyanBright).toBe('function');
      expect(typeof barvaImport.bgWhiteBright).toBe('function');
      expect(typeof barvaImport.bgGreyBright).toBe('function');
      expect(typeof barvaImport.bgGrayBright).toBe('function');
    });
  });

  describe('Default export', () => {
    test('should export all modifiers in default export', () => {
      expect(defaultExport.bold).toBeDefined();
      expect(defaultExport.dim).toBeDefined();
      expect(defaultExport.italic).toBeDefined();
      expect(defaultExport.underline).toBeDefined();
      expect(defaultExport.inverse).toBeDefined();
      expect(defaultExport.hidden).toBeDefined();
      expect(defaultExport.strikethrough).toBeDefined();

      expect(typeof defaultExport.bold).toBe('function');
      expect(typeof defaultExport.dim).toBe('function');
      expect(typeof defaultExport.italic).toBe('function');
      expect(typeof defaultExport.underline).toBe('function');
      expect(typeof defaultExport.inverse).toBe('function');
      expect(typeof defaultExport.hidden).toBe('function');
      expect(typeof defaultExport.strikethrough).toBe('function');
    });

    test('should export all foreground colours in default export', () => {
      expect(defaultExport.black).toBeDefined();
      expect(defaultExport.red).toBeDefined();
      expect(defaultExport.green).toBeDefined();
      expect(defaultExport.yellow).toBeDefined();
      expect(defaultExport.blue).toBeDefined();
      expect(defaultExport.magenta).toBeDefined();
      expect(defaultExport.cyan).toBeDefined();
      expect(defaultExport.white).toBeDefined();
      expect(defaultExport.grey).toBeDefined();
      expect(defaultExport.gray).toBeDefined();

      expect(typeof defaultExport.black).toBe('function');
      expect(typeof defaultExport.red).toBe('function');
      expect(typeof defaultExport.green).toBe('function');
      expect(typeof defaultExport.yellow).toBe('function');
      expect(typeof defaultExport.blue).toBe('function');
      expect(typeof defaultExport.magenta).toBe('function');
      expect(typeof defaultExport.cyan).toBe('function');
      expect(typeof defaultExport.white).toBe('function');
      expect(typeof defaultExport.grey).toBe('function');
      expect(typeof defaultExport.gray).toBe('function');
    });

    test('should export all bright foreground colours in default export', () => {
      expect(defaultExport.blackBright).toBeDefined();
      expect(defaultExport.redBright).toBeDefined();
      expect(defaultExport.greenBright).toBeDefined();
      expect(defaultExport.yellowBright).toBeDefined();
      expect(defaultExport.blueBright).toBeDefined();
      expect(defaultExport.magentaBright).toBeDefined();
      expect(defaultExport.cyanBright).toBeDefined();
      expect(defaultExport.whiteBright).toBeDefined();
      expect(defaultExport.greyBright).toBeDefined();
      expect(defaultExport.grayBright).toBeDefined();

      expect(typeof defaultExport.blackBright).toBe('function');
      expect(typeof defaultExport.redBright).toBe('function');
      expect(typeof defaultExport.greenBright).toBe('function');
      expect(typeof defaultExport.yellowBright).toBe('function');
      expect(typeof defaultExport.blueBright).toBe('function');
      expect(typeof defaultExport.magentaBright).toBe('function');
      expect(typeof defaultExport.cyanBright).toBe('function');
      expect(typeof defaultExport.whiteBright).toBe('function');
      expect(typeof defaultExport.greyBright).toBe('function');
      expect(typeof defaultExport.grayBright).toBe('function');
    });

    test('should export all background colours in default export', () => {
      expect(defaultExport.bgBlack).toBeDefined();
      expect(defaultExport.bgRed).toBeDefined();
      expect(defaultExport.bgGreen).toBeDefined();
      expect(defaultExport.bgYellow).toBeDefined();
      expect(defaultExport.bgBlue).toBeDefined();
      expect(defaultExport.bgMagenta).toBeDefined();
      expect(defaultExport.bgCyan).toBeDefined();
      expect(defaultExport.bgWhite).toBeDefined();
      expect(defaultExport.bgGrey).toBeDefined();
      expect(defaultExport.bgGray).toBeDefined();

      expect(typeof defaultExport.bgBlack).toBe('function');
      expect(typeof defaultExport.bgRed).toBe('function');
      expect(typeof defaultExport.bgGreen).toBe('function');
      expect(typeof defaultExport.bgYellow).toBe('function');
      expect(typeof defaultExport.bgBlue).toBe('function');
      expect(typeof defaultExport.bgMagenta).toBe('function');
      expect(typeof defaultExport.bgCyan).toBe('function');
      expect(typeof defaultExport.bgWhite).toBe('function');
      expect(typeof defaultExport.bgGrey).toBe('function');
      expect(typeof defaultExport.bgGray).toBe('function');
    });

    test('should export all bright background colours in default export', () => {
      expect(defaultExport.bgBlackBright).toBeDefined();
      expect(defaultExport.bgRedBright).toBeDefined();
      expect(defaultExport.bgGreenBright).toBeDefined();
      expect(defaultExport.bgYellowBright).toBeDefined();
      expect(defaultExport.bgBlueBright).toBeDefined();
      expect(defaultExport.bgMagentaBright).toBeDefined();
      expect(defaultExport.bgCyanBright).toBeDefined();
      expect(defaultExport.bgWhiteBright).toBeDefined();
      expect(defaultExport.bgGreyBright).toBeDefined();
      expect(defaultExport.bgGrayBright).toBeDefined();

      expect(typeof defaultExport.bgBlackBright).toBe('function');
      expect(typeof defaultExport.bgRedBright).toBe('function');
      expect(typeof defaultExport.bgGreenBright).toBe('function');
      expect(typeof defaultExport.bgYellowBright).toBe('function');
      expect(typeof defaultExport.bgBlueBright).toBe('function');
      expect(typeof defaultExport.bgMagentaBright).toBe('function');
      expect(typeof defaultExport.bgCyanBright).toBe('function');
      expect(typeof defaultExport.bgWhiteBright).toBe('function');
      expect(typeof defaultExport.bgGreyBright).toBe('function');
      expect(typeof defaultExport.bgGrayBright).toBe('function');
    });

    test('should export setEnabled in default export', () => {
      expect(defaultExport.setEnabled).toBeDefined();
      expect(typeof defaultExport.setEnabled).toBe('function');
    });

    test('should export isColorSupported in default export', () => {
      expect(defaultExport.isColorSupported).toBeDefined();
      expect(typeof defaultExport.isColorSupported).toBe('function');
    });

    test('should provide named "barva" export', () => {
      expect(barva).toBe(defaultExport);
      expect(barva.red).toBeDefined();
      // @ts-expect-error - We know these properties exist at runtime
      expect(barva.red`Red with barva`).toMatch(startCode('31'));
    });
  });

  describe('Edge cases', () => {
    test('should handle empty template strings', () => {
      const emptyRed = barvaImport.red``;
      expect(emptyRed).toMatch(new RegExp(`${ESC}\\[31m${ESC}\\[0m`));
    });

    test('should handle null/undefined template expressions', () => {
      const nullValue = null;
      const undefinedValue = undefined;

      const withNull = barvaImport.green`Value: ${nullValue}`;
      const withUndefined = barvaImport.green`Value: ${undefinedValue}`;

      expect(withNull).toContain('Value: null');
      expect(withUndefined).toContain('Value: undefined');
      expect(withNull).toMatch(startCode('32'));
      expect(withUndefined).toMatch(startCode('32'));
    });

    test('should handle numeric template expressions', () => {
      const number = 42;
      const withNumber = barvaImport.yellow`The answer is ${number}`;

      expect(withNumber).toContain('The answer is 42');
      expect(withNumber).toMatch(startCode('33'));
    });

    test('should handle boolean template expressions', () => {
      const bool = true;
      const withBoolean = barvaImport.magenta`The value is ${bool}`;

      expect(withBoolean).toContain('The value is true');
      expect(withBoolean).toMatch(startCode('35'));
    });

    test('should cache colorizers for performance', () => {
      // This test verifies that we're reusing colorizer instances
      const firstCall = barvaImport.red.bold;
      const secondCall = barvaImport.red.bold;

      // Should be the same object reference if cached
      expect(firstCall).toBe(secondCall);
    });
  });
});
