#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

command -v docker >/dev/null || { echo 'Docker is required for e2e tests.' >&2; exit 1; }
docker info >/dev/null 2>&1 || { echo 'Start Docker before running e2e tests.' >&2; exit 1; }

project="package-game-e2e-$(date +%s)-$$"
compose=(docker compose -p "$project" -f e2e-db.yml)

cleanup() {
  "${compose[@]}" down --volumes --remove-orphans >/dev/null
}
trap cleanup EXIT

"${compose[@]}" up -d --wait
address="$("${compose[@]}" port test-db 5432)"
port="${address##*:}"
if [[ ! "$port" =~ ^[0-9]+$ ]]; then
  echo "Could not determine the e2e database port: $address" >&2
  exit 1
fi

export DATABASE_URL="postgresql://package_e2e:package_e2e@127.0.0.1:${port}/package_e2e?schema=public"
export NODE_ENV=development
export ENABLE_DEV_LOGIN=true
export E2E_USE_DEV_TOKEN=true
export ADMIN_PASSWORD=e2e-admin
export SERVER_ID=e2e
export RUN_DISCORD=no
export RUN_METRICS=no
export WS_PORT=0

npm exec -- prisma migrate deploy
npm exec -- prisma generate
npm exec -- jest --no-cache --config "${JEST_CONFIG:-./test/jest-e2e.js}" --forceExit --runInBand "$@"
