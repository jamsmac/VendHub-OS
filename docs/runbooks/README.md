# VendHub OS Runbooks

Operational playbooks for on-call and incident response.

## When to use which runbook

| Situation                                        | Runbook                                                          |
| ------------------------------------------------ | ---------------------------------------------------------------- |
| Payment webhook failing / orders stuck `pending` | [incident-payment-webhook.md](./incident-payment-webhook.md)     |
| Machine telemetry silence / offline alerts       | [incident-telemetry-silence.md](./incident-telemetry-silence.md) |
| About to deploy to production                    | [deploy.md](./deploy.md)                                         |
| Need to roll back a bad deploy                   | [rollback.md](./rollback.md)                                     |
| On-call shift start — what to check              | [oncall.md](./oncall.md)                                         |

## Escalation

1. Check Sentry — is it a known error class?
2. Check Grafana dashboards — is it a traffic spike / DB saturation?
3. Runbook specific to the symptom
4. If none match — escalate to @jamsmac

## Contact

Primary on-call: Jamshid (jamshidsmac@gmail.com)
