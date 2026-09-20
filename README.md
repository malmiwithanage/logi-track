# Logi Track

Logi Track is a NestJS API project for logistics tracking. The project currently provides a working API foundation with Swagger documentation, PostgreSQL connectivity through Prisma, and NestJS observability support.

## Current Status

- NestJS 12 API running on Node.js
- PostgreSQL database configured through `DATABASE_URL`
- Prisma 7.10 configured with a minimal PostgreSQL schema
- Swagger UI available at `/docs`
- OpenAPI JSON available at `/docs-json`
- Observability module configured through `@nestjs/observe`
- Root health-style endpoint available at `GET /`

The Prisma schema is currently a scaffold with no domain models. Logistics entities and relationships can be added to `prisma/schema.prisma` as the application requirements are defined.

## Requirements

- Node.js 24 or later
- npm
- PostgreSQL running locally or a reachable PostgreSQL instance

## Installation

```bash
npm install
```

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://postgres:[password]@localhost:5432/logitrack?schema=public"
```

Update the connection string for your local PostgreSQL credentials and database.

## Database Setup

Apply the current Prisma schema to the configured database:

```bash
npx prisma db push
```

Generate the Prisma client when the schema changes:

```bash
npx prisma generate
```

The current schema is located at [prisma/schema.prisma](prisma/schema.prisma). It defines PostgreSQL as the database provider but does not yet contain application tables.

## Running the API

Development mode:

```bash
npm run start:dev
```

Production build and start:

```bash
npm run build
npm run start:prod
```

The API listens on port `3000` by default. Set `PORT` in the environment to use another port.

## API Documentation

After starting the application, open:

- Swagger UI: <http://localhost:3000/docs>
- OpenAPI JSON: <http://localhost:3000/docs-json>

Swagger is configured in [src/main.ts](src/main.ts), and the current controller is tagged as `app`.

## Database Screenshots

Screenshots can be added here as the database model grows. Recommended captures include:

1. PostgreSQL database connection or dashboard
2. Prisma schema showing the domain models
3. Database tables and relationships
4. Swagger UI showing the available endpoints

Suggested location for committed images:

```text
docs/screenshots/database-overview.png
docs/screenshots/database-schema.png
docs/screenshots/swagger-api.png
```

When images are available, embed them like this:

```md
![Database overview](docs/screenshots/database-overview.png)
```

## Useful Commands

| Command | Description |
| --- | --- |
| `npm run start:dev` | Start the API in watch mode |
| `npm run build` | Compile the application |
| `npm run lint` | Run Oxlint |
| `npm test` | Run unit tests |
| `npm run test:e2e` | Run end-to-end tests |
| `npx prisma db push` | Apply the Prisma schema to the database |
| `npx prisma generate` | Generate the Prisma client |

## Project Structure

```text
src/
	app.controller.ts  Root API endpoint
	app.module.ts      NestJS application module
	app.service.ts     Application service
	main.ts            Application bootstrap and Swagger setup
prisma/
	schema.prisma      PostgreSQL Prisma schema
test/
	app.e2e-spec.ts    End-to-end tests
```
