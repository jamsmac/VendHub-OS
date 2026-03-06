# ADR-0004: JWT with TOTP Authentication

## Status: Accepted

## Date: 2024-12-01

## Context

VendHub OS needs a stateless authentication mechanism that scales across distributed services while supporting two-factor authentication (2FA) for enhanced security, especially for administrative accounts.

## Decision

Implement JWT (JSON Web Tokens) for stateless authentication with TOTP (Time-based One-Time Password) for optional two-factor authentication.

## Consequences

- Stateless authentication enables horizontal scaling without session storage
- JWT refresh tokens allow secure token rotation without user re-login
- TOTP is algorithm-agnostic and works with standard authenticator apps
- No server-side token revocation on logout (mitigated with blocklist in Redis)
- Client must securely store JWT tokens to prevent XSS attacks
- TOTP recovery codes must be securely stored by users
- Enables seamless mobile and SPA authentication flows
