# Stage 1: Build application
FROM node:24-alpine AS builder

WORKDIR /app

# Prisma config requires URL variables during client generation, but no
# database connection is made during the image build.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build \
  DIRECT_URL=postgresql://build:build@localhost:5432/build

# Copy dependency manifests and Prisma schema/config first for better layer caching.
COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Install dependencies, including devDependencies required to compile NestJS.
RUN npm ci

# Copy application source and build the production artifacts.
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 2: Production runtime
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install runtime dependencies and the Prisma CLI used by the startup migration.
COPY package*.json ./
RUN npm ci --omit=dev \
  && npm install --no-save prisma@7.10.0

# Copy compiled application and Prisma runtime assets.
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3000

CMD ["sh", "-c", "DIRECT_URL=$(printf '%s' \"$DIRECT_URL\" | sed 's/^\"//; s/\"$//'); DATABASE_URL=\"$DIRECT_URL\"; export DIRECT_URL DATABASE_URL; npx prisma migrate deploy && node dist/main.js"]
