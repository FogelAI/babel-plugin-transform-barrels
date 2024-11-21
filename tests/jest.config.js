module.exports = {
  verbose: true,
  roots: ["<rootDir>"],
  testMatch: [
    "<rootDir>/**/__tests__/**/*.{js,jsx,ts,tsx}",
    "<rootDir>/**/*.{spec,test}.{js,jsx,ts,tsx}",
  ],
  testPathIgnorePatterns: [
    "/node_modules/",
    "<rootDir>/nextjs/",
    "<rootDir>/react-native-app/",
  ],
};
