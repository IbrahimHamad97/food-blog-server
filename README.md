# Food Blog Server

Express + TypeScript API for the [food blog client](../food-blog-client). Internal spec and progress: [SERVER.md](./SERVER.md).

## Prerequisites

- Node.js 20+
- PostgreSQL (local or Docker)

## Quick start

### 1. PostgreSQL (Docker example)

```bash
docker run -d --name foodblog-db -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=foodblog \
  postgres:16
```

### 2. Install and configure

```bash
cd food-blog-server
npm install
```

Create a local `.env` file (not committed to Git):

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/foodblog
GOOGLE_CLIENT_ID=your-google-web-client-id
JWT_SECRET=your-long-random-secret
CORS_ORIGIN=http://localhost:4200
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLOUDINARY_UPLOAD_FOLDER=food-blog/reviews
PORT=3000
```

See [SERVER.md](./SERVER.md) for variable descriptions.

### 3. Database

```bash
npm run db:push
npm run db:generate
```

### 4. Run API

```bash
npm run dev
```

API: `http://localhost:3000/api/health`

## Scripts

| Script | Description |
| ------ | ----------- |
| `npm run dev` | Dev server with hot reload (`tsx watch`) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled server |
| `npm run db:push` | Apply Prisma schema to DB |
| `npm run db:migrate` | Create migration (production workflow) |

## Google OAuth setup

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Create **OAuth 2.0 Client ID** → Web application
3. Authorized JavaScript origins: `http://localhost:4200`
4. Copy Client ID into `.env` (`GOOGLE_CLIENT_ID`) and Angular `environment.ts`

## Related docs

- [SERVER.md](./SERVER.md) — source of truth for API features
- [CHANGELOG.md](./CHANGELOG.md) — shipped changes
- [../food-blog-client/PROJECT.md](../food-blog-client/PROJECT.md) — full product spec
