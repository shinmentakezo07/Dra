# Stage 1: Build Go backend
FROM golang:1.25-alpine AS backend-builder

WORKDIR /app/backend

RUN apk add --no-cache git ca-certificates

COPY apps/backend/go.mod apps/backend/go.sum ./
RUN go mod download

COPY apps/backend/ .
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o server ./cmd/api

# Stage 2: Build Next.js frontend
FROM node:20-alpine AS frontend-builder

# Build-time secrets: use dummy values during build; real secrets set at runtime.
# Railway injects runtime env vars which override these ENV defaults.
ARG AUTH_SECRET
ARG NEXTAUTH_SECRET
ENV AUTH_SECRET=${AUTH_SECRET:-build-placeholder}
ENV NEXTAUTH_SECRET=${NEXTAUTH_SECRET:-build-placeholder}
ENV BACKEND_URL=${BACKEND_URL:-http://localhost:8080}

WORKDIR /app

# Copy root workspace files
COPY package*.json ./
COPY turbo.json ./
COPY .npmrc ./

# Copy frontend package files
COPY apps/web/package*.json ./apps/web/

# Install dependencies (legacy-peer-deps required for next-auth + next canary)
RUN npm ci

# Copy source code for build
COPY . .

# Build frontend
RUN npm run build -- --filter=web

# Stage 3: Production runtime
FROM node:20-alpine AS runner

WORKDIR /app

# Copy Go backend binary
COPY --from=backend-builder /app/backend/server ./backend/server

# Copy Next.js standalone output
COPY --from=frontend-builder /app/apps/web/.next/standalone ./frontend/
COPY --from=frontend-builder /app/apps/web/.next/static ./frontend/apps/web/.next/static
COPY --from=frontend-builder /app/apps/web/public ./frontend/apps/web/public

# Copy startup script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

ENV BACKEND_URL=http://localhost:8080
ENV ALLOWED_ORIGINS=*
ENV ENV=production
ENV AUTH_TRUST_HOST=true

EXPOSE 3000

CMD ["/app/start.sh"]
