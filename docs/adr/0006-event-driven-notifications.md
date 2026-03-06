# ADR-0006: Event-Driven Notifications System

## Status: Accepted

## Date: 2024-12-01

## Context

VendHub OS must deliver notifications through multiple channels (SMS, Email, Push, Telegram) reliably and asynchronously without blocking primary business operations. An event-driven architecture decouples notification generation from delivery.

## Decision

Use EventEmitter for in-process events and BullMQ for asynchronous job queuing to deliver notifications through pluggable providers (SMS, Email, Web Push, Telegram).

## Consequences

- Notifications are sent asynchronously, preventing request timeouts
- Failed deliveries can be retried with exponential backoff
- Multiple notification channels can be configured independently
- Event emitter has a learning curve for developers unfamiliar with the pattern
- Redis dependency for BullMQ queue persistence
- Notification templates support variable interpolation for dynamic content
- Enables audit trail of all notification attempts for compliance
