# Context Summary — Dealership Management

## Project Objective
Fix runtime crashes in Dashboard and Sellers modules and UTF-8 encoding corruption across the codebase.

## Key Constraints
- Pure DISPATCH-ONLY orchestrator mode.
- Verification must use `test.js` with `jsdom`.
- Zero occurrences of `Ã` character in `.html` or `.js` files.

## Workspace Layout
- `app.js`
- `index.html`
- `style.css`
- `test.js`
- `package.json`
- `fix_encoding.cjs`
- `modules/`
- `data/`
- `.agents/`
