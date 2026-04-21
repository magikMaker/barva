# Changelog
Document all changes to this project below using the following headings:

- Added
  for new features.
- Changed
  for changes in existing functionality.
- Deprecated
  for soon-to-be removed features.
- Fixed
  for any bug fixes.
- Removed
  for now removed features.
- Security
  in case of vulnerabilities.

The format is based on [Keep a Changelog](https://keepachangelog.com/)
and this project adheres to [Semantic Versioning](https://semver.org/).

Make sure to add a link to the Pull Request and/or issue number (if applicable)

-------------------------------------------------------------------------------

<a name="unreleased"></a>
## [Unreleased]

-------------------------------------------------------------------------------

<a name="1.3.1"></a>
## [1.3.1] - 2026-04-21

### Added
- Exported `ColorLevel` constant (`None`, `Basic`, `Ansi256`, `TrueColor`) so
  consumers can write `setLevel(ColorLevel.TrueColor)` instead of
  `setLevel(3)`. Also re-exported on the default namespace so CJS users can
  do `const { ColorLevel } = require('barva')`.

-------------------------------------------------------------------------------

<a name="1.3.0"></a>
## 1.3.0 - 2026-04-21

### Added
- 24-bit truecolor support via `rgb(r, g, b)`, `bgRgb(r, g, b)`, `hex(cssHex)`,
  and `bgHex(cssHex)`.
- 256-color palette support via `ansi256(code)` and `bgAnsi256(code)`.
- Automatic downgrade of truecolor → 256 → basic 16 when the terminal reports
  a lower capability.
- `ColorLevel` type (`0 | 1 | 2 | 3`), plus `getLevel()` and `setLevel()` for
  precise level control.
- Additional SGR modifiers: `blink`, `doubleUnderline`, `framed`, `encircled`,
  `overline`, `superscript`, `subscript`.
- `strip()` (alias `stripAnsi()`) and `ansiRegex()` utilities for removing or
  matching ANSI escape sequences.
- `reset` colorizer exporting a bare SGR reset sequence.
- `BarvaColorizer`, `ModifierName`, `ForegroundName`, `BackgroundName`,
  `BaseName`, `BarvaValue`, and `ColorLevel` exported as public types.
- Comprehensive CI environment detection covering GitHub Actions, Gitea
  Actions, CircleCI (truecolor), plus GitLab CI, Travis, AppVeyor, Buildkite,
  Drone, Codeship, Azure Pipelines, TeamCity, AWS CodeBuild, Bitbucket
  Pipelines, Vercel, Netlify, Semaphore, Cirrus CI, Heroku CI, and Woodpecker
  (basic).
- `TERM=dumb`, `COLORTERM=truecolor|24bit`, `WT_SESSION`, and
  `TERM_PROGRAM=vscode` are now honoured during detection.
- Coverage report configuration: `test:coverage` and `test:watch` scripts,
  HTML + LCOV + JSON coverage reports under `coverage/`, and a 95% coverage
  threshold enforced by jest.
- `pre-commit` script running lint + tests.
- `TODO.md` tracking deferred ideas (browser console `%c` output).

### Changed
- `BarvaColorizer` is fully recursively typed: chained access such as
  `red.bold.underline` is type-safe, removing the need for `@ts-expect-error`
  in downstream code.
- Colorizers are now brand-identified via a unique `Symbol` rather than a
  `_codes` property, preventing plain objects from being mistaken for
  colorizers during interpolation.
- Environment detection is memoised and invalidated by `setEnabled`,
  `setDisabled`, and `setLevel`.
- All listed devDependencies bumped to their latest versions (eslint 10,
  @eslint/js 10, @types/node 25, globals 17, esbuild 0.28, tsup 8.5.1,
  ts-jest 29.4.9, jest 30.3.0, octokit 5.0.5, @octokit/rest 22.0.1,
  yoctocolors 2.1.2, chalk 5.6.2, plus patch bumps).
- README standardises on UK "grey" spelling (keeps `gray` as an alias), fixes
  the "geay" typo, documents the new APIs, CI detection rules, and
  accurately describes non-Node behaviour (colours are off, not "always
  enabled").

### Removed
- The obsolete skipped test that referenced a nonexistent `_refreshEnv`
  helper has been deleted (the helper now exists and is covered directly).
- The dead `name === '_codes'` guard inside the chaining loop.

### Fixed
- Chained colorizer output order is now deterministic regardless of call
  order (modifiers first, then colours), matching expectations.
- `FORCE_COLOR` parsing is documented and unified (numeric values force that
  level; `0`/`false` does not force and falls through to detection;
  `true`/empty string forces level 1).

-------------------------------------------------------------------------------

<a name="1.2.0"></a>
## 1.2.0 - 2025-08-16

### Added
- `setDisabled()` convenience function for disabling colors
- `setDisabled()` without arguments explicitly disables colors

### Changed
- Updated all devDependencies to latest versions:
  - @eslint/js: 9.23.0 → 9.33.0
  - @octokit/rest: 20.0.2 → 22.0.0
  - @types/jest: 29.5.3 → 30.0.0
  - @types/node: 22.13.15 → 24.3.0
  - chalk5: 5.0.0 → 5.5.0
  - esbuild: 0.25.2 → 0.25.9
  - eslint: 9.23.0 → 9.33.0
  - globals: 16.0.0 → 16.3.0
  - jest: 29.6.2 → 30.0.5
  - octokit: 4.1.2 → 5.0.3
  - ts-jest: 29.1.1 → 29.4.1
  - tsup: 7.1.0 → 8.5.0
  - typescript: 5.1.6 → 5.9.2
  - typescript-eslint: 8.29.0 → 8.39.1

### Fixed
- Fixed environment variable detection in `isColorSupported()` to properly refresh `process.env` and TTY status when `setEnabled()` is called without arguments

-------------------------------------------------------------------------------

<a name="1.1.0"></a>
## 1.1.0 - 2025-06-10

-------------------------------------------------------------------------------

<a name="1.0.3"></a>
## 1.0.3  - 2025-04-27

-------------------------------------------------------------------------------

<a name="1.0.2"></a>
## 1.0.2 - 2025-04-27

-------------------------------------------------------------------------------

<a name="1.0.1"></a>
## 1.0.1 - 2025-04-02

-------------------------------------------------------------------------------

<a name="1.0.0"></a>
## 1.0.0 - 2025-04-02

-------------------------------------------------------------------------------
