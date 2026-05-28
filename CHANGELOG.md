# Changelog — food-blog-server

## [Unreleased]

### 2026-05-26 — Cloudinary photo uploads

- `POST /api/uploads/sign` — JWT; returns signed upload params for direct browser upload.
- Review `imageUrls` validated as URLs (HTTPS).
- Dependency: `cloudinary`.

### 2026-05-26 — Review tag inputs (cuisines + food types)

- Added `foodTypeTags: string[]` to review create payload + DTO.

### 2026-05-25 — Review list APIs

- `GET /api/reviews` — `sort=latest|popular`, paginated (`page`, `limit`).
- `GET /api/reviews/me` — JWT; paginated reviews for the signed-in user.

### 2026-05-22 — Create review API

- `Review` Prisma model (`ServiceType`, `PriceCurrency` enums).
- `POST /api/reviews` — JWT required; Zod validation; returns `{ review }` (201).
- `GET /api/reviews/:id` — public detail.
- Server computes `totalAmount`, normalizes meals/nutrition, sets `excerpt` from body.

**Areas:** `prisma/schema.prisma`, `src/modules/reviews/`, `src/index.ts`, SERVER.md.

### 2026-05-24 — Google auth MVP + scaffold

- Express 5 + TypeScript + Prisma + PostgreSQL scaffold.
- `GET /api/health`, `POST /api/auth/google`, `GET /api/auth/me`, `POST /api/auth/logout`.
- User model (Google upsert). SERVER.md, README, CHANGELOG added.

**Areas:** `src/`, `prisma/schema.prisma`, docs.
