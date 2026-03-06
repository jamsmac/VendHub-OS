import { DataSource } from "typeorm";
import { SnakeNamingStrategy } from "typeorm-naming-strategies";
import * as fs from "fs";
import * as path from "path";

function findEntities(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findEntities(full));
    else if (entry.name.endsWith(".entity.ts")) results.push(full);
  }
  return results;
}

async function main() {
  const srcDir = path.join(__dirname, "src/modules");
  const allFiles = findEntities(srcDir);

  // Find tables per file
  const tableToFile = new Map<string, string>();
  const skipFiles = new Set<string>();

  for (const f of allFiles) {
    const content = fs.readFileSync(f, "utf8");
    const matches = [...content.matchAll(/@Entity\(['"]([^'"]+)['"]\)/g)];
    const tables = matches.map((m) => m[1]);

    let hasUnique = false;
    for (const t of tables) {
      if (!tableToFile.has(t)) {
        tableToFile.set(t, f);
        hasUnique = true;
      }
    }
    // If ALL entities in this file are duplicates, skip the file
    if (tables.length > 0 && !hasUnique) {
      skipFiles.add(f);
    }
  }

  const entityFiles = allFiles.filter((f) => !skipFiles.has(f));
  // Also add base entity
  entityFiles.push(path.join(__dirname, "src/common/entities/base.entity.ts"));

  console.log(
    `Total files: ${allFiles.length}, Using: ${entityFiles.length}, Skipped: ${skipFiles.size}`,
  );
  skipFiles.forEach((f) => console.log("  Skip:", f.split("modules/")[1]));

  const ds = new DataSource({
    type: "postgres",
    url: process.env.DATABASE_URL,
    ssl: false,
    namingStrategy: new SnakeNamingStrategy(),
    entities: entityFiles,
    synchronize: true,
    migrationsRun: false,
    logging: ["error"],
  });

  await ds.initialize();
  console.log("Schema synchronized successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
