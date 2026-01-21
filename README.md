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

---

## Next Steps

- card items in home dashboard should tap to something

- abstract index.tsx

- view display card just suddenly display
   - make them display with an animation instead of all of the sudden

- for android the animation doesnt fully finish. maybe its because im using an old phone

- once user subscribes, enable all entries to get the ai insight
- Entry categorization upon subscription
- enable user to go back to entry without analysis and have it be analyzed
- display a signal that the entry contains AI analysis

- break down streakcard
   - one for current week
   - one for past
   - one for all view

- add search function

- why does it show a loading screen after the splashscreen

- make ai insight respond with how the explanation style is helpful/unhelpful

- add a report problem button to send a snapshot of the issue

- enable user to get extra analysis if someone signs up using their referal code

---

Prod checklist:

rm -rf node_modules
npm ci

rm -rf .expo .expo-shared

npx expo prebuild --clean

cd ios
pod install
cd ..

npx -y eas-cli@latest build -p android --profile playstore --local
env PATH="/opt/homebrew/bin:$PATH" npx -y eas-cli@latest build -p ios --profile production --local

## Development Journal

### 2026-01-21

- cleaned up streakCard
   - abstracted code
   - styling consistent with tailwind
   - removed unusefull styles
- drafting up card summary --> mental focus
- fixed pressable touch and scroll behaviour
   - using react-native pressable instead of gesture handler fixed it
- abstracted home card items
   - data processing done in one location instead of each component O(3n) --> O(n)

### 2026-01-20

- streakcard month day incomplete badge display
- ai analysis scroll down when it is received during the api call
- thinking pattern expandable
   - displays graph and associated detected phrase
- streakCard changes if not current week
- index.tsx now view based off week and not the entire data
   - removed small screen display state since the week label button replaces the text collision problem from before with # thoughts reframed
   - dashboard data updates accordingly

### 2026-01-19

- updated google cloud console to enable oauth with google for android
- fixed prod product id not registering on
- fixed delete button spacing issue for small screen
- text change for bin to have button be less cramped Delete permanently --> Delete
- AI counter belief for entryDetailScreen now not bounded by numberOfLines
- moved home dashboard item directory to root component
- android confirmed to login with google login
- made streakCard expandable and display the specific day entries
- submit feedback pushes the view up + entry detail screen
   - not for my phone though for some odd reason
- consumable purchase from in app purchase registering

### 2026-01-16

- fixed login ui
   - went from bottomsheet to native modal
- implemented delete bin
- fixed revenuecat logout error
- aiInsight loading animation now skeleton animation based
   - improved timing and pace
- devAiService now generates dynamic information for testing api server response
- fixed setting sendFeedback not pushing view up
- made app versioning come from a global source
- fixed settings screen with a card having mismatched shadow
- implemented shadow for ai insight context view card
   - what a wild goose chase figuring that was!
- refactored the timeline items
   - timeline view has description below the label
   - wide view has description on the same line
   - ai insight minimized view matches accordingly to new timeline item view
- added AGENTS.md

### 2026-01-15

- Made screen scaleable for small screen by making input box based off screen size and not hardcoding
   - NewEntryModal scrolls down when the text clips

### 2026-01-14

- Fixed ios keyboard lag by optimizing animation

### 2026-01-13

- input box navigation and style changed
- added dev login

### 2026-01-12

- made button going to /new idempotent
- removed choppines of text prompt display
- EntryContextView
   - removed consequence from displaying for
   - shadow no longer clipped
- Refactored promptDisplay from display character to having final text and then unveiling it
- Made QuickStart button idempotent
- Input now has character limit
- Added reviewer account for android@reviewer.com and apple@reviewer.com --> 80085

### 2026-01-10

- Keyboard display improvements
   - No longer jumpy during text input
   - Android keyboard event trigger immediate for instant size change
- PromptDisplay character distribution spread out more evenly
- Fixed StreakCard triggering known NativeWind mounting issue for dynamic styles

### 2026-01-09

- Added a sprout icon for growth plus members
- Quickstart information viewable from index
- Fixed sudden flash of QuickStart in index screen
- Fixed EntriesScreen thoughts reframed from relative to current day to weekly count from Monday to Sunday
- Added indicator to scroll for EntriesScreen + first entry back now displays something
- Changed ai credit from daily to monthly
- app AI cycle date agnostic from backend, went from start time to expirary time which means the app gets the deadline and doesnt need to predict the future
- ABCAnalysis screen does not turn off when viewed
- Updated style for dark mode and android and ios uniformity
- StreakCard revised

### 2026-01-08

- Updated CreditShop subscription and added terms and privacy policy to abide with app policy
   - Updated paywall to feature ios/android and yearly option
- Updated restore purchase to display alert
- Made learnedgrowth.com landing page
   - Set up email
- Abstracted login OTP form login to authProvider
- subscribed user now has plan column labelled as growth_plus instead of invested
- Updated supabase sql guard from invested to growth_plus
- Fixed timing of continue button animation to happen sequentially
- Setting page sign in button implemented
- Fixed login screen keyboard display floating above and below screen
- QuickStart see it in action pills now look presentable

### 2026-01-07

- Fixed subscriber not being able to refresh
- ABCAnalysis continue button appears after all animation completes

### 2026-01-06

- Made credit shop for refresh come from a bottom modal
- Abstracted bottom sheet styling
- Removed biometric display for settings, its for a later time to implement
- Bug fix
   - free-user bottom sheet no longer unmounts and continue to display
   - ai cycle debug/fix in resetting to every thirty minutes
   - dispute screen close button can close on tap

      ### **Bug: Unresponsive UI During Animation Sequence**
      - **Symptoms:** The "Close" button and other interactions were ignored until the entire entry animation sequence (3-4 seconds) completed.
      - **Root Cause (Layout Thrashing):**
      - Using **Reanimated Layout Props** (`entering={FadeInDown}`) on multiple items inside a `ScrollView`.
      - Each staggered item appearing triggered a **Native Layout Recalculation** to adjust the scroll height.
      - This repeated resizing flooded the **Native-to-JS Bridge**, preventing touch events (like the Close button tap) from being processed until the queue cleared.

      - **The Fix:**
      - Removed `entering` props.
      - Switched to **Shared Values** driving standard `style={{ opacity, transform }}`.
      - **Why it works:** The items now occupy space immediately (even when invisible). This prevents layout recalculations, keeping the Bridge open and the Close button responsive instantly.

### 2026-01-05

- Updated AiInsight display timing + cool down credit refresh placement
- Changed monthly credit to daily credit refill for debugging purposes
   - Changed credit refill to display a countdown and not the date of refill
- Refresh cooldown based off if it has been refreshed within last two minutes

### 2026-01-03

- Made entries list view more efficient with memoization
- Setting screen features coupon
- Removed use of transition-colors from native wind which caused shared value warnings
- Added blur to status bar
- EntryCard dark mode down arrow and dark mode card view improved

### 2026-01-02

- Removed user preference of Ai Analysis toggle
- Entry history of having dispute enables minimizing of Belief and Consequence for card and entry detail
- Removed segment categorization visibility
- Setting screen style touched up

### 2025-12-31

- Pill design to expand for description
- AiInsight minimized and made to look like timeline item when dispute exists
- AiInsight animation sequence and timing corrected

### 2025-12-30

- Added meta field for more data from api entry analysis
- Made the entries list screen look presentable
- EntryCard.tsx UI display changes
   - More simplified
- Abstracted 3Ps definition

### 2025-12-26

- Fixed keyboard displaying glitching for new.tsx, dispute/[id].tsx, EntryDetailScreen
- Fixed navigation bug from entry detail screen
- Entry card changed to group flow UI display
- Added autocorrect to input

### 2025-12-24

- AiInsight content now animates with haptic response for to display the score color
- Refactored ai response data to store timestamp information to enable state of animation freshness for AiInsight
- Changed navigation from tabs to stack

### 2025-12-23

- Entry Detail Screen enter in edit mode and buttons addressed
- Display disclaimer that this is a tool
- Sign up confirmation email established/ OTP for login
- Abstracted Stepper button margin
- Added credit information for AiInsightAnalysis
- Abstracted user credit to be sourced and updated during API call
- Added fix to Nativewind shadow bug, added items to tailwind config as fix

### 2025-12-22

- Tapping on entry card goes to entry detail screen
- Entry detail screen pressable navigations now single fire

### 2025-12-19

- Migrated icon style to lucide (`https://lucide.dev`)
- Quick start screen established
- Fixed navigation double swipe bug

### 2025-12-20

- Found the bug where my code was working for one instance and didnt work in another instance for AiInsightCard.tsx
   - shadow-sm Class: Your specific Tailwind/NativeWind configuration didn't like the shadow-sm class on that specific View container. Removing it fixed the main crash.
   - Missing Colors: Your project doesn't have the default indigo, blue, emerald, or rose palettes enabled. Switching to slate (which usually exists) and your custom dispute-_ / belief-_ colors fixed the rendering.
   - Loader Component: The ThreeDotsLoader likely had similar color/shadow issues inside it, so swapping to the native ActivityIndicator made it 100% safe.

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
- Implement `useResponsiveFont` hook (moderated, clamped width-based scaling)
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
