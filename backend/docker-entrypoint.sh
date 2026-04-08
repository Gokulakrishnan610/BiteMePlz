#!/bin/bash
set -e

# Wait for database to be ready
# We use the variables provided by the environment (Azure/Docker)
# Defaults are set to common values if missing
DB_HOST=${DATABASE_HOST}
DB_PORT=${DATABASE_PORT:-5432}
DB_USER=${DATABASE_USER:-postgres}

echo "Waiting for database at ${DB_HOST}:${DB_PORT}..."

if [ -z "$DB_HOST" ]; then
    echo "WARNING: DATABASE_HOST is not set. Skipping pg_isready check."
else
    while ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" > /dev/null 2>&1; do
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
# Using exec "$@" allows Docker to pass the CMD from the Dockerfile (e.g. supervisord)
echo "Starting application..."
exec "$@"
