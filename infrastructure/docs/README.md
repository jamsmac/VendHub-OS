# VendHub OS Documentation

This directory contains operational and technical documentation for VendHub OS.

## Available Documents

### 1. [Deployment Runbook](./deployment-runbook.md)

Practical guide for deploying and operating VendHub OS:
- Local development setup
- Docker deployment (dev & prod)
- Database operations (migrations, seeds, backups)
- Kubernetes deployment
- Health checks and monitoring
- Troubleshooting guide
- Environment variables reference
- Performance tuning
- Security checklist
- CI/CD pipeline
- Backup & recovery procedures

**Target audience**: DevOps engineers, System administrators, Backend developers

### 2. [API Modules Reference](./api-modules.md)

Comprehensive documentation of all 55 API modules:
- Module purpose and responsibilities
- Key entities for each module
- Complete endpoint listing with HTTP methods
- Organized by functional area:
  - Core (auth, users, organizations)
  - Vending Machine Operations
  - Inventory & Products
  - Financial
  - Operations & Tasks
  - Customer Engagement
  - B2C Client
  - Integrations & Communications
  - AI & Data
  - Reporting & Analytics
  - System & Security
  - HR & Team Management
  - Reference Data
  - Admin Tools

**Target audience**: Backend developers, Frontend developers, Integration engineers

## Related Documentation

### Project Root Documentation

Located in project root:
- **CLAUDE.md**: Project overview and coding standards
- **MASTER_PROMPT.md**: Comprehensive development guide
- **MIGRATION_PLAN_v4.md**: Migration strategy from VHM24-repo
- **UI_UX_SPECIFICATION.md**: Frontend design specifications

### API Documentation

- **Swagger/OpenAPI**: Available at `/docs` when API is running
- **Interactive API docs**: http://localhost:4000/docs (development)

### Skills Documentation

Specialized AI agent skills in `.claude/commands/`:
- 19 domain-specific code generation tools
- See CLAUDE.md for complete skills listing

## Quick Links

| Resource | Location | Description |
|----------|----------|-------------|
| Swagger UI | /docs | Interactive API documentation |
| Health Check | /health | Basic liveness probe |
| Readiness | /ready | Readiness probe (DB + Redis) |
| Detailed Health | /api/v1/health/detailed | Full component status |
| Metrics | /metrics | Prometheus metrics |
| Queue Dashboard | /admin/queues | BullBoard queue monitoring |

## Getting Help

- **Technical Issues**: See deployment-runbook.md troubleshooting section
- **API Questions**: See api-modules.md or Swagger docs at /docs
- **Code Standards**: See CLAUDE.md in project root
- **Support**: support@vendhub.uz
