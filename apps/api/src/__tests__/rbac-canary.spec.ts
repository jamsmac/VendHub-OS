/**
 * RBAC Canary Test
 *
 * Scans all controller files and verifies that every HTTP handler method
 * has either @Public() or @Roles() decorator. Routes without explicit
 * access decisions are silent security vulnerabilities — JwtAuthGuard
 * protects them, but without @Roles() any authenticated user can access.
 *
 * This is a static analysis test (no DI bootstrap needed).
 */

import * as fs from "fs";
import * as path from "path";

const MODULES_DIR = path.resolve(__dirname, "../modules");
const HTTP_DECORATOR_RE = /@(Get|Post|Put|Patch|Delete|All|Head|Options)\s*\(/;
const ROLES_RE = /@Roles\s*\(/;
const PUBLIC_RE = /@Public\s*\(/;
const METHOD_NAME_RE =
  /(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*\S+)?\s*\{|(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{/;

interface Violation {
  file: string;
  method: string;
  line: number;
}

function findControllerFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findControllerFiles(fullPath));
    } else if (
      entry.name.endsWith(".controller.ts") &&
      !entry.name.endsWith(".spec.ts")
    ) {
      files.push(fullPath);
    }
  }
  return files;
}

function scanController(filePath: string): Violation[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const violations: Violation[] = [];
  const relativePath = path.relative(MODULES_DIR, filePath);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!HTTP_DECORATOR_RE.test(line)) continue;

    const contextStart = Math.max(0, i - 25);
    const contextEnd = Math.min(lines.length, i + 25);
    const contextLines = lines.slice(contextStart, contextEnd).join("\n");

    const hasRoles = ROLES_RE.test(contextLines);
    const hasPublic = PUBLIC_RE.test(contextLines);

    if (hasRoles || hasPublic) continue;

    const classLevelStart = content.substring(0, content.indexOf(line));
    const classDecoratorMatch = classLevelStart.match(
      /(?:@Roles\s*\([^)]*\)|@Public\s*\()[\s\S]*?class\s+\w+/g,
    );
    if (classDecoratorMatch) {
      const lastMatch = classDecoratorMatch[classDecoratorMatch.length - 1];
      if (lastMatch) {
        const hasClassRoles = ROLES_RE.test(lastMatch);
        const hasClassPublic = PUBLIC_RE.test(lastMatch);
        if (hasClassRoles || hasClassPublic) continue;
      }
    }

    let methodName = "unknown";
    for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
      const match = lines[j].match(METHOD_NAME_RE);
      if (match) {
        methodName = match[1] || match[2] || "unknown";
        break;
      }
    }

    violations.push({
      file: relativePath,
      method: methodName,
      line: i + 1,
    });
  }

  return violations;
}

describe("RBAC canary — every route must have explicit access decision", () => {
  it("all HTTP handlers have @Public() or @Roles() decorator", () => {
    const controllerFiles = findControllerFiles(MODULES_DIR);
    expect(controllerFiles.length).toBeGreaterThan(0);

    const allViolations: Violation[] = [];
    for (const file of controllerFiles) {
      allViolations.push(...scanController(file));
    }

    if (allViolations.length > 0) {
      const report = allViolations
        .map((v) => `  ${v.file}:${v.line} → ${v.method}()`)
        .join("\n");

      console.error(
        `\nRBAC violations (${allViolations.length} routes without @Public() or @Roles()):\n${report}\n`,
      );
    }

    expect(allViolations).toHaveLength(0);
  });

  it("scans a meaningful number of controllers", () => {
    const controllerFiles = findControllerFiles(MODULES_DIR);
    expect(controllerFiles.length).toBeGreaterThan(20);
  });
});
