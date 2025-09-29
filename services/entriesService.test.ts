import { SQLEntriesAdapter } from "@/db/entriesAdapter.sqlite";
import { Entry } from "@/models/entry";
import { TestClock } from "@/test-utils/testClock";
import {
    createEntry,
    listEntries,
    removeEntry,
    updateEntry,
} from "./entriesService";

// Incrementing UUID mock with built-in reset (no out-of-scope vars)
jest.mock("uuid", () => {
  let counter = 0;
  return {
    v4: jest.fn(() => `mockUUID-${counter++}`),
    __reset: () => {
      counter = 0;
    },
  };
});
// eslint-disable-next-line @typescript-eslint/no-require-imports
const uuid = require("uuid") as any;

// ——— factory (memory backend only for this service-level test) ———
async function makeMemory() {
  const clock = new TestClock();
  const adapter = new SQLEntriesAdapter(null, clock);
  return { adapter, clock, cleanup: async () => {} };
}

describe("entries service tests", () => {
  let db: SQLEntriesAdapter;
  let clock: TestClock;
  let cleanup: () => Promise<void> | void;

  // base payload used by createEntry (service should override id/timestamps)
  const base: Omit<Entry, "id" | "createdAt" | "updatedAt"> = {
    adversity: "Test adversity",
    belief: "Test belief",
    consequence: undefined,
    dispute: undefined,
    energy: undefined,
    dirtySince: null,
    isDeleted: false,
    accountId: null,
  } as const;

  beforeEach(async () => {
    const ctx = await makeMemory();
    db = ctx.adapter;
    clock = ctx.clock;
    cleanup = ctx.cleanup;
    uuid.__reset();
    await db.clear();
  });

  afterEach(async () => {
    await cleanup?.();
  });

  // -------------------- LIST --------------------
  describe("list", () => {
    it("returns empty when DB is empty", async () => {
      const entries = await listEntries(db);
      expect(entries).toHaveLength(0);
    });

    it("returns one item after a single create", async () => {
      await createEntry(db, base, clock);
      const entries = await listEntries(db);
      expect(entries).toHaveLength(1);
      expect(entries[0].id).toBe("mockUUID-0");
    });

    it("returns multiple items sorted by updatedAt DESC", async () => {
      // create 3 entries with advancing clock to ensure ordering
      await createEntry(db, base, clock); // id mocked-0, time T0
      clock.advanceMs(1000);
      await createEntry(db, base, clock); // id mocked-1, time T1
      clock.advanceMs(1000);
      await createEntry(db, base, clock); // id mocked-2, time T2

      const entries = await listEntries(db);
      expect(entries.map((e) => e.id)).toEqual([
        "mockUUID-2",
        "mockUUID-1",
        "mockUUID-0",
      ]);
    });
  });

  // -------------------- CREATE --------------------
  describe("create", () => {
    it("assigns incremental UUIDs and sets timestamps", async () => {
      const t0 = clock.nowIso();
      await createEntry(db, base, clock);
      const all1 = await db.getAll();
      expect(all1).toHaveLength(1);
      expect(all1[0].id).toBe("mockUUID-0");
      expect(all1[0].createdAt).toBe(t0);
      expect(all1[0].updatedAt).toBe(t0);

      clock.advanceMs(500);
      await createEntry(db, base, clock);
      const all2 = await db.getAll();
      expect(all2).toHaveLength(2);
      expect(all2.find((e) => e.id === "mockUUID-1")).toBeTruthy();
    });

    it("does not mutate the caller’s payload", async () => {
      const payload = { ...base };
      await createEntry(db, payload, clock);
      // payload still has no id/timestamps
      expect((payload as any).id).toBeUndefined();
      expect((payload as any).createdAt).toBeUndefined();
      expect((payload as any).updatedAt).toBeUndefined();
    });
  });

  // -------------------- UPDATE --------------------
  describe("update", () => {
    it("throws when id is missing", async () => {
      await expect(updateEntry(db, "nope", { belief: "Z" }, clock)).rejects.toThrow(
        /not found/i
      );
    });

    it("updates fields, bumps updatedAt, sets dirtySince once", async () => {
      // create
      const created = await createEntry(db, base, clock);
      const id = created.id;

      // first update
      clock.advanceMs(1000);
      const u1 = await updateEntry(db, id, { belief: "B2" }, clock);

      expect(u1.belief).toBe("B2");
      expect(u1.createdAt).toBe(created.createdAt);
      expect(u1.updatedAt).toBe(clock.nowIso());
      expect(u1.dirtySince).toBe(clock.nowIso()); // first change → set

      // second update (dirtySince should not change)
      clock.advanceMs(1000);
      const u2 = await updateEntry(db, id, { adversity: "A2" }, clock);
      expect(u2.dirtySince).toBe(u1.dirtySince); // unchanged
      expect(u2.updatedAt).toBe(clock.nowIso());
      expect(u2.adversity).toBe("A2");
    });

    it("empty patch keeps values but still counts as an update (bumps updatedAt, sets dirtySince on first change)", async () => {
      const created = await createEntry(db, base, clock);
      const id = created.id;

      clock.advanceMs(1000);
      const u1 = await updateEntry(db, id, {}, clock); // empty patch considered update

      expect(u1.adversity).toBe(created.adversity);
      expect(u1.updatedAt).toBe(clock.nowIso());
      expect(u1.dirtySince).toBe(clock.nowIso()); // first change → set
    });
  });

  // -------------------- REMOVE --------------------
  describe("remove", () => {
    it("soft-deletes and is idempotent", async () => {
      const { id } = await createEntry(db, base, clock);

      // first remove
      clock.advanceMs(1000);
      await removeEntry(db, id);

      const byId1 = await db.getById(id);
      const list1 = await listEntries(db);
      expect(byId1?.isDeleted).toBe(true);
      expect(byId1?.dirtySince).toBe(clock.nowIso());
      expect(list1.find((e) => e.id === id)).toBeUndefined(); // excluded from list

      // second remove (no throw, same dirtySince)
      const firstDirty = byId1?.dirtySince;
      clock.advanceMs(1000);
      await expect(removeEntry(db, id)).resolves.toBeUndefined();
      const byId2 = await db.getById(id);
      expect(byId2?.dirtySince).toBe(firstDirty);
    });
  });
});
