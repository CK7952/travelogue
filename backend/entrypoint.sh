#!/bin/sh
set -e

# Run database migrations
alembic upgrade head

# Start Gunicorn with Uvicorn workers
# Worker count is configurable via GUNICORN_WORKERS env var.
# Default to 1 because Whisper holds a large model in each worker; small VMs (2C2G)
# can OOM with 2+ workers. Bump this to 2 only on >=4GB instances.
exec gunicorn app.main:app \
    -w "${GUNICORN_WORKERS:-1}" \
    -k uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    --access-logfile - \
    --error-logfile - \
    --capture-output \
    --enable-stdio-inheritance
