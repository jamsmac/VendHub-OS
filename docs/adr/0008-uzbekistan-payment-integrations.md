# ADR-0008: Uzbekistan Payment Integrations

## Status: Accepted

## Date: 2024-12-01

## Context

VendHub OS operates in Uzbekistan market where specific payment providers (Payme, Click, Uzum) dominate. These providers have unique APIs, settlement schedules, and compliance requirements.

## Decision

Implement integration with three major Uzbek payment providers: Payme, Click, and Uzum. Each provider has a dedicated integration service with adapter pattern for switching.

## Consequences

- Payment processing follows Uzbek tax (0-15%) and regulatory requirements
- Each provider has different webhook formats and settlement timelines
- Payme uses callback-based confirmation (Perform operation), Click uses redirect
- Uzum integration handles both payment and user data securely
- Transaction status reconciliation required due to provider inconsistencies
- Merchant IDs and API keys must be securely rotated and stored
- Enables multi-provider strategy for redundancy and market coverage
- Compliance with Uzbek OFD (fiscal data) reporting is required
