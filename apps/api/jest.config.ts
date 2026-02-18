import type { Config } from "jest";

const config: Config = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.(t|j)s$": "ts-jest",
  },
  collectCoverageFrom: ["src/**/*.(t|j)s", "!src/**/*.spec.ts", "!src/main.ts"],
  coverageDirectory: "./coverage",
  testEnvironment: "node",
  moduleNameMapper: {
    "^src/(.*)$": "<rootDir>/src/$1",
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@modules/(.*)$": "<rootDir>/src/modules/$1",
    "^@common/(.*)$": "<rootDir>/src/common/$1",
    "^@config/(.*)$": "<rootDir>/src/config/$1",
    "^@database/(.*)$": "<rootDir>/src/database/$1",
    // Allow jest.mock() to work for optional peer dependencies
    "^@aws-sdk/client-s3$":
      "<rootDir>/src/modules/storage/__mocks__/aws-sdk-s3.ts",
    "^@aws-sdk/s3-request-presigner$":
      "<rootDir>/src/modules/storage/__mocks__/aws-sdk-presigner.ts",
  },
};

export default config;
