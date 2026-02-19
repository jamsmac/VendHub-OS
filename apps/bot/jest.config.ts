import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  moduleNameMapper: {
    "^@vendhub/shared/utils$":
      "<rootDir>/../../packages/shared/src/utils/index.ts",
  },
  transform: {
    "^.+\\.ts$": ["ts-jest", { diagnostics: { ignoreCodes: [151002] } }],
  },
};

export default config;
