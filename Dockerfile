# Build stage
FROM node:22-slim AS builder
WORKDIR /app
# better-sqlite3 compiles from source when no prebuilt binary matches,
# which needs a C++ toolchain the slim image doesn't include.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx next build

# Runtime stage
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# SQLite lives on a mounted volume so bookings survive restarts/deploys.
ENV DATABASE_PATH=/data/oasis.db

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

RUN mkdir -p /data && chown -R node:node /data /app
USER node

EXPOSE 3000
CMD ["node", "server.js"]
