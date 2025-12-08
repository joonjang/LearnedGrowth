# LearnedGrowth (WIP)

An offline-first journaling app (ABCDE method from _Learned Optimism_) with cloud sync and AI-assisted disputation.


---

## Development Journal

### 2025-12-08
- Streaming API data now displays on app from supabase


### 2025-12-06
- Consolidated AI storage into a single `aiResponse` JSON column in SQLite
- AI Response questions are the dispute queestions if they exist
- Dispute questions source from ai cached response first before going to standard prompts
- Analyze button now checks if cached response exists
- Streaming data text now displays to show user of progress
- To build in preview: `eas build -p ios --profile preview`


### 2025-12-05
- Extended database to hold 'counterBelief' JSON text
- Cached AI JSON data now displays in respective [id]/index


## Supabase Setup (Edge AI + Auth)
- Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for the Expo app (add them as EAS secrets for TestFlight).
- Optional overrides: `EXPO_PUBLIC_SUPABASE_AI_FUNCTION` (defaults to `learned-growth`) and `EXPO_PUBLIC_SUPABASE_AI_STREAM_FUNCTION` (defaults to the same function).
- Keep `EXPO_PUBLIC_API_BASE_URL` only if you want to hit a non-Supabase API; otherwise the app will target `https://<supabase>/functions/v1/{function}` automatically.
- Cloud AI requests now send Supabase auth headers (Bearer session token when signed in, anon key otherwise) and persist sessions in `AsyncStorage` for mobile builds.
- Edge Function lives at `api/supabase/functions/learned-growth/index.ts`.
  - Local: from `api/`, run `supabase functions serve learned-growth --env-file .env` (needs `OPENAI_API_KEY` in `.env`).
  - Deploy: `supabase functions deploy learned-growth --project-ref <your-project-ref>`.
  - Set secrets in Supabase: `supabase secrets set OPENAI_API_KEY=... [OPENAI_MODEL=gpt-5-mini]`.
  - Confirm the function returns the LearnedGrowth JSON contract before switching the app env to Supabase.


### 2025-12-04
- Implemented AI response UI/UX
- dispute.tsx plumbing change

### 2025-12-03
- Refactored entry-new and dispute
  - animation and routing logic changed
  - unified shared logic and component use 
- Display streamed API data to app

### 2025-12-02
- Make an API for backend logic
- Removed `api` from this repo and made private
- API now communicates with openAi
- Updated abcde JSON prompts to flow better when mixed and matched

## Phase 1: Make the offline mode + database (Complete)
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
- Circle back and assess the edit/cancel/save button flow of [id]/index header
- Re-look at the integration of AI info for the UI, consider changing the highlight
- Address the UX flow of ABC then to analysis, instead of two buttons make a 'Next' and then options to enable/disable AI
- Add test to for API
- Disable editing of ABC once dispute has been made
- If AI insight is fetched and then closed, it should still appear on the [id]/index once the aiResponse is cached
- Change to entry should enable a refreshed AI response to be possible
