## Summary

<!-- What changed in 1-2 sentences. Focus on "why", not "what". -->

## Changes

<!-- Bullet list of concrete changes. One bullet per logical unit. -->

-
-
-

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests pass locally (`pnpm turbo test`)
- [ ] Type-check passes (`pnpm turbo type-check`)
- [ ] Manual smoke on staging (if user-facing)

## Security

- [ ] No secrets committed (.env, keys, tokens)
- [ ] No new dependencies with known CVEs (`pnpm audit`)
- [ ] RBAC: new routes have `@Roles()` OR explicit `@Public()` decorator
- [ ] Input validation on all new endpoints (DTO + class-validator)
- [ ] Tenant isolation: all queries scope by `organizationId`

## Documentation

- [ ] README/ARCHITECTURE updated if behaviour changed
- [ ] OpenAPI regenerated if API surface changed
- [ ] Runbook updated if operational impact (new cron, new integration, new alert)
- [ ] CLAUDE.md updated if new rule/convention introduced

## Rollout

- [ ] Breaking changes documented with migration path
- [ ] Feature flag used if risk is non-trivial
- [ ] Env vars added to `.env.example` and deployment config

## Screenshots / Recordings

<!-- For UI changes. Paste before/after. -->

## Related Issues

<!-- Closes #NN, Relates to #NN -->
