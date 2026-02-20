# VendHub OS Documentation

## Quick Start for Claude/Cursor

### 1. First, read the rules
```
.clinerules
```

### 2. Check current task
```
docs/current-task.md
```

### 3. Reference architecture
```
docs/architecture.md
```

---

## Documentation Structure

```
docs/
├── README.md              ← You are here
├── architecture.md        ← System overview, apps, patterns
├── api-patterns.md        ← API client, hooks, components
├── ui-components.md       ← shadcn/ui usage guide
├── database-schema.md     ← Database entities overview
├── current-task.md        ← CURRENT TASK (update frequently)
│
├── specs/                 ← Detailed page specifications
│   ├── trips-page-spec.md
│   └── directories-page-spec.md
│
└── prompts/               ← Reusable prompt templates
    └── generate-page.md
```

---

## Key Files by Task

### Creating New Frontend Page
1. `docs/specs/{page}-spec.md` - detailed specification
2. `docs/ui-components.md` - available components
3. `docs/api-patterns.md` - hooks and API patterns
4. `docs/prompts/generate-page.md` - prompt template

### Fixing TypeScript Errors
1. `.clinerules` - naming conventions
2. `packages/shared/src/types/` - shared types

### Creating API Endpoint
1. `docs/architecture.md` - API module structure
2. `apps/api/src/modules/` - existing modules as examples

### Understanding Database
1. `docs/database-schema.md` - schema overview
2. `apps/api/src/modules/*/entities/` - entity files

---

## Current Status

| Module | Backend | Frontend | Status |
|--------|---------|----------|--------|
| Auth | ✅ 100% | ✅ 100% | Done |
| Machines | ✅ 100% | ✅ 100% | Done |
| Products | ✅ 100% | ✅ 100% | Done |
| Tasks | ✅ 100% | ✅ 100% | Done |
| **Trips** | ✅ 100% | ❌ 0% | **← Current** |
| **Routes** | ✅ 100% | ❌ 0% | Next |
| **Directories** | ✅ 100% | ❌ 0% | Next |

---

## Workflow

### For Claude/Cursor
1. Read `.clinerules` + `docs/current-task.md`
2. Read relevant spec in `docs/specs/`
3. Follow patterns in `docs/api-patterns.md`
4. Generate code matching existing style

### For Human
1. Update `docs/current-task.md` with next task
2. Create spec in `docs/specs/` if needed
3. Ask Claude to implement
4. Review and commit

---

## Commands

### Run API
```bash
cd apps/api && npm run dev
```

### Run Web
```bash
cd apps/web && npm run dev
```

### Run All
```bash
npm run dev
```

### TypeScript Check
```bash
npm run typecheck
```

### Lint
```bash
npm run lint
```
