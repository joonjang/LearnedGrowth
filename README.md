# LearnedGrowth (WIP)

An offline-first journaling app (ABCDE method from _Learned Optimism_) with cloud sync and AI-assisted disputation.

---

## Development Journal

### 2025-12-03
- Refactored entry-new and dispute
  - animation and routing logic changed
  - dispute is now in its own route
  - unified shared logic and component use 

### 2025-12-02
- Make an API for backend logic
- Removed `api` from this repo and made private
- API now communicates with openAi
- Updated abcde JSON prompts to flow better when mixed and matched

## Phase 1: Make the frontend + database (Complete). 
## Starting Phase 2: The AI layer

### 2025-11-30
- EntryCard now can do undo delete
- One source of truth for colors

### 2025-11-29
- Abstracted out the FadeTop header for only one component render instead of recurring calls
- Implemented entry [id] view
  - Can modify items
- Card menu item now features a growing animation

### 2025-11-28
- Added entry card editing and deleting navigation 
- Abstracted out linear gradient header view
- Made dispute.tsx not a safe view and put down content inset
- Replaced CTA and New Item button stub with a more presentable button
- Made top inset have a dark linear gradient view (`https://docs.expo.dev/versions/latest/sdk/linear-gradient/`)
- Abstracted entry-new.tsx and dispute.tsx button logic to StepperButton.tsx
- Added alert to confirm input closing if there is text provided in the form

### 2025-11-27
- Got dispute.tsx working and look as desied 
- Refactored the entry input to abstract away redundant code
  - Introduced Keyboard Controller for the keyboard logic (`https://kirillzyusko.github.io/react-native-keyboard-controller/docs/installation`)
- Got the dispute.tsx working as desired
  - Time to refactor and make the code cleaner

### 2025-11-26
- (WIP) Fixing AI slop for UI implementation for `dispute.tsx`
- Implemented a rough UI implementation for `dispute.tsx`

### 2025-11-25
- Color code following materialUI design pattern
- Refreshed the entries list to render structured cards with adversity/belief/consequence and a dispute call-to-action 
- Introduced an entry detail view routed under `/entries/[id]` with proper stack layout for nested screens 
- Removed legacy entry screens and old archive variants 

### 2025-11-19
- Went on a wild goose chase because the app kept crashing when some sort of state change happened
  - Turned out it was an issue from `app.json` where the `"reactCompiler": true` was causing a React to think there was a mismatch in the hook when there in fact was NOT
  - Setting it false solved it
- Refactored the dev screen during the goose chase process
- Archived some old files just in case
- Helpful command inputs:
    `rm -rf .expo .expo-shared node_modules/.cache metro-cache
    watchman watch-del-all # if watchman installed
    npm install
    npx expo start -c`

### 2025-11-08
- Refactor `entry-new`
  - Move component styles into a dedicated StyleSheet object
  - Simplify traversal-key logic
- Refactor `InputField`
  - Make text entry size adapt to keyboard visibility
  - Make prompt scale with screen size and center it
  - Move component styles into a dedicated StyleSheet object
- Implement `useKeyboardVisible` hook (cross-platform show/hide events)
- Implement `useResponsiveFont` hook  (moderated, clamped width-based scaling)
- Introduce `abcdeDev.json` (test fixtures)
- Update `app.json` to handle Android keyboard resize

### 2025-11-06
- Make `InputField` adjust to the soft keyboard (prevent prompt clipping)
- Refactor `InputField` layout and styling for keyboard-aware behavior
- Integrate Lottie loading indicator for prompt loading state
- Implement `useDeferredReady` to delay prompt animations until the modal is rendered

### 2025-11-03
- Implement New Entry Modal
  - Step-by-step input flow for Adversity, Belief, Consequence
  - Dynamic prompts sourced from JSON for contextual guidance
  - Typewriter animation for more engaging prompts  
    - https://docs.benjamineruvieru.com/docs/react-native-type-animation/
  - Improved keyboard handling and responsive layout

### 2025-10-25
- Establish core entry CRUD: create, view, edit, delete
- Refactor `EntriesStoreProvider` for stable initialization
- Add `placeholderEntriesStore` to prevent remounts/slide-in on startup

### 2025-10-24
- Uniformly sort entry items by `created_at` timestamp
- Add custom `useEntries` hook wrapping Zustand store
- Implement barebones entry input modal nesting:
  - Adversity input (core)
  - Belief input (core)
- Modularize logic for clearer separation of concerns (store, hooks, UI)
- **What I learned:** Encapsulating logic (store, hooks, UI) keeps code clean and scalable

### 2025-10-06
- Implement `useEntriesStore` to satisfy the test suite
  - Actions: `hydrate`, `refresh`, `create`, `update`, `remove`, `clearErrors`
  - Dependency-inject `EntriesService` and `Clock`
  - Deterministic ordering via `updatedAt` descending
  - Helpers for pending ops, error handling, request-ID stale-guarding
- Verify optimistic, rollback, and concurrency tests pass
- **What I learned:**
  - Optimistic updates: apply immediately; commit/rollback after async result
  - Stale-guarding: request IDs and in-flight tracking prevent overwrites
  - Zustand pattern: use `set()`/`get()` (not `this`) for updates
  - Immutable updates: required for reliable re-renders and tests

### 2025-10-02
- Add comprehensive tests for `useEntriesStore`
  - Test utilities: builders, `makeEntriesServiceMock`, `TestClock`, etc.
  - Cover optimistic updates, rollback on failure, concurrency guards, error handling
  - Cover `hydrate`, `refresh`, `create`, `update`, `remove`, `clearErrors`
- Testing layout:
  - `useEntriesStore.test.ts` — unit tests (mocked service)
  - `entriesService.test.ts` — service logic
  - `entriesAdapter.test.ts` — adapter/DB contract integration

### 2025-09-28
- Add base UI screens under `(tabs)`: entries, feeds, settings, dev
- Create `AdapterProvider` (React Context) for DB access
- Create `EntriesService` to wrap adapter business logic
- Service tests for: list, create, update, remove

### 2025-09-23
- Add comprehensive tests for `entriesAdapter` (CRUD + timestamps + `dirtySince`)
- Implement `entriesAdapter.sqlite` using Expo SQLite (named params, `COALESCE`, soft delete)
- Run SQLite tests via `expo-sqlite-mock` (Jest transform allowlist + setup)
- Refactor tests to use backend factories (memory + sqlite)
- ✅ Unit + integration tests passing

### 2025-09-11
- Define `Entry` model and `EntriesAdapter` interface
- Add stub in-memory implementation (`SQLEntriesAdapter`) for contract testing
- First tests:
  - add & retrieve entries
  - mark as deleted
- **Learned:** contract-based testing enables later SQLite swap without breakage

### 2025-09-10
- Set up Expo + Jest + TypeScript project structure
- Add initial folders: `db/`, `api/`, `store/`, `services/`
- Establish goal: write tests first, then implement features

---

## Next Steps
- Add test to for API
- Make UI/UX that integrates AI response
- Set up local ai component of app
- Upon making an entry, it should go to [id] page
- Make a CTA button visible on [id]
- Set up Supabase
