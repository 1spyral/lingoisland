const nextJest = require("next/jest");

const createJestConfig = nextJest({ dir: "./" });

module.exports = createJestConfig({
  clearMocks: true,
  coverageProvider: "v8",
  testEnvironment: "node",
});
