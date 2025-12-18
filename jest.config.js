// jest.config.js
module.exports = {
  preset: "jest-expo",
  testMatch: ["**/?(*.)+(test).[tj]s?(x)"],
  transformIgnorePatterns: [
    // FIX: Updated regex to include 'nativewind', 'expo-font', and '@expo/vector-icons'
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|nativewind|expo-sqlite|expo-sqlite-mock)"
  ],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1" },
  setupFilesAfterEnv: [
    "<rootDir>/jest.setup.ts",
    "<rootDir>/__test__/test-utils/mockUuid.ts"
  ],
  testTimeout: 10000,
};