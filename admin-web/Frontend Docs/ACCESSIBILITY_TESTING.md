## Accessibility Testing (axe) – Guide and Results

### What this covers
- Component a11y tests with Jest + Testing Library + jest-axe
- E2E a11y smoke with Selenium + axe-core injection
- Interpreting axe rules, common fixes, CI gating, and troubleshooting

### Test stack
- Jest (jsdom) + @testing-library/react + @testing-library/jest-dom
- jest-axe (axe-core in jsdom)
- Selenium WebDriver (Chrome) for E2E + runtime axe-core injection

### Project locations
- Jest config: `admin-web/jest.config.cjs`
- Jest setup: `admin-web/jest.setup-a11y.ts`
- Component a11y tests: `admin-web/tests/a11y/*.a11y.test.tsx`
  - `Login.a11y.test.tsx`
  - `Dashboard.a11y.test.tsx`
  - `Users.a11y.test.tsx`
- E2E a11y smoke: `admin-web/tests/ui/a11y.smoke.spec.ts`

### How to run
1) Component a11y (jsdom)
```bash
cd admin-web
npm install
npm run a11y:test
```

2) E2E a11y smoke (real browser)
```bash
cd admin-web
npm install
npm run e2e
```
Notes:
- E2E will start mock API + dev server + headless Chrome and run tests. The a11y smoke test injects `axe-core` via CDN and fails on serious/critical issues defined in the spec.

### Current results (latest local run)
- Component a11y tests: 3/3 passed
  - `Login`, `Dashboard`, `Users` → jest-axe reported no violations in rendered markup under test conditions (mocked network/auth where applicable)
- E2E a11y smoke: included in suite; ensure the app is running via the `npm run e2e` harness to validate in-browser. The smoke test asserts no serious/critical violations on `Dashboard` after auth token seeding.

### Why these three pages (scope and rationale)
- Login (entry point)
  - First-touch experience: forms, primary CTA button, brand typography and color.
  - Typical a11y risks: missing button names, insufficient focus ring, poor contrast, missing page landmarks, incorrect heading levels.
  - Catchment: validates our baseline tokens/styles and auth entry UX before users proceed further.

- Dashboard (post-auth landing)
  - Landmark, headings, and quick actions; sometimes includes dynamic stats and icons.
  - Typical a11y risks: icon-only buttons without names, color-only meaning, heading hierarchy, card semantics, keyboard tab order.
  - Catchment: represents the common layout shell for most pages; issues here are systemic.

- Users (data management surface)
  - Realistic CRUD surface: searchable list, table semantics, pagination, action buttons, role modal with checkboxes.
  - Typical a11y risks: table header associations, interactive controls inside rows, confirm/delete affordances, modal focus management, checkbox labeling.
  - Catchment: covers the heaviest interaction pattern in the admin portal.

### Test design details per page
- Login.a11y.test.tsx
  - Providers: `MemoryRouter` (no external data providers needed).
  - Mocks: `AuthContext` forced to unauthenticated; `startLogin` mocked to avoid navigation side-effects.
  - Assertions: `axe(container)` must have no violations; ensures the page structure, headings, and primary CTA are accessible under default styles.
  - Would fail if: missing accessible name on the sign-in button, low contrast text, absent document landmarks/headings.

- Dashboard.a11y.test.tsx
  - Providers: `MemoryRouter`, `QueryClientProvider`.
  - Mocks: `api.get` resolves minimal data; `useAuth` returns an ADMIN user to render admin-only widgets.
  - Assertions: `axe(container)` must have no violations; verifies headings, quick actions, and stat cards expose accessible names and roles.
  - Would fail if: icon-only controls lack names, heading levels are skipped, contrast is insufficient, labels/aria missing on interactive areas.

- Users.a11y.test.tsx
  - Providers: `MemoryRouter`, `QueryClientProvider`.
  - Mocks: `api.get` returns empty dataset; `api.patch` resolves; focuses on static semantics rather than data volume.
  - Assertions: `axe(container)` must have no violations; validates table header associations, button names, and input labeling in the search/filter area and role modal scaffolding.
  - Would fail if: table headers are not associated, buttons/links lack accessible names, checkboxes missing labels, modal lacks proper structure.

### What the E2E a11y smoke adds
- Runs axe-core in a real browser session after auth is seeded.
- Catches runtime-only issues not visible in jsdom (computed styles, focus order, CSS-only icon buttons, contrast from finalized Tailwind classes).
- Gating: we treat `color-contrast`, `button-name`, `label`, and keyboard-related rules as serious/critical for smoke.

### Future expansions (recommended)
- Add page coverage: `Profile`, `AuditLog`, and `UserDetail` a11y tests (component level) and include them in smoke as needed.
- Modal focus tests: verify focus trap and return focus to the invoking control.
- Keyboard E2E: tab/arrow navigation across table rows, pagination, and menus via Selenium.
- Theming/contrast matrix: run contrast checks across dark/light themes if introduced.
- Axe rule baselines: store snapshots of known acceptable warnings; fail only on regressions or elevated severities.

### What we assert
- Component tests: `toHaveNoViolations()` on page containers rendered in jsdom
- E2E: inject `axe-core` and run `axe.run` against the document; fail if any violation matches critical rules (e.g., `color-contrast`, `button-name`, `label`, `keyboard` categories)

### Interpreting axe rules
- Severity/impact: minor → moderate → serious → critical
- CI gating (recommended):
  - Block on serious/critical; warn on minor/moderate (report-only)
- Common rule categories to watch:
  - Names/labels: `button-name`, `link-name`, `label`, `image-alt`
  - Structure/roles: `aria-roles`, `aria-required-children`, `aria-props`
  - Keyboard: focus order, trapped focus, `tabindex`, interactive roles
  - Contrast: `color-contrast` per WCAG AA

### Fixing common issues
- Labels for form controls
  - Prefer semantic HTML with `<label htmlFor="...">` and unique `id` on inputs
  - Alternative: `aria-label` or `aria-labelledby` when no visible label
- Button/link names
  - Ensure interactive elements expose accessible names (text content, `aria-label`)
  - Avoid `div`/`span` with click handlers; use `<button>` or `<a>`
- ARIA correctness
  - Prefer native elements before ARIA
  - If using ARIA roles, include required props and valid role values
- Keyboard support
  - All interactive controls must be reachable/operable via keyboard
  - Provide visible focus indicators (Tailwind focus ring utilities)
- Color contrast
  - Use tokens/classes meeting WCAG AA contrast ratios; verify with axe and design tokens

### Extending coverage
- Add a component/page test
  1. Create `admin-web/tests/a11y/<Page>.a11y.test.tsx`
  2. Render the component with required providers (Router, QueryClient, Contexts)
  3. `const results = await axe(container); expect(results).toHaveNoViolations();`
- Add E2E page checks
  1. Navigate to the page via Page Object
  2. Inject `axe-core` and run `axe.run`
  3. Gate on serious/critical rule IDs

### CI integration (suggested)
- GitHub Actions step examples:
  - `npm ci && npm run a11y:test` (component gate)
  - Optional nightly/job: `npm run e2e` to include the axe smoke
- Fail criteria: any serious/critical violations in either suite

### Troubleshooting
- jest "import.meta.env" or Vite-specific errors
  - Mock modules that read env (e.g., API client) in tests or abstract env access behind injectable config
- React Query warnings about act(...)
  - These are test-environment warnings due to async updates; they do not invalidate axe findings but can be reduced by awaiting data settling or mocking queries
- axe not loading in E2E
  - CDN hiccups: retry or vendor a pinned asset; ensure CSP allows script injection in CI test environment

### References
- jest-axe: `https://github.com/nickcolley/jest-axe`
- axe-core rules: `https://dequeuniversity.com/rules/axe/`
- Testing Library: `https://testing-library.com/`
- WCAG overview: `https://www.w3.org/WAI/standards-guidelines/wcag/`


