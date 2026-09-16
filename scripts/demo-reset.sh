#!/bin/sh
set -eu
# Destructive, isolated named test project only. Never touches release resources.
[ "${RESET_THE_BOYS_TEST:-}" = "DELETE_TEST_VOLUMES" ] || { echo 'Set RESET_THE_BOYS_TEST=DELETE_TEST_VOLUMES for explicit local test reset'; exit 2; }
docker compose -p the-boys-integration26-test -f compose.yaml down --volumes --remove-orphans
docker compose -p the-boys-integration26-test -f compose.yaml up --build -d
