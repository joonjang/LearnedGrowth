# LearnedGrowth (WIP)

An offline-first journaling app (ABCDE method from *Learned Optimism*) with cloud sync and AI-assisted disputation.

---

## Development Journal

### 2025-09-23
- Add comprehensive tests for `entriesAdapter` (CRUD + timestamps + dirtySince)
- Implement `entriesAdapter.sqlite` against Expo SQLite (named params, COALESCE, soft delete)
- Run SQLite tests via `expo-sqlite-mock` (Jest transform allowlist + setup)
- Refactor tests to use backend factories (memory + sqlite)
- ✅ Unit + integration tests passing

### 2025-09-11
- Defined `Entry` model and `EntriesAdapter` interface.
- Added stub in-memory implementation (`SQLEntriesAdapter`) for contract testing.
- Wrote first tests: 
  - add & retrieve entries
  - mark as deleted
- Learned: contract-based testing ensures I can later swap SQLite in without breaking tests.

### 2025-09-10
- Set up Expo + Jest + TS project structure.
- Added initial folders (`db/`, `api/`, `store/`, `services/`).
- Established goal: write tests first, then implement features.

---

## Next Steps
- UI: simple list + detail editor (add/edit/delete) wired to adapter.
- State: wire adapter into a provider; keep Zustand store IO-free (call adapter in actions).
- Sync: sketch interface (listDirty(), markSynced(ids)) for future Supabase sync.
- Error UX: surface DB failures (toast) and optimistic updates with rollback.
- E2E: add a basic on-device test (or manual checklist) to confirm DB works outside Jest.
