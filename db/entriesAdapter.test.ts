import { createSqliteEntriesAdapter } from "@/db/entriesAdapter.sqlite";
import { fixedClock } from "@/test-utils/fixedClock";

it("adds and retrieves entries", async () => {
  const db = createSqliteEntriesAdapter(null, fixedClock());
  const entry = {
    id: "123",
    adversity: "Test adversity",
    belief: "Test belief",
    createdAt: "2025-09-11T00:00:00.000Z",
    updatedAt: "2025-09-11T00:00:00.000Z",
    dirtySince: null,
    isDeleted: false,
    accountId: null,
  };
  await db.add(entry);
  const all = await db.getAll();
  expect(all).toHaveLength(1);
  expect(all[0].adversity).toBe("Test adversity");
});

it("marks entry as deleted and sets dirtySince", async () => {
  const clock = fixedClock("2025-09-11T01:00:00.000Z");
  const db = createSqliteEntriesAdapter(null, clock);
  await db.add({
    id: "1",
    adversity: "to delete",
    belief: "belief",
    createdAt: "2025-09-11T00:00:00.000Z",
    updatedAt: "2025-09-11T00:00:00.000Z",
    dirtySince: null,
    isDeleted: false,
    accountId: null,
  });

  await db.remove("1");
  const all = await db.getAll();
  expect(all[0].isDeleted).toBe(true);
  expect(all[0].dirtySince).toBe("2025-09-11T01:00:00.000Z");
  expect(all[0].updatedAt).toBe("2025-09-11T01:00:00.000Z");
});