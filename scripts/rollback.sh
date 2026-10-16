#!/usr/bin/env bash
# Rolls an Elastic Beanstalk environment back to a specific, previously
# working version. Called automatically by the Jenkins pipeline's
# post-failure step, but safe to run by hand too:
#
#   ./scripts/rollback.sh <environment-name> <version-label> <aws-region>
#
set -euo pipefail

if [ "$#" -ne 3 ]; then
  echo "Usage: $0 <environment-name> <version-label> <aws-region>"
  exit 1
fi

ENVIRONMENT_NAME="$1"
VERSION_LABEL="$2"
REGION="$3"

echo "Rolling back '${ENVIRONMENT_NAME}' to version '${VERSION_LABEL}' in ${REGION}..."

aws elasticbeanstalk update-environment \
  --environment-name "${ENVIRONMENT_NAME}" \
  --version-label "${VERSION_LABEL}" \
  --region "${REGION}"

echo "Rollback request submitted."
echo "Watch progress with:"
echo "  aws elasticbeanstalk describe-environment-health --environment-name ${ENVIRONMENT_NAME} --attribute-names All --region ${REGION}"
