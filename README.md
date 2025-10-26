# LearnedGrowth (WIP)

An offline-first journaling app (ABCDE method from _Learned Optimism_) with cloud sync and AI-assisted disputation.

---

## Development Journal

### 2025-10-25
- Core abilities of entry creations, viewing, editing, and deleting established
- Refactored EntriesStoreProvider for stable initialization
- Added placeholderEntriesStore to prevent remounts and slide-in effects on startup

### 2025-10-24

-  Entry items now uniformly sorted based off timestamp created_at
-  Added a custom useEntries hook wrapping the Zustand store for simpler component integration
-  Implemented barebone entry input modal that nests input for:
-  Adversity input (core input)
-  Belief input (core input)
-  Modularized logic for better separation of concerns (store, hooks, UI fields)
-  What I learned:
-  The importance of encapsulating logic (store, hooks, UI) to keep code clean and scalable

### 2025-10-06

-  Implemented: useEntriesStore to satisfy the entire test suite
   -  Added actions: hydrate, refresh, create, update, remove, clearErrors
   -  Integrated dependency-injected EntriesService and Clock
   -  Ensured deterministic ordering by sorting updatedAt in descending order
   -  Added helpers for pending operations, error handling, and request ID stale-guarding
-  Verified: all optimistic, rollback, and concurrency tests pass
-  What I learned:
   -  Optimistic updates: apply changes immediately, then commit or rollback after async resolution
   -  Stale guarding: use request IDs and in-flight tracking to avoid overwriting fresh data
   -  Zustand pattern: always use set() and get() instead of this for state updates
   -  Immutable updates: required for reliable UI re-renders and predictable tests

### 2025-10-02

-  Added comprehensive tests for useEntriesStore
   -  Created supporting test utilities (builders, makeEntriesServiceMock, TestClock, etc.)
   -  Verified optimistic updates, rollback on failure, concurrency guards, and error handling
   -  Covered hydrate, refresh, create, update, remove, and clearErrors behaviors
-  Testing pipeline structured as:
   -  useEntriesStore.test.ts — unit tests with mocked service, validating consumer-facing state & actions
   -  entriesService.test.ts — unit tests for service layer, ensuring business logic correctness
   -  entriesAdapter.test.ts — integration tests for adapter layer, ensuring DB contract compliance

### 2025-09-28

-  Added base UI screens under (tabs): entries, feeds, settings, dev
-  Created AdapterProvider (React Context) for database access
-  Created EntriesService to wrap adapter with business logic
-  Wrote service-level tests for:
   -  list
   -  create
   -  update
   -  remove

### 2025-09-23

-  Add comprehensive tests for `entriesAdapter` (CRUD + timestamps + dirtySince)
-  Implement `entriesAdapter.sqlite` against Expo SQLite (named params, COALESCE, soft delete)
-  Run SQLite tests via `expo-sqlite-mock` (Jest transform allowlist + setup)
-  Refactor tests to use backend factories (memory + sqlite)
-  ✅ Unit + integration tests passing

### 2025-09-11

-  Defined `Entry` model and `EntriesAdapter` interface.
-  Added stub in-memory implementation (`SQLEntriesAdapter`) for contract testing.
-  Wrote first tests:
   -  add & retrieve entries
   -  mark as deleted
-  Learned: contract-based testing ensures I can later swap SQLite in without breaking tests.

### 2025-09-10

-  Set up Expo + Jest + TS project structure.
-  Added initial folders (`db/`, `api/`, `store/`, `services/`).
-  Established goal: write tests first, then implement features.

---

## Next Steps

-  Make UI pretty
-  Add lightweight form validation and user feedback
