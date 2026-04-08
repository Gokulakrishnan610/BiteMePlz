#!/bin/bash
set -e

# Use individual DB vars (preferred) or fall back to parsing DATABASE_URL
if [ -n "$DB_HOST" ]; then
    DB_PORT="${DB_PORT:-5432}"
    DB_USER="${DB_USER:-postgres}"
else
    # Parse from DATABASE_URL if set
    if [ -n "$DATABASE_URL" ]; then
        _url="${DATABASE_URL#postgresql://}"
        _url="${_url#postgres://}"
        _hostpart="${_url##*@}"
        DB_HOST="${_hostpart%%:*}"
        DB_HOST="${DB_HOST%%/*}"
        _portdbname="${_hostpart#*:}"
        DB_PORT="${_portdbname%%/*}"
        [ "$DB_PORT" = "$_hostpart" ] && DB_PORT=5432
        _userpass="${_url%%@*}"
        DB_USER=$(echo "${_userpass%%:*}" | sed 's/%40/@/g')
    fi
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

echo "Running migrations..."
python manage.py migrate --noinput

echo "Setting up superuser..."
python manage.py setup_superuser

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Starting application..."
exec "$@"
