# AGENTS.md — LearnedGrowth Source of Truth

This is the authoritative guide for all AI coding work in this repo. Follow it strictly.

## Observed Stack & Project Layout

- **Core**: Expo SDK 54, React Native 0.81, React 19, Expo Router (file-based routes in `app/`).
- **Styling**: NativeWind v4 (babel preset + metro `withNativeWind`, `darkMode: "class"` in `tailwind.config.js`).
- **Animation/Worklets**: Reanimated 4 + `react-native-worklets` (`react-native-worklets/plugin` in `babel.config.js`).
- **State/Data**: Zustand store in `store/useEntriesStore.ts` and data providers in `providers/`.
- **Storage**: SQLite adapter in `db/entriesAdapter.sqlite.ts` (local-first, with memory fallback).
- **Backend**: Supabase (`lib/supabase.ts`, `services/supabaseEntries.ts`).
- **AI**: `services/ai/*` with mode switching via env (`createAbcAiService`).
- **Safe Area / Edge-to-Edge**: `react-native-safe-area-context` + `react-native-edge-to-edge` and `TopFade` in `app/_layout.tsx`.
- **Keyboard**: `react-native-keyboard-controller` with `KeyboardProvider` in `AppProviders`.

## Core Architecture Rules (MUST FOLLOW)

### Navigation (Expo Router Only)

- Use Expo Router (`app/` directory) for all screens.
- Maintain the stack in `app/_layout.tsx`.
- Avoid adding React Navigation stacks manually.

### State & Data Flow

- **Entries** are local-first:
   - Use the Zustand store (`store/useEntriesStore.ts`) via `providers/EntriesStoreProvider.tsx` and `hooks/useEntries.ts`.
   - Use the service layer (`services/makeEntriesService.ts` + `services/entriesService.ts`) for data operations.
   - Avoid direct SQLite or Supabase calls in UI components.
- **Deletes**:
   - Soft delete uses `isDeleted` and `dirtySince`.
   - Hard delete only from the Delete Bin path (local adapter + Supabase hard delete).
- **Sync**:
   - Sync is handled in `EntriesStoreProvider.tsx` (pull remote, then push local).
   - Do not re-implement sync in screens.

### Supabase Usage

- Always use `lib/supabase.ts` and `services/supabaseEntries.ts`.
- Prefer RPC/functions from `services/` or providers (e.g., AI usage, coupons).
- Use `getSupabaseAccessToken()` when building authenticated headers.

### AI Services

- Use `createAbcAiService()` for AI mode selection (dev/local/offline/cloud).
- Streaming:
   - Cloud streaming uses SSE on native (`react-native-sse`) and fetch stream on web.
   - Dev mode can emulate streaming with env flags.
- Normalize AI responses using `normalizeLearnedGrowthResponse`.

### Styling (NativeWind v4)

- Use NativeWind classes for layout, spacing, typography, color.
- **Do NOT use NativeWind shadow classes.**
- **Shadows must use** `getShadow` from `@/lib/shadow.ts`.
- Android shadow rule:
   - Apply shadows to the same view that has the background.
   - Avoid `overflow: hidden` on the shadowed view; put borders/clip in an inner wrapper.
   - If a shadowed card sits inside a `ScrollView`, use the **shadow gutter pattern**:
      - Parent: `style={{ marginHorizontal: -shadowGutter }}`
      - Content container: `paddingHorizontal: shadowGutter`

### Edge-to-Edge & Safe Area

- Handle safe area manually with `useSafeAreaInsets`.
- Keep `TopFade` and `StatusBar` in the root layout.

### Keyboard & Forms

- Never use `KeyboardAvoidingView` or core `ScrollView` for forms.
- Always use `KeyboardAwareScrollView` from `react-native-keyboard-controller`.

### Animation & Threading

- Use Reanimated 4 for animations.
- **`runOnJS` is deprecated.** Use `scheduleOnRN` from `react-native-worklets`.
- Keep worklet callbacks on the UI thread; only bridge when needed.

### Theming

- Theme preference is stored in `PreferencesProvider` (AsyncStorage + `Appearance`).
- Use NativeWind dark mode classes (`dark:`) consistently.
- Semantic colors are defined in `tailwind.config.js` (`belief`, `dispute`, `energy`).

## Conventions & Quality

- Use `@/` alias for internal imports (configured in `tsconfig.json`).
- Keep side effects in services, hooks, and providers; keep UI components declarative.
- Avoid new global singletons; use the existing providers (`AppProviders`).
