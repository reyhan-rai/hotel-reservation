#!/usr/bin/env bash
# Polls an Elastic Beanstalk environment's health until it reports
# "Ok"/"Green", or gives up after a timeout. Exits non-zero on timeout
# so the calling Jenkins stage fails and triggers rollback.
#
#   ./scripts/wait-for-healthy.sh <environment-name> <aws-region> [max-attempts]
#
set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <environment-name> <aws-region> [max-attempts]"
  exit 1
fi

ENVIRONMENT_NAME="$1"
REGION="$2"
MAX_ATTEMPTS="${3:-20}"
SLEEP_SECONDS=15

for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
  HEALTH=$(aws elasticbeanstalk describe-environment-health \
    --environment-name "${ENVIRONMENT_NAME}" \
    --attribute-names HealthStatus \
    --region "${REGION}" \
    --query "HealthStatus" \
    --output text)

  echo "Attempt ${attempt}/${MAX_ATTEMPTS}: environment health = ${HEALTH}"

  if [ "$HEALTH" = "Ok" ]; then
    echo "Environment is healthy."
    exit 0
  fi

  sleep "$SLEEP_SECONDS"
done

echo "Environment did not become healthy within the timeout — treating this deploy as failed."
exit 1
