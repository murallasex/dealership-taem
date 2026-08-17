# Emil Kowalski Design Engineering Skill Summary
Loaded from: C:\Users\thiag\.gemini\config\skills\emil-design-eng\SKILL.md

Core Methodology:
- Interactive press states on buttons/cards (`transform: scale(0.97)`, etc.)
- Custom easing curves (`--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`, `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)`, `--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)`)
- Eliminate `transition: all`, use explicit property transitions (`transform`, `opacity`, `background-color`, `border-color`, `box-shadow`) <= 300ms.
- Entry animations from `scale(0.95)` and `opacity: 0` (never `scale(0)`). Exit animations with exit classes (`.modal-exiting`, `.toast-exiting`) and JS timeouts before DOM removal.
- Touch safety: gate `:hover` rules behind `@media (hover: hover) and (pointer: fine)`.
- Stagger animations (30-50ms) for card grid items and table rows.
- SPA View Transitions: soft crossfade blur (`filter: blur(2px); opacity: 0.4;`) during view swapping.
- Perceived speed: `.spinner` duration 450ms cubic-bezier.
- Require markdown table format for reviews/changes: `| Before | After | Why |`.
