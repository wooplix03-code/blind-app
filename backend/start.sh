#!/usr/bin/env bash
set -e

if [ ! -f .env ] && [ -f .env.example ]; then
  cp .env.example .env
fi

if [ -z "$APP_KEY" ]; then
  php artisan key:generate --force || true
fi

mkdir -p database
touch database/database.sqlite

php artisan migrate --force
php artisan storage:link || true

exec php -S 0.0.0.0:${PORT:-10000} -t public
