# On-Call Shift Runbook

## Start of shift (5 min)

1. **Check Sentry** — any unresolved issues from previous shift? Error rate trends?
2. **Check Grafana dashboards**
   - API Overview: p95 latency, error rate, RPS
   - Payments: webhook throughput per provider
   - Machines: reporting vs silent count
3. **Check open incidents** in team channel
4. **Check Dependabot alerts** — any new HIGH/CRITICAL?

## During shift

### If paged

1. Acknowledge the alert
2. Match symptom to runbook (see [README.md](./README.md))
3. Execute runbook
4. Document progress every 15 min during active response

### If proactive finding (not paged)

1. Open GitHub issue describing what you saw
2. Classify: P0 (now), P1 (this week), P2 (backlog)
3. Assign or escalate based on classification

## End of shift

- [ ] Post shift summary — key events, open issues, handoff notes
- [ ] Update runbook if new failure pattern discovered
- [ ] Close resolved incidents

## Key dashboards and tools

| Tool    | Purpose                           |
| ------- | --------------------------------- |
| Sentry  | Errors, regressions               |
| Grafana | Latency, throughput, resource use |
| Railway | Deployments, service health       |
| GitHub  | Recent merges, Dependabot alerts  |

## Emergency contacts

- Primary: Jamshid (jamshidsmac@gmail.com)
- Payment provider support: see team channel pinned messages
- DB provider (Railway Postgres): Railway support chat
