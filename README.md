# LearnedGrowth (WIP)

An offline-first journaling app (ABCDE method from *Learned Optimism*) with cloud sync and AI-assisted disputation.

---

## Development Journal

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
- Add more contract tests (update, getById, double-remove).
- Transition stub to real SQLite implementation.
- Wire store → adapter → UI list view.
