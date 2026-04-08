#!/bin/bash
set -e

# Parse connection details from DATABASE_URL if set
# Format: postgresql://user:password@host:port/dbname
if [ -n "$DATABASE_URL" ]; then
    # Strip scheme
    _url="${DATABASE_URL#postgresql://}"
    _url="${_url#postgres://}"
    # Extract host:port/dbname part (after @)
    _hostpart="${_url##*@}"
    DB_HOST="${_hostpart%%:*}"
    DB_HOST="${DB_HOST%%/*}"
    _portdbname="${_hostpart#*:}"
    DB_PORT="${_portdbname%%/*}"
    # If no port found, default to 5432
    if [ "$DB_PORT" = "$_hostpart" ]; then
        DB_PORT=5432
    fi
    # Extract user (before : or @)
    _userpass="${_url%%@*}"
    DB_USER="${_userpass%%:*}"
    # Decode %40 -> @ in username
    DB_USER=$(echo "$DB_USER" | sed 's/%40/@/g')
else
    DB_HOST=${DATABASE_HOST:-""}
    DB_PORT=${DATABASE_PORT:-5432}
    DB_USER=${DATABASE_USER:-postgres}
fi

echo "Waiting for database at ${DB_HOST}:${DB_PORT}..."

if [ -z "$DB_HOST" ]; then
    echo "WARNING: No database host found. Skipping pg_isready check."
else
    until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" > /dev/null 2>&1; do
        echo "Database at ${DB_HOST} is not ready, waiting..."
        sleep 2
    done
    echo "Database is ready!"
fi

# Run migrations
echo "Running migrations..."
python manage.py migrate --noinput

# Setup superuser
echo "Setting up superuser..."
python manage.py setup_superuser

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Start the application
echo "Starting application..."
exec "$@"
