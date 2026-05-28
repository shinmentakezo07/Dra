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

WORKDIR /app

# Copy root workspace files
COPY package*.json ./
COPY turbo.json ./

# Copy frontend package files
COPY apps/web/package*.json ./apps/web/

# Install dependencies
RUN npm ci

# Copy source code for build
COPY . .

# Build frontend
RUN npm run build -- --filter=web

# Stage 3: Production runtime
FROM node:20-alpine AS runner

RUN apk add --no-cache supervisor

WORKDIR /app

# Copy Go backend binary
COPY --from=backend-builder /app/backend/server ./backend/server

# Copy Next.js standalone output
COPY --from=frontend-builder /app/apps/web/.next/standalone ./frontend/
COPY --from=frontend-builder /app/apps/web/.next/static ./frontend/apps/web/.next/static
COPY --from=frontend-builder /app/apps/web/public ./frontend/apps/web/public

# Copy supervisord config
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

ENV BACKEND_URL=http://localhost:8080

EXPOSE 3000

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
