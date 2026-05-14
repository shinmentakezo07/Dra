# Scripts Reference

---

## Root Workspace (npm)

Run from the project root (`/teamspace/studios/this_studio/osiwa/`):

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both frontend and backend in dev mode (via Turborepo) |
| `npm run build` | Build all apps for production |
| `npm run lint` | Lint all packages |
| `npm run format` | Prettier format all TypeScript and Markdown files |
| `npm run test` | Run all tests (frontend + backend) via Turborepo |
| `npm run test:web` | Run frontend tests only |
| `npm run test:backend` | Run backend tests only |

---

## Frontend (apps/web)

Run from `apps/web/`:

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server on port 3000 |
| `npm run build` | Production build (standalone output) |
| `npm run start` | Start production server |
| `npm run lint` | ESLint check |
| `npm run test` | Run all Vitest tests |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run db:push` | Push Drizzle schema to database |
| `npm run db:seed` | Seed demo data |
| `npm run db:setup` | Push schema + seed data (combined) |

### Running Single Tests

```bash
npm run test -- --run tests/lib/api/sdk.test.ts
npm run test -- --run tests/lib/api/errors.test.ts
npm run test -- --run tests/wiring-verification.test.ts
```

---

## Backend (apps/backend)

Run from `apps/backend/`:

| Command | Description |
|---------|-------------|
| `make build` | `go build -o api ./cmd/api` |
| `make dev` | `go run ./cmd/api` |
| `make run` | Build then run the binary |
| `make test` | `go test -race -cover ./...` (all tests with race detector) |
| `make test-race` | `go test -race -v ./...` (verbose with race) |
| `make test-unit` | `go test -v -short ./...` (skips integration tests) |
| `make test-integration` | Full integration tests (requires `TEST_DATABASE_URL`) |
| `make test-coverage` | Coverage profile + function report |
| `make coverage-html` | Generate HTML coverage report |
| `make vet` | `go vet ./...` |
| `make lint` | `go vet` + `staticcheck` |
| `make fmt` | `gofmt` + `goimports` formatting |
| `make clean` | Remove `api` binary, `coverage.out`, `coverage.html` |
| `make docker` | Build Docker image (`dra-backend`) |

### Running Single Backend Tests

```bash
# Single package
go test -race -cover ./pkg/llm/provider/...

# Single test function
go test -race -cover -run TestName ./pkg/llm/tools/...

# With verbose output
go test -v -race -run TestName ./internal/handler/...
```

---

## Full-Stack Scripts

### `bash scripts/dev.sh`

Full development environment launcher:
1. Checks for Node.js, npm, Go, Docker
2. Installs all dependencies (root + frontend + backend)
3. Starts PostgreSQL via Docker Compose
4. Ensures `.env.local` exists and generates secrets if missing
5. Pushes database schema
6. Seeds demo data if database is empty
7. Starts Go backend (with color-coded log output)
8. Starts Next.js frontend (with color-coded log output)

Press `Ctrl+C` to stop all services gracefully.

### `bash scripts/smoke-test.sh`

Post-change wiring verification that checks:
1. **Go Backend Compiles**: `go build ./...` succeeds
2. **No Mock Data**: Dashboard components don't contain mock data
3. **SDK Import Audit**: Dashboard components import from `@/lib/api/sdk`
4. **API Route Coverage**: Expected proxy routes exist
5. **Chat SSE Wiring**: Chat route has SSE conversion logic
6. **Test Infrastructure**: Backend and frontend test files exist
7. **Environment Configuration**: `.env.example` defines required variables

Outputs: `PASS`/`FAIL`/`WARN` counts. Exits non-zero if any FAIL.

---

## Go-Specific Commands

```bash
# Format all Go code
gofmt -w ./
goimports -w ./

# Run static analysis
go vet ./...
staticcheck ./...

# Build without cache
go clean -cache && go build ./cmd/api

# Download dependencies
go mod download
go mod tidy
```
