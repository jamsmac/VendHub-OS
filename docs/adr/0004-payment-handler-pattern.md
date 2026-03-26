# ADR-0004: Payment Integration Handler Pattern

## Status

Accepted

## Date

2025-03-01

## Context

VendHub OS integrates with 3 Uzbekistan payment providers (Payme, Click, Uzum Bank), each with different protocols:
- Payme: JSON-RPC over HTTP with Basic Auth
- Click: REST API with MD5 signature
- Uzum Bank: REST API with HMAC-SHA256 signature

We also need Telegram Stars and cash payment support.

## Decision

Use a **handler delegation pattern** in `PaymentsService`:
- `PaymeHandler` — JSON-RPC protocol, Basic Auth with timing-safe comparison
- `ClickHandler` — REST with MD5 sign verification
- `UzumHandler` — REST with HMAC-SHA256 signature validation
- Each handler implements a common interface for create/confirm/cancel operations
- Webhook security uses `crypto.timingSafeEqual` to prevent timing attacks
- Idempotency via unique transaction constraints with organizationId
- Promo code redemption uses pessimistic locking to prevent race conditions

## Consequences

### Positive

- Clean separation of provider-specific logic
- Easy to add new payment providers (implement handler interface)
- Webhook security hardened against timing attacks
- Idempotency prevents double charges

### Negative

- Each provider has unique edge cases that don't fit neatly into a common interface
- Testing requires mocking each provider's protocol separately

### Risks

- Provider API changes require handler updates — mitigate with integration tests and webhook monitoring
