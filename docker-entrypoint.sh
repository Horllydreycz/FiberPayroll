#!/bin/sh
set -e

# Create/update the SQLite schema on the data volume, then start the server.
echo "Syncing database schema…"
prisma db push --schema ./prisma/schema.prisma --skip-generate

echo "Starting FiberPayroll on :${PORT:-3000}"
exec node server.js
