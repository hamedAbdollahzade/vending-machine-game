# AGENTS.md — Frontend Coding Conventions (React & Next.js)

These rules apply to every task in this repository. Follow them exactly. If a rule conflicts with existing code, follow the rule for new code and do not refactor unrelated files. If a rule is unclear, ask before guessing.

## 0. How this file is organized

- **Sections 1–13 are general** and apply to every project (React or Next.js).
- **Section 14 is framework-specific.** Detect the project type first:
  - `next` in `package.json` dependencies → **Next.js** project → also follow 14.1.
  - Otherwise (Vite, CRA, etc.) → **React** project → also follow 14.2.
- Never apply the rules of the other framework.

## 1. Core principles

1. **Readability beats cleverness.** Write the simplest code that works. A teammate must understand it on the first read.
2. **Easy to extend.** Small, single-purpose functions and components; clear layers; no hidden coupling.
3. **Don't repeat yourself, but don't abstract early.** Duplicate once, tolerate it twice, extract on the **third** occurrence (Rule of Three).
4. **One source of truth.** All HTTP goes through one Axios client; all app-wide state lives in one Redux store; all shared UI lives in `components/shared`.
5. **Documented.** Every function has a doc comment; important places have inline comments.
6. **Formatted before it runs.** Prettier runs automatically before dev and build.

## 2. Ask before you start (mandatory)

At the **start of every task**, before writing any code, ask the user these questions and wait for the answers:

1. **Language:** "Should this be written in **TypeScript** or **JavaScript**?"
2. **Ant Design:** "Do you need **Ant Design** for this, or should I use **only Tailwind CSS**?"

Rules:
- Never assume the answers, even if the repo already contains `tsconfig.json` or Ant Design. Always ask.
- Skip a question only if the user already answered it explicitly in the current task description.
- If Ant Design is not needed, use **Tailwind only** and do not import anything from `antd`.
- State the chosen answers in your final summary.

## 3. Stack

| Concern | Choice |
|---|---|
| Language | **Asked every task** (TypeScript or JavaScript). If TypeScript: `strict: true` |
| UI | React 18 (function components + hooks only) |
| Framework | Next.js App Router **or** React + Vite (detected, see section 0) |
| Global state | Redux Toolkit |
| HTTP | Axios (no RTK Query, no raw `fetch`) |
| Forms | React Hook Form |
| Styling | Tailwind CSS by default. Ant Design **only if the user confirms** |
| Formatting | Prettier |
| Testing | Vitest + React Testing Library (Cypress for E2E) |

Do not add a dependency without stating why and asking first.

## 4. Naming

### Files and folders
- **Component files:** `PascalCase.tsx` / `.jsx` → `UserCard.tsx`
- **Everything else:** `camelCase.ts` / `.js` → `useAuth.ts`, `userService.ts`, `authSlice.ts`, `formatDate.ts`
- **Folders:** `camelCase` (`userManagement/`). A folder holding one component plus companion files is `PascalCase` (`UserCard/`).
- **Tests:** next to the file → `UserCard.test.tsx`
- **Type files (TS):** `user.types.ts`
- **Exception:** Next.js reserved names (`page.tsx`, `layout.tsx`, `loading.tsx`, `route.ts`) and route folders follow Next.js rules.

### Code identifiers
| Kind | Style | Example |
|---|---|---|
| Variables, functions | camelCase | `totalPrice`, `calculateTotal()` |
| Components | PascalCase | `UserCard` |
| Hooks | `use` + PascalCase | `useDebounce` |
| Types, interfaces | PascalCase, **no `I` prefix** | `User`, `UserCardProps` |
| Props type | `<Component>Props` | `UserCardProps` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Booleans | `is` / `has` / `can` / `should` | `isLoading`, `hasError` |
| Internal handlers | `handle` + Event | `handleSubmit` |
| Callback props | `on` + Event | `onSubmit` |
| Slice | `<feature>Slice` | `authSlice` |
| Thunks | verb + noun | `fetchUsers` |
| Selectors | `select` + Name | `selectCurrentUser` |
| Service functions | verb + noun | `getUsers`, `createOrder` |

- Prefer union types over `enum`: `type Status = 'idle' | 'loading' | 'failed'`.
- Names are descriptive. Abbreviate only `id`, `url`, `api`, `props`.
- Identifiers and comments are in **English**.

## 5. Project structure (layer-based)

The shared layers are **identical** in both project types and live in `src/`:

```
src/
  components/
    shared/          # reusable components used by 2+ pages/features
    layout/          # Header, Sidebar, PageLayout
  hooks/             # shared custom hooks
  services/          # Axios client + API functions (the ONLY place for HTTP)
    apiClient.ts
    userService.ts
  store/
    index.ts         # configureStore + RootState/AppDispatch
    hooks.ts         # useAppDispatch, useAppSelector
    slices/
  types/
  utils/             # pure helpers
  constants/
  styles/
  tests/
```

Only the routing layer differs (see section 14):
- **Next.js:** `src/app/` (routes only).
- **React (Vite):** `src/pages/`, `src/routes/`, `src/main.tsx`, `src/assets/`.

### Layer rules
- Route files (`app/` or `pages/`) compose components and wire data; no business logic beyond that.
- A component used by **one** page stays in that page's folder. On its **third** use (or when a second page needs it) move it to `components/shared`.
- `components/shared` must be **generic and props-driven**: no imports from pages/routes, `services`, or `store`.
- Components never call Axios. They call hooks, dispatch thunks, or use data passed as props.
- `utils` are pure functions (no React, no side effects).
- No circular imports. Use the `@/` alias for `src/`; avoid `../` chains deeper than two levels.

## 6. Writing simple, readable code

- **Max nesting: 2 levels** (an `if` inside a loop is the limit). Flatten with early returns, guard clauses, or by extracting a named function.
- **Max function length: ~30 lines.** If longer, split into well-named helpers.
- **One function, one job.** If you need "and" to describe it, split it.
- **Max 3 parameters.** Beyond that, pass a single object.
- **Rule of Three:** repeated logic/markup is extracted on the third occurrence into a util, hook, or `shared` component. Do not pre-abstract.
- No nested ternaries. Use `if`/early return or a lookup object.
- Name intermediate values instead of writing long chained expressions.
- No magic numbers or strings: move them to `constants/`.
- Prefer plain `map`/`filter`/`find` over clever `reduce` chains.
- Avoid premature optimization: add `useMemo`/`useCallback` only for a measured problem or a memoized child.

```ts
// Bad: nested and hard to scan
function getLabel(user) {
  if (user) {
    if (user.isActive) {
      return user.name;
    }
  }
  return 'Unknown';
}

// Good: guard clause, flat
function getLabel(user: User | null): string {
  if (!user?.isActive) return 'Unknown';
  return user.name;
}
```

## 7. Documentation and comments

### Every function gets a doc comment
Every function must have a short JSDoc block directly above it describing **what it does**: components, hooks, helpers, services, thunks, selectors, and handlers.

- First line: one clear sentence about the purpose.
- Add `@param` and `@returns` when the function has parameters or a return value.
- One line is enough for trivial functions.
- Not required for tiny inline callbacks (e.g. inside `.map()`).

```ts
/**
 * Returns the display name of a user, or "Unknown" when the user is inactive.
 * @param user - The user to read the name from.
 * @returns The name to show in the UI.
 */
function getLabel(user: User | null): string {
  if (!user?.isActive) return 'Unknown';
  return user.name;
}
```

### Inline comments for important places
Always comment:
- **Why** something is done in a non-obvious way (workarounds, browser/device quirks, offline handling).
- Business rules, calculations, and necessary magic values.
- Complex conditions, regex, and data transformations.
- Side effects and cleanup in `useEffect`, and why the dependencies are what they are.
- Anything that looks like a bug but is intentional.
- Open work as `// TODO: <what and why>`.

Do **not** write comments that only repeat the code (`// increment i`). No commented-out code. No leftover `console.log`.

## 8. Components

- Function declarations for components; arrow functions for inline callbacks.
- One component per file, under ~150 lines. Split when larger.
- Define a props type right above the component (TS) or a `@typedef` (JS). Do not use `React.FC`.
- **Named exports only.** Default export only where a framework requires it (Next.js special files, `React.lazy` pages).
- Order: hooks → derived values → handlers → effects → early returns → JSX.
- Always render **loading, error, and empty** states for async UI.
- Extract repeated logic into custom hooks and repeated UI into `components/shared` (Rule of Three).
- Semantic HTML and basic accessibility (labels, alt text, focus).

```tsx
type UserCardProps = {
  user: User;
  onSelect: (id: string) => void;
};

/**
 * Shows a clickable card for one user and reports the selection.
 */
export function UserCard({ user, onSelect }: UserCardProps) {
  const handleClick = () => onSelect(user.id);

  return (
    <button type="button" onClick={handleClick}>
      {user.name}
    </button>
  );
}
```

## 9. TypeScript / JavaScript

Follow the answer to the question in section 2.

### If TypeScript
- No `any`. Use `unknown` and narrow, or define a type.
- Type all parameters and exported return values; let inference handle locals.
- Request/response shapes live in `types/` and are shared by services and slices.
- `type` for unions and props; `interface` only when extending.
- No non-null assertion (`!`) without a comment explaining why it is safe.
- Files use `.ts` / `.tsx`.

### If JavaScript
- Files use `.js` / `.jsx`. Same naming and structure rules apply.
- Describe data shapes with JSDoc (`@typedef`, `@param {Type}`, `@returns {Type}`), kept in `types/`.
- Document props with a `@typedef` above the component.
- `const`/`let` only (never `var`), strict equality (`===`), optional chaining where needed.

## 10. API layer (all requests via Axios)

- **Every HTTP request goes through Axios.** Do not use `fetch`, `XMLHttpRequest`, or other HTTP clients. (WebSocket is not HTTP; see 14.2.)
- There is **one Axios instance**: `services/apiClient.ts`. It configures `baseURL`, timeout, auth header, and interceptors for token refresh and error normalization.
- Requests are made **only inside `services/`**, one file per domain (`userService.ts`). Services are plain async functions that return data and know nothing about Redux or React.
  ```ts
  /**
   * Fetches the list of all users from the API.
   * @returns The users array.
   */
  export async function getUsers(): Promise<User[]> {
    const { data } = await apiClient.get<User[]>('/users');
    return data;
  }
  ```
- Endpoint paths are constants (in the service file or `constants/endpoints.ts`), not scattered strings.
- Errors are normalized **once** in the interceptor into a single shape (`{ message, status }`). Callers show `error.message`; they do not parse Axios errors themselves.
- Cancel or ignore stale requests with `AbortController` when a component can unmount mid-request.

## 11. Global state (Redux Toolkit)

The store holds **only** these categories. Anything else stays local (`useState`, or a small hook calling a service).

| Category | Slice | Holds |
|---|---|---|
| Auth & current user | `authSlice` | token, profile, permissions |
| General UI settings | `uiSlice` | theme, language, sidebar state |
| Device connection | `deviceSlice` | online/offline status, connected device info (only if the project talks to devices) |
| Shared cross-page data | one slice per domain (e.g. `lookupsSlice`) | data needed by 2+ pages |
| Shopping cart | `cartSlice` | cart items and quantities (header badge, cart page, product pages) |

Rules:
- One slice per feature in `store/slices/`. Slice shape for fetched data:
  `{ items, status: 'idle' | 'loading' | 'succeeded' | 'failed', error: string | null }`.
- Async work uses `createAsyncThunk` that calls a **service**; handle `pending/fulfilled/rejected` in `extraReducers`.
- Use typed `useAppDispatch` / `useAppSelector` only (plain equivalents in JS).
- Write selectors beside the slice; components do not read deep state shapes directly.
- Page-local data (a table on one page, form state, open/closed flags) does **not** go in Redux.
- Keep the state shape documented: when adding a slice, add one line to the table above.

## 12. Formatting (Prettier is mandatory)

Code **must** be formatted with Prettier before the project runs in dev or build.

`package.json` scripts:
```json
{
  "scripts": {
    "format": "prettier --write \"src/**/*.{ts,tsx,js,jsx,css,json,md}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,js,jsx,css,json,md}\"",
    "predev": "npm run format",
    "prebuild": "npm run format",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --max-warnings 0"
  }
}
```
(`predev` and `prebuild` run automatically before `npm run dev` / `npm run build`. `typecheck` is TypeScript only.)

`.prettierrc`:
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "all",
  "printWidth": 100
}
```

- Run `npm run format` after editing files and before reporting a task as done.
- Never hand-format against Prettier; never use `// prettier-ignore` without a reason in a comment.
- ESLint passes with zero warnings (`react-hooks`, `@typescript-eslint` if TS, import order).
- Import order: React → third-party → `@/` aliases → relative → styles. Remove unused imports.

## 13. Styling, testing, and git

### Styling
- **Default is Tailwind CSS only.** Use Ant Design **only** if the user said yes in section 2.
- Tailwind utilities for layout/spacing; `clsx` for conditional classes; extract a component when the same class list repeats 3+ times.
- When Ant Design is approved: customize via theme tokens, not CSS overrides, and do not mix it with custom components that do the same job.
- No inline `style` except for truly dynamic values. No hard-coded colors or sizes: use tokens.
- Mobile-first and responsive; for Persian UI use RTL-safe logical utilities (`ms-*`, `me-*`, `ps-*`, `pe-*`).

### Testing
- Test behavior via React Testing Library; query by role/label/text.
- Mock the network at the **service** boundary; never call real APIs.
- New utils, slices, and non-trivial components ship with tests; bug fixes ship with a regression test.

### Git
- Branches: `feature/<name>`, `fix/<name>`. Commits: Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`).
- Keep changes small and focused; do not mix refactors with features.

## 14. Framework-specific rules

### 14.1 Next.js (App Router)

```
src/
  app/               # routes only: page.tsx, layout.tsx, loading.tsx, route.ts
  components/ hooks/ services/ store/ types/ utils/ constants/ styles/
```

- Components are **Server Components by default**. Add `'use client'` to the smallest leaf that needs state, effects, or browser APIs.
- Public/SEO data is fetched on the server (the same Axios client may be used server-side), not through Redux.
- Redux and browser-only hooks live in client components, provided via a client `Providers` component. Create the store only if client state is actually needed.
- Every page defines metadata (`generateMetadata`) with title and description.
- Use `next/image` and `next/link`. Use route handlers (`route.ts`) only when an API layer is truly needed.
- Never touch `window`/`localStorage` during server rendering.
- Default exports are allowed for `page`, `layout`, `loading`, `error`, `not-found`.

### 14.2 React (Vite SPA / PWA / embedded UI)

```
src/
  assets/            # images, fonts, icons
  pages/             # one folder per route; page-specific components live here
  routes/            # router config, route guards
  main.tsx
  components/ hooks/ services/ store/ types/ utils/ constants/ styles/ tests/
```

- Lazy-load pages with `React.lazy` + `Suspense`.
- Assume **unreliable or no network** if the app targets devices (vending, PWA). Handle offline state explicitly; never block the UI on a failed request.
- Device communication over HTTP goes through Axios in `services/`. WebSocket/serial live in a dedicated `services/` module with typed messages and reconnect logic, updating `deviceSlice`.
- For ESP32 / Orange Pi targets keep bundles small: avoid heavy dependencies and unused polyfills.
- Document PWA caching/queue strategy in the PR description.

## 15. Refactoring an existing project

When asked to refactor a project to match this file:

1. **Detect the project type** (section 0) and ask the questions in section 2 before starting. Do not migrate between TypeScript and JavaScript unless explicitly asked.
2. **Audit first.** Scan the project and report what violates these rules (structure, naming, HTTP calls outside `services/`, missing doc comments, deep nesting, duplicated code, unformatted files). Do not change code yet; present a short plan and wait for approval.
3. **Preserve behavior.** A refactor must not change what the app does. No new features, no UI changes, no dependency upgrades.
4. **Work in small steps,** one concern at a time, in this order:
   1. Add Prettier config and scripts, then format the project (formatting-only commit).
   2. Centralize HTTP: create `apiClient` and move every request into `services/`.
   3. Restructure folders and rename files per sections 4 and 5; update imports.
   4. Organize global state per section 11; move page-local state out of Redux.
   5. Extract duplicated code (Rule of Three) and move reusable components to `components/shared`.
   6. Flatten nesting and split long functions (section 6).
   7. Add doc comments and important inline comments (section 7).
5. **Verify after every step:** run `format`, `typecheck` (TS only), `lint`, and `test`, and make sure the project still builds. Fix breakage before moving on.
6. **One commit per step,** using Conventional Commits (`refactor: ...`).
7. **Do not touch** anything you are unsure about; list it in the final report instead.

## 16. Agent checklist (before finishing any task)

1. Did I detect the project type and ask the TypeScript/JavaScript and Ant Design questions (section 2)?
2. Did I read the surrounding code and match its patterns?
3. Is new code in the correct layer (section 5)? Any new HTTP call goes in `services/` via `apiClient`.
4. Nesting ≤ 2, functions ≤ ~30 lines, no third copy of repeated code?
5. Does every function have a JSDoc description, and do important places have inline comments?
6. Did I run `npm run format`, `typecheck` (TS only), `lint`, and `test`?
7. Did I summarize what changed, the chosen language/UI library, assumptions, and follow-ups?
8. Did I avoid touching unrelated files, configs, and dependencies?
