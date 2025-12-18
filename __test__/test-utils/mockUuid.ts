// No top-level variables!
jest.mock('expo-crypto', () => {
  let counter = 0; // inside factory

  return {
    // sync API (Expo SDK >= 51)
    randomUUID: jest.fn(() => `mockUUID-${counter++}`),

    // test helper
    __reset: () => { counter = 0; },
  };
});
