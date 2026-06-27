#!/usr/bin/env bash
set -eo pipefail

# ============================================================
# DRA Platform — Full Stack Dev Launcher
# ============================================================
# Usage: bash scripts/dev.sh [--check] [--logs]
#
# Options:
#   --check   Only check dependencies and exit (no services started)
#   --logs    Show logs from last run (no services started)
#
# This script:
#   1. Checks ALL required dependencies and reports status
#   2. Installs dependencies (root, frontend, backend)
#   3. Starts local PostgreSQL via docker-compose
#   4. Pushes DB schema and seeds if the database is empty
#   5. Starts the Go backend and Next.js frontend
#   6. Streams color-coded logs for both services
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
DIM='\033[2m'

# --- Paths ---
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_DIR="$ROOT_DIR/apps/web"
BACKEND_DIR="$ROOT_DIR/apps/backend"
LOG_DIR="/tmp/dra-dev-logs"
mkdir -p "$LOG_DIR"

# --- Docker Compose command detection ---
if docker compose version >/dev/null 2>&1; then
  DOCKER_COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DOCKER_COMPOSE="docker-compose"
else
  DOCKER_COMPOSE=""
fi

BACKEND_MODE=""
BACKEND_PID=""
FRONTEND_PID=""
SERVICE_PIDS=()
RUNNING_CLEANUP=0
SERVICES_STARTED=0

# --- Logging ---
log_info()  { echo -e "${BLUE}[dev]${NC} $1"; }
log_ok()    { echo -e "${GREEN}[dev]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[dev]${NC} $1"; }
log_error() { echo -e "${RED}[dev]${NC} $1"; }

register_pid() {
  local pid="$1"
  if [ -n "$pid" ]; then
    SERVICE_PIDS+=("$pid")
  fi
}

kill_process_tree() {
  local pid="$1"
  if [ -z "$pid" ] || ! kill -0 "$pid" 2>/dev/null; then
    return
  fi

  local children
  children="$(pgrep -P "$pid" 2>/dev/null || true)"
  if [ -n "$children" ]; then
    while IFS= read -r child; do
      [ -n "$child" ] && kill_process_tree "$child"
    done <<< "$children"
  fi

  kill "$pid" 2>/dev/null || true
}

wait_for_process_exit() {
  local pid="$1"
  local retries="${2:-20}"

  while [ "$retries" -gt 0 ]; do
    if ! kill -0 "$pid" 2>/dev/null; then
      return 0
    fi
    sleep 0.2
    retries=$((retries - 1))
  done

  return 1
}

# ============================================================
# Dependency Checks (find ALL missing deps, not just first)
# ============================================================
check_deps() {
  local all_ok=1
  local status

  echo ""
  echo -e "${BOLD}═══ Dependency Check ═══${NC}"
  echo ""

  # ── Node.js ──
  if command -v node >/dev/null 2>&1; then
    echo -e "  ${GREEN}✅${NC} Node.js       $(node --version)"
  else
    echo -e "  ${RED}❌${NC} Node.js       NOT INSTALLED — install Node.js v20+ from https://nodejs.org"
    all_ok=1
  fi

  # ── npm ──
  if command -v npm >/dev/null 2>&1; then
    echo -e "  ${GREEN}✅${NC} npm           v$(npm --version)"
  else
    echo -e "  ${RED}❌${NC} npm           NOT INSTALLED"
    all_ok=1
  fi

  # ── Go ──
  if command -v go >/dev/null 2>&1; then
    echo -e "  ${GREEN}✅${NC} Go            $(go version 2>&1 | grep -oP 'go\S+' || $(go version))"
  else
    echo -e "  ${YELLOW}⚠${NC} Go            NOT INSTALLED — backend will not start locally (install from https://go.dev/dl/)"
  fi

  # ── Docker ──
  if command -v docker >/dev/null 2>&1; then
    if docker info >/dev/null 2>&1; then
      echo -e "  ${GREEN}✅${NC} Docker        running"
    else
      echo -e "  ${YELLOW}⚠${NC} Docker        installed but daemon NOT running — PostgreSQL must be started manually"
    fi
  else
    echo -e "  ${YELLOW}⚠${NC} Docker        NOT INSTALLED — PostgreSQL must be started manually"
  fi

  # ── Docker Compose ──
  if [ -n "$DOCKER_COMPOSE" ]; then
    echo -e "  ${GREEN}✅${NC} Compose       $DOCKER_COMPOSE"
  else
    echo -e "  ${YELLOW}⚠${NC} Compose       NOT FOUND — can't auto-start PostgreSQL"
  fi

  # ── psql (optional, for DB inspection) ──
  if command -v psql >/dev/null 2>&1; then
    echo -e "  ${GREEN}✅${NC} psql          $(psql --version 2>&1 | head -1)"
  else
    echo -e "  ${DIM}  ○ psql          not available (DB inspection via docker exec)${NC}"
  fi

  # ── OpenSSL (for secret generation) ──
  if command -v openssl >/dev/null 2>&1; then
    echo -e "  ${GREEN}✅${NC} OpenSSL       $(openssl version 2>&1 | head -1)"
  else
    echo -e "  ${YELLOW}⚠${NC} OpenSSL       NOT INSTALLED — secret generation will use /dev/urandom fallback"
  fi

  # ── Make ──
  if command -v make >/dev/null 2>&1; then
    echo -e "  ${GREEN}✅${NC} make          $(make --version 2>&1 | head -1)"
  else
    echo -e "  ${DIM}  ○ make          not available (can use go build directly)${NC}"
  fi

  echo ""

  # ── Check node_modules status ──
  echo -e "${BOLD}═══ Package Status ═══${NC}"
  echo ""
  if [ -d "$ROOT_DIR/node_modules" ]; then
    local root_count
    root_count="$(find "$ROOT_DIR/node_modules" -maxdepth 1 -type d 2>/dev/null | wc -l)"
    echo -e "  ${GREEN}✅${NC} Root deps      $root_count packages installed"
  else
    echo -e "  ${YELLOW}⚠${NC} Root deps      NOT INSTALLED — will run npm install"
  fi
  if [ -d "$WEB_DIR/node_modules" ]; then
    local web_count
    web_count="$(find "$WEB_DIR/node_modules" -maxdepth 1 -type d 2>/dev/null | wc -l)"
    echo -e "  ${GREEN}✅${NC} Frontend deps  $web_count packages installed"
  else
    echo -e "  ${YELLOW}⚠${NC} Frontend deps  NOT INSTALLED — will run npm install"
  fi
  if go env GOMODCACHE >/dev/null 2>&1; then
    echo -e "  ${GREEN}✅${NC} Go modules     $(go env GOMODCACHE) ready"
  else
    echo -e "  ${YELLOW}⚠${NC} Go modules     Go not available, skipping"
  fi

  # ── Check .env status ──
  echo ""
  echo -e "${BOLD}═══ Environment ═══${NC}"
  echo ""
  if [ -f "$WEB_DIR/.env.local" ]; then
    echo -e "  ${GREEN}✅${NC} .env.local     found"
    local has_auth
    has_auth="$(grep -c '^AUTH_SECRET=' "$WEB_DIR/.env.local" || true)"
    if [ "$has_auth" -gt 0 ]; then
      echo -e "  ${GREEN}✅${NC} AUTH_SECRET    set"
    else
      echo -e "  ${YELLOW}⚠${NC} AUTH_SECRET    MISSING — will generate"
    fi
  else
    echo -e "  ${YELLOW}⚠${NC} .env.local     MISSING — will create from .env.example"
  fi

  # ── Detect DB_TYPE ──
  local db_type="postgres"
  if [ -f "$WEB_DIR/.env.local" ]; then
    local env_db_type
    env_db_type="$(grep '^DB_TYPE=' "$WEB_DIR/.env.local" | cut -d= -f2- | tr -d '[:space:]' || true)"
    if [ -n "$env_db_type" ]; then
      db_type="$env_db_type"
    fi
    local db_url
    db_url="$(grep '^DATABASE_URL=' "$WEB_DIR/.env.local" | cut -d= -f2- || true)"
    if [ "$db_type" = "postgres" ] && echo "$db_url" | grep -q "neon.tech"; then
      db_type="neon"
    fi
  fi
  echo -e "  ${BLUE}ℹ${NC}  DB_TYPE        $db_type"

  echo ""

  # ── Check Database ──
  echo -e "${BOLD}═══ Database ═══${NC}"
  echo ""
  if [ "$db_type" = "mongodb" ]; then
    echo -e "  ${BLUE}ℹ${NC}  MongoDB        backend will auto-setup on start"
  elif [ "$db_type" = "neon" ]; then
    echo -e "  ${BLUE}ℹ${NC}  Neon           cloud PostgreSQL (no local container)"
  else
    if docker info >/dev/null 2>&1; then
      local pg_container
      pg_container="$(docker ps --filter name=dra_postgres --format '{{.Status}}' 2>/dev/null || true)"
      if [ -n "$pg_container" ]; then
        echo -e "  ${GREEN}✅${NC} PostgreSQL     $pg_container"
      else
        echo -e "  ${YELLOW}⚠${NC} PostgreSQL     NOT running — will start"
      fi
    else
      echo -e "  ${YELLOW}⚠${NC} PostgreSQL     can't check (Docker not available)"
    fi
  fi
  echo ""

  # ── Check Backend Process ──
  echo -e "${BOLD}═══ Services ═══${NC}"
  echo ""
  if ss -tlnp 2>/dev/null | grep -q ':8080 '; then
    echo -e "  ${GREEN}✅${NC} Backend        running on :8080"
  else
    echo -e "  ${YELLOW}⚠${NC} Backend        NOT running — will start"
  fi
  if ss -tlnp 2>/dev/null | grep -q ':3000 '; then
    echo -e "  ${GREEN}✅${NC} Frontend       running on :3000"
  else
    echo -e "  ${YELLOW}⚠${NC} Frontend       NOT running — will start"
  fi
  echo ""
}

# ============================================================
# Show Logs
# ============================================================
show_logs() {
  echo -e "${BOLD}═══ Dev Script Logs ═══${NC}"
  echo ""
  if [ -f "$LOG_DIR/backend.log" ]; then
    echo -e "${MAGENTA}[backend log]${NC} ${DIM}$LOG_DIR/backend.log${NC}"
    tail -30 "$LOG_DIR/backend.log" 2>/dev/null | while IFS= read -r line; do
      echo -e "  ${MAGENTA}|${NC} $line"
    done
  else
    echo -e "  ${YELLOW}⚠${NC} No backend log found"
  fi
  echo ""
  if [ -f "$LOG_DIR/frontend.log" ]; then
    echo -e "${CYAN}[frontend log]${NC} ${DIM}$LOG_DIR/frontend.log${NC}"
    tail -20 "$LOG_DIR/frontend.log" 2>/dev/null | while IFS= read -r line; do
      echo -e "  ${CYAN}|${NC} $line"
    done
  else
    echo -e "  ${YELLOW}⚠${NC} No frontend log found"
  fi
  echo ""
  if [ -f "$LOG_DIR/postgres.log" ]; then
    echo -e "${BLUE}[postgres log]${NC} ${DIM}$LOG_DIR/postgres.log${NC}"
    tail -20 "$LOG_DIR/postgres.log" 2>/dev/null | while IFS= read -r line; do
      echo -e "  ${BLUE}|${NC} $line"
    done
  fi
  echo ""
  echo -e "${DIM}Full logs: $LOG_DIR/${NC}"
}

# ============================================================
# Cleanup
# ============================================================
cleanup() {
  if [ "$RUNNING_CLEANUP" -eq 1 ]; then
    return
  fi
  RUNNING_CLEANUP=1

  if [ "$SERVICES_STARTED" -eq 0 ]; then
    return
  fi

  echo ""
  log_info "Shutting down services..."

  if [ "$BACKEND_MODE" = "docker" ] && [ -n "$DOCKER_COMPOSE" ]; then
    log_info "Stopping backend container..."
    cd "$ROOT_DIR"
    $DOCKER_COMPOSE stop backend 2>/dev/null || true
  fi

  local pid
  for pid in "${SERVICE_PIDS[@]}"; do
    kill_process_tree "$pid"
  done

  for pid in "${SERVICE_PIDS[@]}"; do
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      if ! wait_for_process_exit "$pid"; then
        kill -9 "$pid" 2>/dev/null || true
      fi
    fi
  done

  wait 2>/dev/null || true
  log_ok "All services stopped. Goodbye!"
  exit 0
}
trap cleanup INT TERM EXIT

# ============================================================
# Auto-Install Go (if missing)
# ============================================================
ensure_go_installed() {
  if command -v go >/dev/null 2>&1; then
    log_ok "Go already installed: $(go version 2>&1 | grep -oP 'go\S+' || echo 'unknown')"
    return 0
  fi

  log_warn "Go is not installed — installing Go automatically..."

  local go_version="1.25.0"
  local os arch tarball url

  os="$(uname -s | tr '[:upper:]' '[:lower:]')"
  arch="$(uname -m)"

  case "$arch" in
    x86_64)  arch="amd64" ;;
    aarch64|arm64) arch="arm64" ;;
    *)
      log_error "Unsupported architecture: $arch — cannot auto-install Go"
      log_info "Please install Go manually from https://go.dev/dl/"
      return 1
      ;;
  esac

  case "$os" in
    linux|darwin) ;;
    *)
      log_error "Unsupported OS: $os — cannot auto-install Go"
      log_info "Please install Go manually from https://go.dev/dl/"
      return 1
      ;;
  esac

  tarball="go${go_version}.${os}-${arch}.tar.gz"
  url="https://go.dev/dl/${tarball}"

  log_info "Downloading Go ${go_version} (${os}/${arch})..."
  log_info "  ${url}"

  local download_dir
  download_dir="$(mktemp -d)"

  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$url" -o "$download_dir/$tarball" 2>&1 | while IFS= read -r line; do echo -e "  ${DIM}curl>${NC} $line"; done
  elif command -v wget >/dev/null 2>&1; then
    wget -q "$url" -O "$download_dir/$tarball" 2>&1 | while IFS= read -r line; do echo -e "  ${DIM}wget>${NC} $line"; done
  else
    log_error "Neither curl nor wget found — cannot download Go"
    rm -rf "$download_dir"
    return 1
  fi

  if [ ! -f "$download_dir/$tarball" ]; then
    log_error "Download failed — Go tarball not found at $url"
    rm -rf "$download_dir"
    return 1
  fi

  log_info "Extracting Go to /usr/local/go..."
  sudo rm -rf /usr/local/go
  sudo tar -C /usr/local -xzf "$download_dir/$tarball" 2>&1 | while IFS= read -r line; do echo -e "  ${DIM}tar>${NC} $line"; done
  rm -rf "$download_dir"

  # Ensure /usr/local/go/bin is on PATH
  if ! echo "$PATH" | tr ':' '\n' | grep -qx '/usr/local/go/bin'; then
    export PATH="/usr/local/go/bin:$PATH"
    log_info "Added /usr/local/go/bin to PATH"

    # Persist in shell config if not already present
    local shell_rc
    case "${SHELL:-$0}" in
      */zsh) shell_rc="$HOME/.zshrc" ;;
      */bash) shell_rc="$HOME/.bashrc" ;;
      *) shell_rc="$HOME/.profile" ;;
    esac

    if [ -f "$shell_rc" ]; then
      if ! grep -q 'export PATH="/usr/local/go/bin:$PATH"' "$shell_rc" 2>/dev/null; then
        echo '' >> "$shell_rc"
        echo '# Go (auto-installed by dev.sh)' >> "$shell_rc"
        echo 'export PATH="/usr/local/go/bin:$PATH"' >> "$shell_rc"
        log_info "Persisted Go path in $shell_rc"
      fi
    fi
  fi

  if command -v go >/dev/null 2>&1; then
    log_ok "Go installed successfully: $(go version)"
    return 0
  else
    log_error "Go installation failed — please install manually from https://go.dev/dl/"
    return 1
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
    npm install 2>&1 | while IFS= read -r line; do echo -e "  ${DIM}npm>${NC} $line"; done
    log_ok "Root dependencies installed"
  fi
}

install_web_deps() {
  log_info "Installing frontend dependencies..."
  cd "$WEB_DIR"
  if [ -d "node_modules" ]; then
    log_ok "Frontend node_modules already exists"
  else
    npm install 2>&1 | while IFS= read -r line; do echo -e "  ${DIM}npm>${NC} $line"; done
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
  go mod download 2>&1 | while IFS= read -r line; do echo -e "  ${DIM}go>${NC} $line"; done
  go mod tidy 2>&1 | while IFS= read -r line; do echo -e "  ${DIM}go>${NC} $line"; done
  log_ok "Backend dependencies refreshed"
}

build_backend_binary() {
  if ! command -v go >/dev/null 2>&1; then
    log_warn "Skipping backend rebuild (Go not found)"
    return
  fi

  log_info "Building backend binary..."
  cd "$BACKEND_DIR"
  rm -f api
  make build 2>&1 | while IFS= read -r line; do echo -e "  ${DIM}build>${NC} $line"; done
  log_ok "Backend binary rebuilt"
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

  log_info "Starting PostgreSQL..."
  cd "$ROOT_DIR"
  # Suppress benign env-var warnings from compose (postgres doesn't need them)
  $DOCKER_COMPOSE up -d postgres 2>&1 | grep -v 'variable is not set\|version.\is obsolete' | while IFS= read -r line; do
    if [ -n "$line" ]; then echo -e "  ${DIM}docker>${NC} $line"; fi
  done

  log_info "Waiting for PostgreSQL to be healthy..."
  local retries=30
  while [ $retries -gt 0 ]; do
    if $DOCKER_COMPOSE ps postgres 2>/dev/null | grep -q "healthy"; then
      log_ok "PostgreSQL is healthy"
      # Save postgres logs
      $DOCKER_COMPOSE logs --tail=30 postgres > "$LOG_DIR/postgres.log" 2>/dev/null || true
      return 0
    fi
    sleep 1
    retries=$((retries - 1))
  done

  log_error "PostgreSQL failed to become healthy within 30s"
  log_info "PostgreSQL logs:"
  $DOCKER_COMPOSE logs --tail=30 postgres 2>&1 | while IFS= read -r line; do echo -e "  ${RED}|${NC} $line"; done
  # Save to log file
  $DOCKER_COMPOSE logs --tail=100 postgres > "$LOG_DIR/postgres.log" 2>/dev/null || true
  log_info "Full logs saved to: $LOG_DIR/postgres.log"
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

  local auth_secret
  auth_secret="$(grep '^AUTH_SECRET=' "$env_file" | cut -d= -f2- | sed 's/^"//;s/"$//' || true)"
  if [ -z "$auth_secret" ] || [ "$auth_secret" = "your-auth-secret-here" ]; then
    local new_secret
    new_secret="$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)"
    if grep -q '^AUTH_SECRET=' "$env_file"; then
      sed -i "s|^AUTH_SECRET=.*|AUTH_SECRET=$new_secret|" "$env_file"
    else
      echo "AUTH_SECRET=$new_secret" >> "$env_file"
    fi
    log_ok "Generated AUTH_SECRET in .env.local"
    changed=1
  fi

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

  local backend_url
  backend_url="$(grep '^BACKEND_URL=' "$env_file" | cut -d= -f2- || true)"
  if [ -z "$backend_url" ]; then
    echo "BACKEND_URL=http://localhost:8080" >> "$env_file"
    log_ok "Set BACKEND_URL=http://localhost:8080"
    changed=1
  fi

  local nextauth_url
  nextauth_url="$(grep '^NEXTAUTH_URL=' "$env_file" | cut -d= -f2- || true)"
  if [ -z "$nextauth_url" ]; then
    echo "NEXTAUTH_URL=http://localhost:3000" >> "$env_file"
    log_ok "Set NEXTAUTH_URL=http://localhost:3000"
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
  local tmpfile
  tmpfile="$(mktemp)"

  # Run directly (not in $(...)) so stdin is a TTY; drizzle-kit needs this
  # even with --force for schema conflict resolution prompts
  npx drizzle-kit push --force > "$tmpfile" 2>&1 || true

  if grep -qi "error\|failed" "$tmpfile"; then
    # Check if it's just a TTY/interactive prompt error
    if grep -q "Interactive prompts require a TTY terminal" "$tmpfile"; then
      log_warn "Drizzle Kit push requires an interactive terminal."
      log_info "The Go backend will auto-migrate raw SQL migrations on startup."
      log_info "If you need Drizzle schema sync, run 'npm run db:push' manually in a TTY."
      rm -f "$tmpfile"
      return 0
    fi
    log_error "Schema push failed:"
    cat "$tmpfile" | while IFS= read -r line; do echo -e "  ${RED}|${NC} $line"; done
    rm -f "$tmpfile"
    log_info "Check database connection in $WEB_DIR/.env.local"
    exit 1
  fi

  cat "$tmpfile" | while IFS= read -r line; do echo -e "  ${DIM}db>${NC} $line"; done
  rm -f "$tmpfile"
  log_ok "Schema pushed"
}

is_db_seeded() {
  if ! docker info >/dev/null 2>&1; then
    return 1
  fi
  local count
  count="$(docker exec dra_postgres psql -U dra -d dra_platform -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | xargs || true)"
  if [ "$count" != "" ] && [ "$count" -gt 0 ] 2>/dev/null; then
    return 0
  fi
  return 1
}

seed_database() {
  log_info "Database is empty — seeding demo data..."
  cd "$WEB_DIR"
  local output
  output="$(npx tsx db/seed.ts 2>&1)" || true
  if echo "$output" | grep -qi "error"; then
    log_error "Seed failed:"
    echo "$output" | while IFS= read -r line; do echo -e "  ${RED}|${NC} $line"; done
    exit 1
  fi
  echo "$output" | while IFS= read -r line; do echo -e "  ${DIM}seed>${NC} $line"; done
  log_ok "Database seeded"
}

# ============================================================
# Run Services
# ============================================================
run_backend() {
  if command -v go >/dev/null 2>&1; then
    # Always rebuild before starting to pick up code changes
    build_backend_binary

    log_info "Starting Go backend on http://localhost:8080 ..."
    cd "$BACKEND_DIR"

    if [ ! -f "./api" ]; then
      log_error "Backend binary not found after build — check for compilation errors above"
      exit 1
    fi

    local env_file=""
    if [ -f "$WEB_DIR/.env.local" ]; then
      env_file="$WEB_DIR/.env.local"
    fi

    # Find a free metrics port
    local metrics_port=9090
    while ss -tlnp 2>/dev/null | grep -q ":$metrics_port "; do
      metrics_port=$((metrics_port + 1))
    done

    (
      if [ -n "$env_file" ]; then
        set -a
        . "$env_file"
        set +a
      fi
      export ENV=development
      export METRICS_PORT=$metrics_port
      exec ./api
    ) 2>&1 | while IFS= read -r line; do
      echo -e "${MAGENTA}[backend]${NC} $line"
      echo "$line" >> "$LOG_DIR/backend.log"
    done &

    BACKEND_PID=$!
    register_pid "$BACKEND_PID"
    BACKEND_MODE="local"
    log_ok "Backend starting on :8080 (metrics on :$metrics_port)"
    return
  fi

  if [ -n "$DOCKER_COMPOSE" ] && docker info >/dev/null 2>&1; then
    log_info "Go not installed — starting backend via Docker..."
    cd "$ROOT_DIR"
    $DOCKER_COMPOSE up -d --build backend 2>&1 | while IFS= read -r line; do echo -e "  ${DIM}docker>${NC} $line"; done
    $DOCKER_COMPOSE logs -f backend 2>&1 | while IFS= read -r line; do
      echo -e "${MAGENTA}[backend]${NC} $line"
      echo "$line" >> "$LOG_DIR/backend.log"
    done &
    BACKEND_MODE="docker"
    return
  fi

  log_warn "Go not installed and Docker unavailable — backend will NOT start"
}

run_frontend() {
  log_info "Starting Next.js frontend on http://localhost:3000 ..."
  cd "$WEB_DIR"
  npm run dev 2>&1 | while IFS= read -r line; do
    echo -e "${CYAN}[frontend]${NC} $line"
    echo "$line" >> "$LOG_DIR/frontend.log"
  done &
  FRONTEND_PID=$!
  register_pid "$FRONTEND_PID"
}

show_banner() {
  sleep 2
  echo ""
  echo -e "${BOLD}══════════════════════════════════════════════════════════════════${NC}"
  echo -e "${BOLD}  DRA Platform is running${NC}"
  echo -e "${BOLD}  Frontend:${NC} ${CYAN}http://localhost:3000${NC}"
  echo -e "${BOLD}  Backend: ${NC} ${MAGENTA}http://localhost:8080${NC}"
  echo -e "${BOLD}  Logs:     ${NC} ${DIM}$LOG_DIR/${NC}"
  echo -e "${BOLD}══════════════════════════════════════════════════════════════════${NC}"
  echo ""
  log_info "Press Ctrl+C to stop all services."
  log_info "Re-run with --logs to view saved logs."
  echo ""
}

# ============================================================
# Main
# ============================================================
main() {
  local CHECK_MODE=false
  local LOGS_MODE=false

  for arg in "$@"; do
    case "$arg" in
      --check) CHECK_MODE=true ;;
      --logs)  LOGS_MODE=true  ;;
    esac
  done

  echo -e "${BOLD}╔══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BOLD}║         DRA Platform — Full Stack Dev Launcher               ║${NC}"
  echo -e "${BOLD}╚══════════════════════════════════════════════════════════════╝${NC}"

  # ── Logs mode ──
  if [ "$LOGS_MODE" = true ]; then
    show_logs
    exit 0
  fi

  # ── Dependency check (always runs) ──
  check_deps

  # ── Auto-install Go if missing ──
  ensure_go_installed

  # ── Check-only mode ──
  if [ "$CHECK_MODE" = true ]; then
    echo -e "${DIM}Run without --check to start all services.${NC}"
    echo ""
    exit 0
  fi

  echo ""
  echo -e "${BOLD}═══ Installing Dependencies ═══${NC}"
  echo ""
  install_root_deps
  install_web_deps
  install_backend_deps
  build_backend_binary
  echo ""

  # Detect DB_TYPE from env
  local db_type="postgres"
  if [ -f "$WEB_DIR/.env.local" ]; then
    local env_db_type
    env_db_type="$(grep '^DB_TYPE=' "$WEB_DIR/.env.local" | cut -d= -f2- | tr -d '[:space:]' || true)"
    if [ -n "$env_db_type" ]; then
      db_type="$env_db_type"
    fi
    local db_url
    db_url="$(grep '^DATABASE_URL=' "$WEB_DIR/.env.local" | cut -d= -f2- || true)"
    if [ "$db_type" = "postgres" ] && echo "$db_url" | grep -q "neon.tech"; then
      db_type="neon"
    fi
  fi

  echo -e "${BOLD}═══ Database Setup ═══${NC}"
  echo ""
  ensure_env_file
  fix_placeholder_secrets

  if [ "$db_type" = "mongodb" ]; then
    log_info "MongoDB mode detected — skipping local PostgreSQL"
    log_info "Backend will auto-setup MongoDB on startup"
  elif [ "$db_type" = "neon" ]; then
    log_info "Neon DB mode detected — skipping local PostgreSQL"
    push_schema
  else
    start_postgres
    push_schema
  fi
  echo ""

  echo -e "${BOLD}═══ Seeding ═══${NC}"
  echo ""
  if [ "$db_type" = "mongodb" ]; then
    log_info "MongoDB seeding handled by backend auto-seed"
  elif [ "$db_type" = "neon" ]; then
    if is_db_seeded; then
      log_ok "Database already seeded — skipping"
    else
      seed_database
    fi
  else
    if is_db_seeded; then
      log_ok "Database already seeded — skipping"
    else
      seed_database
    fi
  fi
  echo ""

  echo -e "${BOLD}═══ Starting Services ═══${NC}"
  echo ""
  SERVICES_STARTED=1
  run_backend
  run_frontend
  show_banner

  wait
}

main "$@"
