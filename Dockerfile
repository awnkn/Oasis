# Build stage
FROM node:22-slim AS builder
WORKDIR /app
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

RUN mkdir -p /data && chown -R node:node /data /app
USER node

EXPOSE 3000
CMD ["node", "server.js"]
