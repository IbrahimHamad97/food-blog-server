# Food Blog — Server spec

**Source of truth for the API (`food-blog-server`).** Any agent or contributor working on the backend should read this file first.

- **Scope, endpoints, and progress** live here.
- **Every feature or meaningful change** must update this file, [CHANGELOG.md](./CHANGELOG.md), and the client [PROJECT.md](../food-blog-client/PROJECT.md) when behavior crosses the boundary.
- Public onboarding: [README.md](./README.md).

---

## Vision

Separate Express API for auth, reviews, and collections. The Angular app (`food-blog-client`) calls this service over HTTP. Google-only sign-in — no passwords stored.

## Tech stack

| Layer | Choice |
| ----- | ------ |
| Runtime | Node 20+ |
| Framework | Express 5 |
| Language | TypeScript (ESM) |
| ORM | Prisma |
| Database | PostgreSQL |
| Auth | Google ID token → verify → JWT session |
| Validation | Zod |

## Repo layout

```
food-blog-server/
├── src/
│   ├── index.ts              # App entry, middleware, route mount
│   ├── config/env.ts         # Env validation
│   ├── lib/                  # prisma, google, jwt
│   ├── middleware/           # auth, errors
│   └── modules/
│       ├── auth/             # Google sign-in routes
│       └── reviews/          # Review create (POST)
├── prisma/schema.prisma
├── SERVER.md                 # This file
├── README.md
└── CHANGELOG.md
```

## Feature checklist

Status: `[ ]` planned · `[~]` in progress · `[x]` done

| # | Feature | Status |
| - | ------- | ------ |
| 1 | Scaffold Express + TypeScript + Prisma | [x] |
| 2 | `GET /api/health` | [x] |
| 3 | `POST /api/auth/google` | [x] |
| 4 | `GET /api/auth/me` | [x] |
| 5 | `POST /api/auth/logout` | [x] |
| 6 | Reviews CRUD | [~] list, me, create, GET, PATCH, DELETE by id |
| 7 | Cloudinary photo uploads | [x] signed direct upload from client |
| 8 | Collections CRUD | [ ] |

## Auth flow (MVP)

1. Angular loads Google Identity Services on `/sign-in`.
2. User completes Google sign-in → client receives **ID token** (`credential`).
3. `POST /api/auth/google` with `{ "idToken": "..." }`.
4. Server verifies token with Google, upserts `User`, returns `{ token, user }`.
5. Client stores JWT in `localStorage`; sends `Authorization: Bearer <token>` on API calls.
6. `GET /api/auth/me` restores session on page load.
7. `POST /api/auth/logout` — client clears token (JWT is stateless).

## API contract

Base URL: `http://localhost:3000/api` (dev).

| Method | Path | Auth | Body / response |
| ------ | ---- | ---- | ---------------- |
| GET | `/health` | — | `{ ok: true, service }` |
| POST | `/auth/google` | — | Body: `{ idToken }` → `{ token, user }` |
| GET | `/auth/me` | Bearer JWT | `{ user }` |
| POST | `/auth/logout` | Bearer JWT | `{ ok: true }` |
| GET | `/reviews` | — | Query: `sort=latest\|popular`, `page`, `limit` → `{ reviews, pagination }` |
| GET | `/reviews/me` | Bearer JWT | Query: `page`, `limit` (default 12) → user's reviews |
| GET | `/reviews/:id` | — | `{ review }` or 404 |
| POST | `/reviews` | Bearer JWT | Body: create review → `{ review }` (201) |
| PATCH | `/reviews/:id` | Bearer JWT (owner) | Body: same as create → `{ review }` |
| DELETE | `/reviews/:id` | Bearer JWT (owner) | `{ ok: true }` |
| POST | `/uploads/sign` | Bearer JWT | `{ cloudName, apiKey, timestamp, signature, folder }` |

### Photo uploads (Cloudinary)

1. Client `POST /api/uploads/sign` (JWT) → short-lived signature.
2. Client `POST https://api.cloudinary.com/v1_1/{cloudName}/image/upload` with `file`, `api_key`, `timestamp`, `signature`, `folder`, `max_file_size`.
3. Cloudinary returns `secure_url`; client sends that URL in `imageUrls` when creating a review.

Secrets (`CLOUDINARY_API_SECRET`) never leave the server. Folder default: `food-blog/reviews`.

### Create review (POST `/reviews`)

Requires `Authorization: Bearer <jwt>`. Body matches client `CreateReviewInput`:

```json
{
  "title": "Neapolitan pie with a perfect char",
  "body": "Soft center, blistered crust…",
  "placeName": "Via Roma Pizzeria",
  "serviceType": "dine_in",
  "partySize": 4,
  "meals": [
    { "name": "Margherita pizza", "quantity": 1, "price": 18.5, "notes": "Shared" }
  ],
  "nutrition": { "calories": "920", "protein": "38g" },
  "currency": "USD",
  "rating": 5,
  "cuisineTags": ["Italian", "Pizza"],
  "foodTypeTags": ["Pizza"],
  "imageUrls": ["https://images.unsplash.com/photo-…"]
}
```

Validation: at least one meal, rating 1–5, at least one photo URL (max 5, valid HTTPS URLs), `partySize` optional. Server computes `totalAmount` from priced meals and sets `excerpt` from `body`.

Response `{ review }` matches client `Review` DTO (`publishedAt` = `createdAt`, `author` embedded, `likeCount` starts at 0).

### User object (DTO)

```json
{
  "id": "cuid",
  "email": "user@gmail.com",
  "name": "Jane",
  "avatarUrl": "https://..."
}
```

## Data model (Prisma)

- **User** — `id`, `googleId`, `email`, `name`, `avatarUrl`, `createdAt`
- **Review** — `userId`, `title`, `excerpt`, `body`, `placeName`, `serviceType` (`dine_in` | `delivery`), `partySize`, `meals` (JSON), `nutrition` (JSON), `currency` (`USD` | `QAR`), `totalAmount`, `rating`, `cuisineTags[]`, `foodTypeTags[]`, `imageUrls[]`, `likeCount`, `createdAt`, `updatedAt`
- **Collection** — planned; see client PROJECT.md

## Environment

| Variable | Purpose |
| -------- | ------- |
| `DATABASE_URL` | PostgreSQL connection string |
| `GOOGLE_CLIENT_ID` | OAuth Web client ID (same as Angular) |
| `JWT_SECRET` | Signs session tokens (min 8 chars) |
| `CORS_ORIGIN` | Angular dev URL (`http://localhost:4200`) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret (server only) |
| `CLOUDINARY_UPLOAD_FOLDER` | Upload folder prefix (default `food-blog/reviews`) |
| `PORT` | Default `3000` |

## Code documentation standard

Same spirit as the Angular client:

- File header: what the file does
- JSDoc on exported functions and non-obvious middleware
- Update this file + CHANGELOG per feature slice

## Decisions log

| Date | Decision | Rationale |
| ---- | -------- | --------- |
| 2026-05-24 | Folder name `food-blog-server` | Matches repo; client PROJECT previously said `food-blog-api` |
| 2026-05-24 | JWT in localStorage (v1) | Simple; client sends Bearer header |
| 2026-05-24 | Google-only auth | No password storage or reset flows |
| 2026-05-24 | Stateless logout | Client deletes JWT; no server session store yet |
| 2026-05-22 | Review create via POST | JWT owner; Zod validation; server computes totalAmount |

## Out of scope (for now)

- Refresh tokens / token rotation
- httpOnly cookie sessions
- Email/password auth
- Rate limiting
