Yes—you’re ready to write tests. Your shape looks solid (strings for time are fine). Here’s a tight test checklist you can paste into your spec plan.

# Test setup (once)

* **Store factory**: create a fresh store per test, injecting:

  * `entriesService` mock (`listEntries`, `createEntry`, `updateEntry`, `removeEntry`)
  * `clock.now()` → returns a fixed ISO string
* **Sample data**: one active entry `E1`, one deleted entry `E2`.
* **Helpers**: tiny asserts for `inPending(id)`, `inErrors(id)`, `get(state,id)`.

# Core tests (Given → When → Then)

## Hydration

1. **hydrate success**

* Given service returns `[E1, E2]`
* When `hydrate()`
* Then:

  * `isHydrating` toggles true→false
  * `byId/allIds` match input
  * `lastHydratedAt` set to ISO from `clock.now()`
  * `errors['global']` not set

2. **hydrate failure**

* Given service rejects
* When `hydrate()`
* Then:

  * `isHydrating` toggles true→false
  * `errors['global']` contains a message
  * `byId/allIds` unchanged

## Refresh (merge rules)

3. **refresh merges non-pending**

* Given store has `E1` (no pending), service returns `E1'` with newer fields
* When `refresh()`
* Then `E1` replaced by `E1'`, `lastHydratedAt` updated, no pending set

4. **refresh does not clobber pending**

* Given `E1` has `pending[E1.id]`
* When `refresh()` returns a different `E1'`
* Then `E1` remains unchanged; pending preserved

## Create

5. **create optimistic success**

* Given empty store; `createEntry` resolves with canonical `Enew`
* When `create(draft)`
* Then immediately:

  * new entry appears in `byId/allIds`
  * `pending[id]` set with `{op:'create', opId, submittedAt}`
* After resolve:

  * entry equals `Enew` (esp. `updatedAt`)
  * `pending` cleared
  * `errors[id]` cleared/absent

6. **create optimistic failure → rollback**

* Given empty store; `createEntry` rejects
* When `create(draft)`
* Then immediately entry visible + pending set
* After reject:

  * entry removed from `byId/allIds`
  * `pending` cleared
  * `errors[id]` set (string)

## Update

7. **update optimistic success**

* Given hydrated `E1`; `updateEntry` resolves `E1'`
* When `update(E1.id, patch)`
* Then immediately:

  * `E1` reflects `patch`
  * `pending[E1.id]` set
* After resolve:

  * `E1` equals canonical `E1'`
  * `pending` cleared, `errors` cleared

8. **update failure → rollback**

* Given hydrated `E1`
* When `update(E1.id, patch)` rejects
* Then:

  * optimistic patch applied then reverted exactly to pre-image
  * `pending` cleared; `errors[E1.id]` set

## Remove (soft delete)

9. **remove optimistic success**

* Given active `E1`; `removeEntry` resolves
* When `remove(E1.id)`
* Then immediately:

  * `E1.isDeleted === true`
  * `pending[E1.id]` set
* After resolve:

  * stays deleted
  * `pending` cleared; `errors` cleared

10. **remove failure → rollback**

* Given active `E1`
* When `remove(E1.id)` rejects
* Then:

  * flips to deleted then restored to `isDeleted === false`
  * `pending` cleared; `errors[E1.id]` set

## Concurrency & sequencing

11. **per-entry concurrency guard**

* Given `update(E1.id)` in-flight (don’t resolve)
* When a second `update(E1.id)` starts
* Then either:

  * you **reject** second call with a clear error, and state unchanged, **or**
  * you **queue** it (choose one strategy and assert behavior)

12. **sequence correctness**

* Given `update(E1)` then `remove(E1)` invoked quickly
* When resolves in order
* Then final state: deleted entry with updated fields
* Also test reverse resolution — your guard should preserve logical order

## Errors utility

13. **clearErrors**

* Given `errors` has global and per-id messages
* When `clearErrors()`
* Then `errors` map is empty

## Integrity & selectors (lightweight since you’ll wire UI later)

14. **integrity**

* `allIds` contains no duplicates; every id exists in `byId`
* pending/ errors maps don’t retain stale ids after success

15. **selector behavior (if you add them as pure helpers)**

* `selectAll(state)` returns entries in `allIds` order
* `selectActive(state)` excludes `isDeleted === true`
* `selectById(state,id)` returns `undefined` for missing

# Mock expectations (why)

* Verify each action calls the **service**, not the adapter (enforces layering).
* For success cases, assert the final entry equals the **service’s canonical** data (esp. `updatedAt`).
* For failures, assert **rollback** to exact pre-image and proper error recording.

# Edge cases to add later (optional)

* **ID remap** (if server could change id on create): provisional id → real id reconciliation
* **Global hydrate while mutation pending**: hydrate failure shouldn’t clear pending
* **Clock use**: asserted `submittedAt` equals fixed ISO from clock

That’s it—start with tests 1–8, then add the rest.
