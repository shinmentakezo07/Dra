#!/bin/sh
set -e

# Start backend in background
cd /app/backend
./server &
BACKEND_PID=$!

# Start frontend in foreground
cd /app/frontend
exec node apps/web/server.js
