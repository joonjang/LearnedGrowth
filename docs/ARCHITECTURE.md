# LearnedGrowth Architecture Overview

**Purpose**
LearnedGrowth is an offline‑first journaling app that guides users through the ABCDE method from *Learned Optimism* and adds AI‑assisted disputation plus analytics on thinking patterns.

**Runtime Stack**
- Expo SDK 54, React Native 0.81, React 19
- Expo Router for navigation in `app/`
- NativeWind v4 for styling
- Reanimated 4 for animation and worklets
- Zustand for state
- SQLite (Expo) for local storage
- Supabase for auth, data sync, and AI edge functions
- RevenueCat for subscriptions and consumables

**Navigation**
- Root stack lives in `app/_layout.tsx` and uses Expo Router screens only.
- Key screens live in `app/`: `index.tsx` (Home), `entries.tsx`, `entryDetail/[id].tsx`, `dispute/[id].tsx`, `new.tsx`, `bin.tsx`, `settings.tsx`.

**Core Data Model**
- `Entry` is the primary record in `models/entry.ts`.
- Fields include ABCDE text, `aiResponse`, `disputeHistory`, timestamps, `dirtySince`, and `isDeleted`.

**Local‑First Storage**
- SQLite adapter in `db/entriesAdapter.sqlite.ts` is the source of truth on device.
- Adapter supports memory fallback for dev/test.
- `services/entriesService.ts` centralizes CRUD logic, timestamps, and `dirtySince`.
- `providers/AdapterProvider.tsx` owns DB initialization and provides the adapter.

**State & Store**
- Zustand store in `store/useEntriesStore.ts` holds `byId`, `allIds`, `pending`, and `errors`.
- `hooks/useEntries.ts` exposes store actions and derived rows to UI.
- `hydrate` loads local data; `refresh` merges data without clobbering in‑flight edits.

**Optimistic Updates**
- Create, update, remove, and restore are optimistic and update UI immediately.
- Each operation tracks a `pending` entry for concurrency and rollback.
- Failures roll back local optimistic state and record errors in `errors`.
- Stale‑guarding prevents old requests from overwriting newer data.

**Sync Strategy**
- `providers/EntriesStoreProvider.tsx` handles sync with Supabase.
- Pull remote entries, reconcile to local DB when remote is newer or AI data is fresher.
- Push all local entries back to Supabase, including soft deletes.
- Sync runs on mount and when the app becomes active.
- Account linking attaches `accountId` to local entries after login.

**AI Pipeline (Client)**
- `createAbcAiService` selects `dev`, `offline`, `local`, or `cloud` AI modes.
- Cloud mode hits Supabase edge functions and supports streaming via SSE or fetch.
- `useAbcAi` exposes `analyze` plus streaming text for the UI.
- AI results are normalized and stored on the entry as `aiResponse`.

**AI Pipeline (Server)**
- Edge function in `api/supabase/functions/learned-growth/index.ts`.
- Validates input, confirms entry exists, and checks AI usage limits.
- Calls OpenAI, supports streaming, and persists `ai_response` to Supabase.
- Mock responses are supported for local dev and testing.

**Realtime AI Updates**
- `EntriesStoreProvider` subscribes to Supabase `postgres_changes` for `ai_response` updates.
- When AI finishes, the app syncs to refresh the local entry.

**Auth & Monetization**
- Supabase auth in `providers/AuthProvider.tsx` with profile fetching and AI cycle refresh.
- RevenueCat handled by `providers/RevenueCatProvider.tsx` for Growth Plus and consumables.
- `providers/AppConfigProvider.tsx` reads AI credit config from Supabase.

**Preferences & UX**
- Theme, language, and haptics live in `providers/PreferencesProvider.tsx`.
- Edge‑to‑edge layout and safe area handled in `app/_layout.tsx`.
- Keyboard handling uses `react-native-keyboard-controller`.

**Key Flows**
1. Create entry: UI → `useEntries.create` → optimistic store insert → SQLite add → async Supabase upsert.
2. Edit entry: UI → `useEntries.update` → optimistic patch → SQLite update → async Supabase upsert.
3. Soft delete: UI → `useEntries.remove` → optimistic remove → SQLite soft delete → Supabase soft delete.
4. Hard delete: Delete Bin → local hard delete → optional Supabase hard delete.
5. AI analysis: Dispute screen → `useAbcAi.analyze` → Supabase edge function → OpenAI → persist `ai_response` → realtime update → sync to local.

**Testing & Reliability**
- Contract tests cover adapter behavior and timestamps.
- Store tests cover optimistic updates, rollback, concurrency guards, and error handling.
- Service tests cover CRUD logic and adapter integration.

**Starting Points**
- Store and sync: `store/useEntriesStore.ts`, `providers/EntriesStoreProvider.tsx`
- Local DB: `db/entriesAdapter.sqlite.ts`
- AI client: `hooks/useAbcAi.ts`, `services/ai/CloudAiService.ts`
- AI edge function: `api/supabase/functions/learned-growth/index.ts`
- UI entry detail and dispute: `app/entryDetail/[id].tsx`, `app/dispute/[id].tsx`
