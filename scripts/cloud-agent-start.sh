#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env ]]; then
  cp .env.example .env
fi

# shellcheck disable=SC1091
set -a
source .env
set +a

start_postgres() {
  if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
    echo "PostgreSQL already running"
    return 0
  fi

  if command -v pg_ctlcluster >/dev/null 2>&1; then
    sudo pg_ctlcluster --skip-systemctl-redirect 16 main start || true
  else
    sudo service postgresql start || true
  fi

  for _ in $(seq 1 30); do
    if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
      echo "PostgreSQL is ready"
      return 0
    fi
    sleep 1
  done

  echo "PostgreSQL failed to start" >&2
  return 1
}

start_redis() {
  if redis-cli ping >/dev/null 2>&1; then
    echo "Redis already running"
    return 0
  fi

  if command -v redis-server >/dev/null 2>&1; then
    redis-server --daemonize yes --save "" --appendonly no
  else
    sudo service redis-server start || true
  fi

  for _ in $(seq 1 30); do
    if redis-cli ping >/dev/null 2>&1; then
      echo "Redis is ready"
      return 0
    fi
    sleep 1
  done

  echo "Redis failed to start" >&2
  return 1
}

ensure_database() {
  if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='restaurantos'" | grep -q 1; then
    echo "Database role exists"
  else
    sudo -u postgres psql -v ON_ERROR_STOP=1 <<'SQL'
CREATE USER restaurantos WITH PASSWORD 'restaurantos' CREATEDB;
SQL
  fi

  if sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='restaurantos'" | grep -q 1; then
    echo "Database exists"
  else
    sudo -u postgres createdb -O restaurantos restaurantos
  fi
}

start_postgres
ensure_database
start_redis
