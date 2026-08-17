# Project: Dealership Management

## Architecture
Vanilla JavaScript web application with clean modular architecture separating concerns (State/Store management, Business Logic/Services, UI Components/Views, and Utilities). Styled with modern CSS adhering to Emil Kowalski's design engineering principles (micro-interactions, custom cubic-bezier easings, smooth layout transitions, responsive feedback).

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Exploration & Architecture Blueprinting | Deep audit of mock data encoding errors, current module dependencies, and UI animation/polish gaps against Emil Kowalski principles | none | DONE |
| 2 | Repair Mock Data Encoding & Module Refactoring | Correct all UTF-8 corruptions in `data/store.js`; refactor monolithic modules into 4-tier vanilla JS architecture (`src/core/`, `src/services/`, `src/ui/`, `src/utils/`) with facade re-exports | M1 | DONE |
| 3 | Apply Emil Kowalski Design Engineering & UI Polish | Implement micro-interactions, button press states (`scale(0.97)`), custom easings, stagger animations, and refined layout flow | M2 | DONE |
| 4 | Verification, Challenger Stress Testing & Forensic Audit | Validate via `test.js`, independent Reviewers, Challengers, and Forensic Integrity Audit | M3 | DONE |

## Code Layout
- `app.js` — Main entry point & SPA bootstrap
- `index.html` — Base HTML layout & shell structure
- `data/store.js` — Mock data store & initial state seeding (UTF-8 clean, facade adapter)
- `src/` — Scalable 4-tier vanilla JS modular architecture:
  - `src/core/` — State store, reactive pub/sub event listeners, router
  - `src/services/` — Pure business logic, financial calculations, filter/sort aggregations
  - `src/ui/` — Modular UI component renderers (Dashboard, Inventory, Sales, Sellers, etc.)
  - `src/utils/` — Formatters, DOM helpers, icon rendering wrappers
- `modules/` — Facade re-export modules preserving 100% compatibility with `test.js`
- `style.css` — Modern design engineering stylesheet with custom easings, spring variables, micro-interaction press/hover rules
- `test.js` — Automated jsdom test suite verifying module loading & DOM rendering
