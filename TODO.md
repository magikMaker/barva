# TODO

Ideas and features deferred for a future release.

## Browser / non-Node console support

Emit CSS-style `%c` console output when detecting a browser environment, so
that consumers can use barva seamlessly in both Node and the browser.

- Detect browser via `typeof window !== 'undefined'` / absence of
  `process.stdout` at module load.
- For `console.log(red\`hi\`)`, return a string containing `%c` formatters plus
  a parallel array of CSS style strings (e.g. `['%chi%c', 'color:red', '']`).
  Node string consumers should still receive ANSI codes.
- Probably best implemented as a separate entry point (e.g.
  `barva/browser`) so the Node bundle stays tiny.
- Map basic ANSI to CSS equivalents; extend to `rgb`/`hex` trivially; drop
  unsupported modifiers (blink, overline in some browsers) gracefully.
- Keep the tagged-template call signature identical so code written for Node
  works unmodified in the browser.

## Other candidates (not yet planned)

- Visibility helper: a `visible(fn)` wrapper that returns `''` when colors
  are disabled, useful for ASCII art that should degrade cleanly.
- Spinner / cursor helpers (save/restore cursor, clear line). Might belong in
  a sibling package rather than barva itself.
