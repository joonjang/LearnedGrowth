# LearnedGrowth (WIP)

An offline-first journaling app (ABCDE method from _Learned Optimism_) with cloud sync and AI-assisted disputation.

## Supabase Setup
- Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for the Expo app (add them as EAS secrets for TestFlight).
- Optional overrides: `EXPO_PUBLIC_SUPABASE_AI_FUNCTION` (defaults to `learned-growth`) and `EXPO_PUBLIC_SUPABASE_AI_STREAM_FUNCTION` (defaults to the same function).
- Keep `EXPO_PUBLIC_API_BASE_URL` only if you want to hit a non-Supabase API; otherwise the app will target `https://<supabase>/functions/v1/{function}` automatically.
- Dev without OpenAI: set `MOCK_AI=true` in `api/supabase/.env` when serving locally to return a canned JSON response from the Supabase function without calling OpenAI.
- RevenueCat:
  - Set `EXPO_PUBLIC_REVENUECAT_API_KEY` in `.env` / EAS secrets.
  - Configure your Offering + Paywall + Customer Center in the RevenueCat dashboard (`Growth Plus` entitlement, `monthly` package, optional `consumable` product).

## Dev + Preivew
- dev `
  - npx expo run:ios --device
- preview 
  - run on xcode
  - npx expo run:ios --configuration Release --device

---

## Development Journal

### 2025-12-19
- Migrated icon style to lucide
- Drafting up starting quick start screen

### 2025-12-18
- Integrated front end tests
  - End-to-End (E2E): Implemented Maestro workflows to validate critical user journeys (Entry Creation Swipe-to-Delete interactions) with robust testID selectors and dynamic UI handling.
  - Unit & Integration: Configured Jest environment with custom transformIgnorePatterns and manual mocks (Reanimated, Navigation) to support NativeWind and Expo dependencies.
- Fixed pressing next doesnt clear the text input sometimes
- Added placeholder text for input
- Made in-house type writing effect to substitute react-native-type-animation
- Fixed belief/dispute dark mode css call

### 2025-12-17
- Restyled AiInsightCard
- Displays if ai analysis is stale
  - added new property in aiResponse
- Counts the amount of ai calls made in respect to entry
- Display outdated analysis sign if entry changed
- Button abstracted and flow improved for EntryCard vs [id]/index
- Cooldown added
- AI insight is fetched and then closed, it still appears on the [id]/index once the aiResponse is received and is cached

### 2025-12-16
- Credit pack established
- Cleaned up account screen, now labelled as settings screen
  - buttons uniform
  - added credit purchase options
- Refreshing expired plan should show correct status
- CreditShop.tsx now handles profile credit refreshes
- Next button should go to analysis if cache exists 
- abstracted constants to constants.ts
- applied solution to android and apple having different shadow behaviours
- Circle back and assess the edit/cancel/save button flow of [id]/index header


### 2025-12-15
- gorhom/bottom-sheet (`https://gorhom.dev/react-native-bottom-sheet/`) integrated for login and free-user modal
- dispute.tsx is its own directory and is fullscreen on both android and apple
- new.tsx now in root directory 
- dispute and new entries now have synchronized behaviour for the keyboard padding inputs
- Login screen now has keyboard view change configured
- Next button branches to analyze if subscribed or option to use ai credit if logged in and is not subscribed or dispute

### 2025-12-13
- Enabled apple app store purchase
- Made local ruby usable for fastlane for mac
- [id] belief/dispute matches entry card

### 2025-12-12
- Migrated everything to tailwind/nativewind
- Working on UI
- Entry input displays uniformly on android and apple

### 2025-12-11
- Working on Android
  - Sticky header now works as it does for apple
  - Content view shifted down for camera as it did for apple 
  - Edge-to-edge design
- Status bar color is uniform, black during light mode and white during dark mode
- Input screen modals now have a close button and inset if android and none if apple
- dispute.tsx and new.tsx now has alert to close if 'x' is pressed


### 2025-12-10
- Feedback table implemented
- Account delete feature + webhook implemented
- Subscription changes user state
- Implemented Google and Apple log in

### 2025-12-09
- Added more edge functions
  - Coupons
- Stripe checkout/webhooks were removed after moving to RevenueCat
- run with `supabase functions serve --env-file .env`

### 2025-12-08
- Streaming API data now displays on app from supabase
- Supabase docker established
- Auth guard implemented
  - 5 free analysis given
  - local entries become associated to account
- Cloud database established

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
  - `__test__/store/useEntriesStore.test.ts` — unit tests (mocked service)
  - `__test__/services/entriesService.test.ts` — service logic
  - `__test__/db/entriesAdapter.test.ts` — adapter/DB contract integration

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
- Unit + integration tests passing

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

- Display disclaimer that this is a tool
- Display empty entry helper information 

- Seeing setting screen should update revenue cat credits 

- Encrypt entries when in cloud

- Biometric lock disables the app from all screens until unlocked

- Revenuecat failed purchase screens

- Fine tune dark mode
  - loading ellipse white

- Change setting toggle colors

- Add test to for API
- Have a distinction for production tables and edge functions and development versions

- Implement a home page summary screen showing weekly optimism/mix/pessimism meter

- BACKLOG -
- add a report problem button to send a snapshot of the issue
- enable user to get extra analysis if someone signs up using their referal code
- Change positioning of delete account

## Steps

- Auth guard
  - Cloud database sync 
    - log out should hide entries

- Account screen/Setting
  - if subscribed, manage subscription. links to app store management sheet 
  - restore purchases to re-sync active subscription of reinstall app
    - webhook should update with the supabase database to match
  - enable biometric security -- buggy
  - tactile haptic feedback when completing an entry x
  - delete account x
    - test for google and apple
  - if user is offline, grey out manage subscription and delete account and indiciate offline
- App store payment testing + revenuecat
  - test fails and restore purchase
- UI
