// jest.config.js
module.exports = {
  preset: "jest-expo",
  testMatch: ["**/?(*.)+(test).[tj]s?(x)"],
  transformIgnorePatterns: [
    // Allowlist ESM packages from node_modules so Babel transpiles them
    "node_modules/(?!(?:@react-native|react-native|react-native-.*"
      + "|expo|expo-asset|expo-constants|expo-file-system|expo-sqlite"
      + "|expo-sqlite-mock"              // 👈 add this
      + "|expo-modules-core|@expo/.*|@react-native/.*)/)"
  ],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1" },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],  // 👈 use a local setup file
  testTimeout: 10000,
};
