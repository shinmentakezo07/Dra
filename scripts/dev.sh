#!/usr/bin/env bash
set -eo pipefail

# ============================================================
# DRA Platform — Full Stack Dev Launcher
# ============================================================
# Usage: bash scripts/dev.sh
#
# This script:
#   1. Installs dependencies (root, frontend, backend)
#   2. Starts local PostgreSQL via docker-compose
#   3. Pushes DB schema and seeds if the database is empty
#   4. Starts the Go backend and Next.js frontend
#   5. Streams color-coded logs for both services
# ============================================================

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'
BOLD='\033[1m'

# --- Paths ---
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_DIR="$ROOT_DIR/apps/web"
BACKEND_DIR="$ROOT_DIR/apps/backend"

# --- Docker Compose command detection ---
# Modern Docker uses `docker compose` (plugin). Older installs use `docker-compose`.
if docker compose version >/dev/null 2>&1; then
  DOCKER_COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DOCKER_COMPOSE="docker-compose"
else
  DOCKER_COMPOSE=""
fi

# --- Track how backend was started for cleanup ---
BACKEND_MODE=""   # "local" | "docker" | ""


log_info()  { echo -e "${BLUE}[dev]${NC} $1"; }
log_ok()    { echo -e "${GREEN}[dev]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[dev]${NC} $1"; }
log_error() { echo -e "${RED}[dev]${NC} $1"; }

# ============================================================
# Cleanup on exit / Ctrl+C
# ============================================================
cleanup() {
  echo ""
  log_info "Shutting down services..."

  # Stop Docker backend if we started it
  if [ "$BACKEND_MODE" = "docker" ] && [ -n "$DOCKER_COMPOSE" ]; then
    log_info "Stopping backend container..."
    cd "$ROOT_DIR"
    $DOCKER_COMPOSE stop backend 2>/dev/null || true
  fi

  # Kill all background jobs (backend + frontend + any tails)
  local pids
  pids="$(jobs -p 2>/dev/null || true)"
  if [ -n "$pids" ]; then
    # shellcheck disable=SC2086
    kill $pids 2>/dev/null || true
    wait 2>/dev/null || true
  fi
  log_ok "All services stopped. Goodbye!"
  exit 0
}
trap cleanup INT TERM EXIT

# ============================================================
# Dependency Checks
# ============================================================
check_node() {
  if command -v node >/dev/null 2>&1; then
    log_ok "Node.js found: $(node --version)"
    return 0
  else
    log_error "Node.js is not installed. Please install Node.js v20+ first."
    exit 1
  fi
}

check_npm() {
  if command -v npm >/dev/null 2>&1; then
    log_ok "npm found: $(npm --version)"
    return 0
  else
    log_error "npm is not installed. Please install npm first."
    exit 1
  fi
}

check_go() {
  if command -v go >/dev/null 2>&1; then
    log_ok "Go found: $(go version)"
    HAS_GO=1
  else
    log_warn "Go is not installed. Backend will not start."
    log_warn "Install Go from https://go.dev/dl/"
    HAS_GO=0
  fi
}

check_docker() {
  if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    log_ok "Docker is running"
    HAS_DOCKER=1
  else
    log_warn "Docker is not running. PostgreSQL must be started manually."
    HAS_DOCKER=0
  fi
}

# ============================================================
# Install Dependencies
# ============================================================
install_root_deps() {
  log_info "Installing root dependencies..."
  cd "$ROOT_DIR"
  if [ -d "node_modules" ]; then
    log_ok "Root node_modules already exists"
  else
    npm install
    log_ok "Root dependencies installed"
  fi
}

install_web_deps() {
  log_info "Installing frontend dependencies..."
  cd "$WEB_DIR"
  if [ -d "node_modules" ]; then
    log_ok "Frontend node_modules already exists"
  else
    npm install
    log_ok "Frontend dependencies installed"
  fi
}

install_backend_deps() {
  if ! command -v go >/dev/null 2>&1; then
    log_warn "Skipping backend dependency install (Go not found)"
    return
  fi
  log_info "Installing backend dependencies..."
  cd "$BACKEND_DIR"
  if [ -d "vendor" ]; then
    log_ok "Backend vendor already exists"
  else
    go mod download
    log_ok "Backend dependencies downloaded"
  fi
}

# ============================================================
# PostgreSQL
# ============================================================
start_postgres() {
  if [ -z "$DOCKER_COMPOSE" ]; then
    log_warn "docker compose / docker-compose not found — assuming PostgreSQL is already running"
    return
  fi
  if ! docker info >/dev/null 2>&1; then
    log_warn "Docker daemon not reachable — assuming PostgreSQL is already running"
    return
  fi

  log_info "Starting PostgreSQL ($DOCKER_COMPOSE)..."
  cd "$ROOT_DIR"
  $DOCKER_COMPOSE up -d postgres

  log_info "Waiting for PostgreSQL to be healthy..."
  local retries=30
  while [ $retries -gt 0 ]; do
    if $DOCKER_COMPOSE ps postgres | grep -q "healthy"; then
      log_ok "PostgreSQL is healthy"
      return 0
    fi
    sleep 1
    retries=$((retries - 1))
  done

  log_error "PostgreSQL failed to become healthy within 30s"
  $DOCKER_COMPOSE logs --tail=20 postgres
  exit 1
}

# ============================================================
# Environment Setup
# ============================================================
ensure_env_file() {
  cd "$WEB_DIR"
  if [ ! -f ".env.local" ]; then
    if [ -f ".env.example" ]; then
      log_warn "No .env.local found — copying from .env.example"
      cp .env.example .env.local
    else
      log_error "No .env.local or .env.example found in $WEB_DIR"
      exit 1
    fi
  fi
}

fix_placeholder_secrets() {
  local env_file="$WEB_DIR/.env.local"
  local changed=0

  # Generate AUTH_SECRET if missing or placeholder
  local auth_secret
  auth_secret="$(grep '^AUTH_SECRET=' "$env_file" | cut -d= -f2- | sed 's/^"//;s/"$//' || true)"
  if [ -z "$auth_secret" ] || [ "$auth_secret" = "your-auth-secret-here" ]; then
    local new_secret
    new_secret="$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)"
    # Update or append
    if grep -q '^AUTH_SECRET=' "$env_file"; then
      sed -i "s|^AUTH_SECRET=.*|AUTH_SECRET=$new_secret|" "$env_file"
    else
      echo "AUTH_SECRET=$new_secret" >> "$env_file"
    fi
    log_ok "Generated AUTH_SECRET in .env.local"
    changed=1
  fi

  # Generate NEXTAUTH_SECRET if missing or placeholder
  local nextauth_secret
  nextauth_secret="$(grep '^NEXTAUTH_SECRET=' "$env_file" | cut -d= -f2- | sed 's/^"//;s/"$//' || true)"
  if [ -z "$nextauth_secret" ] || [ "$nextauth_secret" = "your-nextauth-secret-here" ]; then
    local new_secret
    new_secret="$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)"
    if grep -q '^NEXTAUTH_SECRET=' "$env_file"; then
      sed -i "s|^NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=$new_secret|" "$env_file"
    else
      echo "NEXTAUTH_SECRET=$new_secret" >> "$env_file"
    fi
    log_ok "Generated NEXTAUTH_SECRET in .env.local"
    changed=1
  fi

  if [ $changed -eq 1 ]; then
    log_warn "Restart the script if secrets were just generated."
  fi
}

# ============================================================
# Database Schema & Seed
# ============================================================
push_schema() {
  log_info "Pushing database schema..."
  cd "$WEB_DIR"
  npx drizzle-kit push --force
  log_ok "Schema pushed"
}

is_db_seeded() {
  local db_url
  db_url="${DATABASE_URL:-}"
  if [ -z "$db_url" ]; then
    if [ -f "$WEB_DIR/.env.local" ]; then
      db_url="$(grep '^DATABASE_URL=' "$WEB_DIR/.env.local" | cut -d= -f2- | sed 's/^"//;s/"$//')"
    fi
  fi
  if [ -z "$db_url" ]; then
    log_warn "Could not determine DATABASE_URL — assuming not seeded"
    return 1
  fi

  if docker info >/dev/null 2>&1; then
    local count
    count="$(docker exec dra_postgres psql "$db_url" -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | xargs || true)"
    if [ "$count" != "" ] && [ "$count" -gt 0 ] 2>/dev/null; then
      return 0
    fi
  fi
  return 1
}

seed_database() {
  log_info "Database is empty — seeding demo data..."
  cd "$WEB_DIR"
  npx tsx db/seed.ts
  log_ok "Database seeded"
}

# ============================================================
# Run Services with color-coded log prefixes
# ============================================================
run_backend() {
  # Try local Go first
  if command -v go >/dev/null 2>&1; then
    log_info "Starting Go backend on http://localhost:8080 ..."
    cd "$BACKEND_DIR"

    local env_file=""
    if [ -f "$WEB_DIR/.env.local" ]; then
      env_file="$WEB_DIR/.env.local"
    fi

    # Run backend in a subshell, pipe output through awk for colored prefix
    (
      if [ -n "$env_file" ]; then
        set -a
        # shellcheck source=/dev/null
        . "$env_file"
        set +a
      fi
      export ENV=development
      exec go run ./cmd/api
    ) 2>&1 | awk '{ printf "\033[0;35m[backend]\033[0m %s\n", $0 }' &

    BACKEND_MODE="local"
    return
  fi

  # Fall back to Docker if available
  if [ -n "$DOCKER_COMPOSE" ] && docker info >/dev/null 2>&1; then
    log_info "Go not installed — starting backend via Docker..."
    cd "$ROOT_DIR"
    $DOCKER_COMPOSE up -d --build backend

    # Tail container logs with color prefix
    $DOCKER_COMPOSE logs -f backend 2>&1 | awk '{ printf "\033[0;35m[backend]\033[0m %s\n", $0 }' &

    BACKEND_MODE="docker"
    return
  fi

  log_warn "Go not installed and Docker unavailable — backend will NOT start"
}

run_frontend() {
  log_info "Starting Next.js frontend on http://localhost:3000 ..."
  cd "$WEB_DIR"
  # Pipe output through awk for colored prefix
  npm run dev 2>&1 | awk '{ printf "\033[0;36m[frontend]\033[0m %s\n", $0 }' &
}

show_banner() {
  sleep 2
  echo ""
  echo -e "${BOLD}══════════════════════════════════════════════════════════════════${NC}"
  echo -e "${BOLD}  DRA Platform is running${NC}"
  echo -e "${BOLD}  Frontend:${NC} ${CYAN}http://localhost:3000${NC}"
  echo -e "${BOLD}  Backend: ${NC} ${MAGENTA}http://localhost:8080${NC}"
  echo -e "${BOLD}══════════════════════════════════════════════════════════════════${NC}"
  echo ""
  log_info "Press Ctrl+C to stop all services."
  echo ""
}

# ============================================================
# Main
# ============================================================
main() {
  echo -e "${BOLD}╔══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BOLD}║         DRA Platform — Full Stack Dev Launcher               ║${NC}"
  echo -e "${BOLD}╚══════════════════════════════════════════════════════════════╝${NC}"
  echo ""

  check_node
  check_npm
  check_go
  check_docker
  echo ""

  install_root_deps
  install_web_deps
  install_backend_deps
  echo ""

  start_postgres
  ensure_env_file
  fix_placeholder_secrets
  push_schema
  echo ""

  if is_db_seeded; then
    log_ok "Database already seeded — skipping"
  else
    seed_database
  fi
  echo ""

  run_backend
  run_frontend
  show_banner

  # Wait for all background jobs
  wait
}

main "$@"
