## Codex Execution Rules

- Use the environment variables `NODE`, `YARN`, and `OPENSPEC` when invoking those tools/binaries (always quote variables in shell commands, e.g. `"$YARN"`, `"$OPENSPEC"`).
- Always use `yarn` (via `"$YARN"` or `yarn`) as the package and workspace manager instead of `npm` or `pnpm`.
- Never read, print, or expose the contents of `.env`, `.env.local`, `.env.dev`, or `.env.prod` files; reference variable names only and use placeholders in `.env.example`.

## Project Stack

- **Build & Dev:** Vite, React, TypeScript
- **Testing:** Vitest. Use `yarn test:watch` for TDD and `yarn test` for a single run.
- **Server State & Data Fetching:** TanStack Query (`@tanstack/react-query`)
- **Spec Workflow:** OpenSpec (`openspec.dev`)
  - When working on specs or spec-driven changes, check if OpenSpec is available via `"$OPENSPEC"`; if not, emit a clear warning and ask how to proceed before modifying spec artifacts.

## Frontend & TanStack Query Conventions

- Keep TypeScript strict (`noUncheckedIndexedAccess` / no `any` unless justified with a short comment).
- Encapsulate API requests and TanStack Query hooks (`useQuery`, `useMutation`, query keys) in dedicated modules rather than calling `fetch` directly inside UI components.
- Handle loading/pending (`isPending` / `isLoading`), error (`isError`), and empty states cleanly in components.

## Superpowers Plugin

- Prefer using the Superpowers plugin workflows when available in the session. If it is not available, emit a warning once and continue with standard execution unless the task explicitly requires the plugin.

## Startup Readiness Check

- At the very start of a session—before making any code, spec, or file changes—run a quick readiness check (without reading or printing `.env*` file contents).
- Verify and report concisely:
  1. `AGENTS.md` is loaded and clear.
  2. `NODE`, `YARN`, and `OPENSPEC` environment variables are set and valid (report variable names and resolved paths/versions only, never secret values).
  3. `yarn` and OpenSpec CLI work as expected.
  4. Whether the Superpowers plugin is available in this session.
- If any required tool or variable is missing, surface a clear warning and ask how to proceed before making changes.

## Git behaviour

- Never automatically create commits, push changes, or open pull requests.
- Only create local commits when explicitly asked.
- Only push to remote when explicitly asked.

## Code Comments & Documentation

- Use TSDoc (`/** ... */`) blocks above non-component functions and helpers (such as type guards, parsers, mappers, filters, and utilities, e.g. `isValidCategory`), including `@param` and `@returns` when they clarify meaning or edge cases rather than repeating TypeScript types.
- Add a brief comment explaining **why** (intent, non-obvious invariant, constraint, or edge case)—not what the code trivially does—above:
  - Non-component functions and helpers.
  - Key or non-obvious blocks within components, hooks, or modules (such as performance/clustering logic, map/layer lifecycle handling, or cost-guard assumptions).
- Keep comments concise, accurate, and aligned with the surrounding code; avoid restating obvious syntax or types.
- For every non-component function, always write a full multi-line TSDoc (`/** ... */`) block with a summary, the rationale (**why** it exists and any performance, cost, or edge-case constraints), and explicit `@param` and `@returns` tags for every parameter and return value.
