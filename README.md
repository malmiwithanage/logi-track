# Logi Track

Logi Track is a multi-tenant logistics tracking API built with NestJS, PostgreSQL, Prisma, Redis, BullMQ, and Supabase Storage.

It demonstrates a modular backend architecture for organizations that need to manage branches, users, shipment records, and asynchronous CSV exports while keeping tenant and branch data isolated.

## Project Highlights

- JWT authentication with bcrypt password hashing
- Database-backed logout and JWT revocation
- Tenant and branch-aware authorization
- Role-based access control for export operations
- Prisma-based PostgreSQL data model
- Background CSV generation with BullMQ and Redis
- Private Supabase Storage with short-lived signed download URLs
- Swagger/OpenAPI documentation
- TypeScript, strict compilation, and automated linting

## Architecture

```text
Client
	|
	v
NestJS HTTP API
	|
	+-- JWT authentication
	+-- Tenant and branch validation
	+-- Role authorization
	|
	v
Application services
	|
	+-- Prisma -> PostgreSQL
	+-- BullMQ -> Redis -> Export worker
	|
	+-- Supabase Storage
	+-- 10-minute signed download URL
```

The project is a modular monolith. Authentication, shipments, exports, and database access have separate module boundaries, while the application remains straightforward to deploy and operate. This is appropriate for the current domain and leaves room to extract independently scaling services later.

## Modules

```text
src/
	auth/       Login, logout, JWT strategy, password verification
	shipments/  Tenant and branch-scoped shipment queries
	exports/    Export API, queue integration, and worker
	prisma/     Prisma service and tenant-scoped client extension
	common/     Tenant, role, and request-context guards/decorators
```

## Authentication and Authorization

### Login

`POST /auth/login` verifies the email and bcrypt password hash, then returns a JWT containing:

- User ID
- Email
- Tenant ID
- Branch ID
- Role
- Unique token ID (`jti`)

Access tokens currently expire after eight hours.

### Logout

`POST /auth/logout` requires a valid bearer token. The token's `jti` is stored in the `RevokedToken` table until its expiry time. The JWT strategy checks this table on later requests and rejects revoked tokens.

This makes logout effective even though the API uses stateless JWT authentication.

### Roles

The application defines three roles:

| Role | Shipment access | Create exports | Read/download exports |
| --- | --- | --- | --- |
| `ADMIN` | Yes | Yes | Yes |
| `MANAGER` | Yes | Yes | Yes |
| `VIEWER` | Yes | No | Yes |

## Multi-Tenant Data Isolation

Each user belongs to one tenant and one branch. Shipment trips and export jobs also store both `tenantId` and `branchId`.

The isolation flow is:

1. `AuthGuard('jwt')` verifies the token signature and expiry.
2. `JwtStrategy` rejects malformed or revoked tokens.
3. `TenantGuard` validates that the user's branch belongs to the user's tenant.
4. Request services receive tenant context from the authenticated user, not from client-supplied tenant IDs.
5. The scoped Prisma client automatically adds the authenticated `tenantId` to tenant-aware queries.
6. Services add the authenticated `branchId` where branch-level isolation is required.

For example, a user from Acme North cannot request Acme South or Global Freight data by changing a URL parameter. The query context comes from the validated JWT.

### Current security boundary

The primary isolation mechanism is application-level authorization. Code that handles tenant data must use the scoped Prisma client and explicit branch filters.

PostgreSQL Row-Level Security is a planned defense-in-depth improvement. It would protect the data even if an unsafe raw Prisma query were introduced later.

## Shipment API

```http
GET /shipments
Authorization: Bearer <access-token>
```

Returns the latest 100 shipment records for the authenticated tenant and branch.

## Export Workflow

### 1. Queue an export

```http
POST /exports/shipments
Authorization: Bearer <access-token>
```

Only administrators and managers can create exports. The API creates a tenant- and branch-scoped `ExportJob`, then places a job on the BullMQ queue.

### 2. Generate the CSV in a worker

The worker:

1. Loads shipments for the job's tenant and branch.
2. Converts them to CSV.
3. Uploads the file to private Supabase Storage.
4. Stores only the internal storage path in PostgreSQL.
5. Marks the job as `COMPLETED` or `FAILED`.

Files are stored under a path like:

```text
tenant-id/branch-id/shipments-export-id.csv
```

### 3. Check status

```http
GET /exports/:id/status
Authorization: Bearer <access-token>
```

The status query is filtered by tenant and branch. A user cannot use an export ID from another tenant or branch.

### 4. Download securely

```http
GET /exports/:id/download
Authorization: Bearer <access-token>
```

The endpoint verifies the export's tenant, branch, and completed status before creating a Supabase signed URL valid for 10 minutes. Signed URLs are generated on demand and are not stored in the database or returned by the status endpoint.

## Data Model

The Prisma schema contains:

- `Tenant`: customer organization
- `Branch`: operational branch belonging to a tenant
- `User`: authenticated user with tenant, branch, and role
- `ShipmentTrip`: shipment and delivery tracking data
- `ExportJob`: asynchronous export state and internal file path
- `RevokedToken`: logged-out JWT identifiers and expiry times

Important relationships are enforced with PostgreSQL foreign keys. Indexes support tenant, branch, creation date, status, and export lookup queries.

## Technology Choices

### NestJS and TypeScript

NestJS provides modules, dependency injection, guards, decorators, and a structure suitable for a business API. TypeScript adds compile-time safety and improves Prisma integration.

### PostgreSQL and Prisma

The data is relational: tenants contain branches, users belong to branches, and shipments and exports belong to both tenants and branches. PostgreSQL provides foreign keys, transactions, indexes, and a future path to Row-Level Security. Prisma provides typed queries and migration management.

### JWT authentication

JWTs work well for a REST API and multiple application instances. Because JWTs are normally valid until expiry, the project adds a revocation table so logout can invalidate the current token.

### Redis and BullMQ

CSV generation can be slow and memory-intensive for large datasets. BullMQ moves that work outside the HTTP request, supports retries and backoff, and lets the API remain responsive.

### Supabase Storage

Object storage is better suited to generated files than PostgreSQL or a local container filesystem. Private storage plus short-lived signed URLs avoids exposing permanent public file links.

### Why a modular monolith

Separate microservices would add network calls, deployment overhead, distributed failure modes, and more operational complexity than this project currently needs. The modular monolith keeps boundaries clear while making local development and deployment simpler.

## Local Setup

### Requirements

- Node.js 24 or later
- npm
- PostgreSQL or Supabase PostgreSQL
- Redis-compatible service for BullMQ
- Supabase Storage bucket for exports

### Install dependencies

```bash
npm install
```

### Environment variables

Create a `.env` file. Never commit it or expose its values in documentation.

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
JWT_SECRET="use-a-long-random-secret"
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-server-only-key"
SUPABASE_BUCKET="exports"
REDIS_HOST="..."
REDIS_PORT="6379"
REDIS_PASSWORD="..."
REDIS_TLS="true"
PORT="3000"
```

`DATABASE_URL` can use a connection pooler for normal application traffic. Prisma migrations should use `DIRECT_URL`, a direct PostgreSQL connection, because migration advisory locks can time out through a transaction pooler.

If a database password contains URL-reserved characters such as `@`, encode them before placing the password in the connection string. For example, `@` becomes `%40`.

### Database commands

Generate the Prisma client:

```bash
npx prisma generate
```

Apply migrations:

```bash
npx prisma migrate deploy
```

For local development, seed the database when appropriate:

```bash
npx prisma db seed
```

The seed script creates sample tenants, branches, users, and shipment records. It clears existing seed data first, so do not run it against a database containing data you need to preserve.

### Run the API

Development mode:

```bash
npm run start:dev
```

Production build and start:

```bash
npm run build
npm run start:prod
```

API documentation:

```text
http://localhost:3000/docs
http://localhost:3000/docs-json
```

## Validation Commands

```bash
npm run build
npm run lint
npm test
npm run test:e2e
```

The current lint output contains an existing non-blocking warning in `src/shipments/shipments.service.ts` about an unnecessary object spread.

## Production Improvements

The current implementation is a strong demonstration foundation. The next improvements would be:

1. Add PostgreSQL Row-Level Security for defense in depth.
2. Use short-lived access tokens with rotating refresh tokens.
3. Add scheduled cleanup for expired `RevokedToken` rows.
4. Revalidate user membership when branches or roles change.
5. Add tests for cross-tenant, cross-branch, role, logout, and download authorization.
6. Add rate limiting for login, export creation, and download URL generation.
7. Add audit logs for login, logout, exports, downloads, and authorization failures.
8. Add export retention policies and automatic storage cleanup.
9. Add compound database constraints to guarantee tenant and branch consistency.
10. Update API responses with explicit DTOs and consistent error formats.

## Highlight Points

This project demonstrates several backend design decisions:

- Authorization context comes from validated identity claims rather than request parameters.
- Tenant filtering is centralized through a Prisma extension to reduce accidental data leaks.
- Branch filtering is explicit at the service boundary because branch access is narrower than tenant access.
- Long-running work is asynchronous so the API does not block on CSV generation.
- Storage credentials remain server-side, while clients receive only temporary signed URLs.
- Logout is implemented explicitly because stateless JWTs do not invalidate themselves.
- The system starts as a modular monolith to minimize operational complexity while preserving future extraction boundaries.
