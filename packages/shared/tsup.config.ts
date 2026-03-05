import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "types/index": "src/types/index.ts",
    "constants/index": "src/constants/index.ts",
    "utils/index": "src/utils/index.ts",
  },
  format: ["cjs", "esm"],
  tsconfig: "tsconfig.build.json",
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  // treeshake removed: with multiple entry points tsup eliminates barrel
  // re-exports (export * from './types') from dist/index.d.ts because the
  // bundler treats them as redundant — types/index is already its own entry.
  // This caused UserRole and all domain types to be missing from the root
  // package import (@vendhub/shared), breaking apps/web and apps/api.
});
