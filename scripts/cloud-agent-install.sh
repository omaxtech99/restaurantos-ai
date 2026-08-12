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

./scripts/cloud-agent-start.sh

corepack enable
corepack prepare pnpm@10.33.3 --activate
pnpm install --frozen-lockfile=false

pnpm db:generate
pnpm db:push
pnpm db:seed
