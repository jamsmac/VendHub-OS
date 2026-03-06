# ADR-0003: Next.js with Shadcn UI

## Status: Accepted

## Date: 2024-12-01

## Context

VendHub OS requires a modern web frontend for the admin dashboard that combines server-side rendering, static generation, and client-side interactivity while maintaining consistent design patterns across pages.

## Decision

Use Next.js for the web application framework with Shadcn UI as the component library built on Radix UI and Tailwind CSS.

## Consequences

- Server components improve performance by reducing JavaScript sent to browsers
- Shadcn UI components are copy-pasted, allowing full customization without dependency updates
- Tailwind CSS enables rapid UI development with utility-first styling
- App Router provides modern file-based routing with route groups and layouts
- API routes allow backend-like functionality without separate service deployment
- Large bundle size requires careful code splitting and dynamic imports
- CSS-in-JS alternatives are limited, tying styling tightly to Tailwind
