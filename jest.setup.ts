// jest.setup.ts
// (optional) one db per worker so tests don't clash
// let the mock wire itself up
import "expo-sqlite-mock/src/setup";

process.env.EXPO_SQLITE_MOCK = `${__dirname}/test_${process.env.JEST_WORKER_ID}.db`;
