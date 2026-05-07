#!/bin/sh
set -e

# Run database migrations
alembic upgrade head

# Start Gunicorn with Uvicorn workers
# Workers = 2 * CPU cores + 1 is a common rule; using 4 as a safe default for small VMs
exec gunicorn app.main:app \
    -w 2 \
    -k uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    --access-logfile - \
    --error-logfile - \
    --capture-output \
    --enable-stdio-inheritance
