import type { Config } from "jest";

const config: Config = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.(t|j)s$": ["ts-jest", { tsconfig: "tsconfig.spec.json" }],
  },
  collectCoverageFrom: ["src/**/*.(t|j)s", "!src/**/*.spec.ts", "!src/main.ts"],
  coverageDirectory: "./coverage",
  coverageThreshold: {
    global: {
      statements: 55,
      branches: 42,
      functions: 50,
      lines: 56,
    },
    "./src/modules/auth/": {
      statements: 34,
      branches: 16,
      functions: 39,
      lines: 33,
    },
    "./src/modules/payments/": {
      statements: 35,
      branches: 16,
      functions: 44,
      lines: 34,
    },
    "./src/modules/organizations/": {
      statements: 42,
      branches: 28,
      functions: 27,
      lines: 42,
    },
  },
  testEnvironment: "node",
  transformIgnorePatterns: [
    "node_modules/(?!(string-width|strip-ansi|ansi-regex|char-regex|emoji-regex|boxen|camelcase|chalk|cli-boxes|widest-line|wrap-ansi|ansi-styles|is-fullwidth-code-point|get-east-asian-width)/)",
  ],
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
