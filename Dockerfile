# Aurelia Hotel Reservation — container image
#
# The app is a static HTML/CSS/JS site, so we just need something to
# serve it. nginx:alpine keeps the image small (~20MB) and starts in
# well under a second, which matters for rolling deployments — the new
# containers need to pass their health check quickly so Elastic
# Beanstalk can finish the rollout without a visible gap in service.

FROM nginx:1.27-alpine

LABEL maintainer="Aurelia coursework team"
LABEL description="Aurelia hotel room reservation — static front end"

# Replace the default nginx site config with ours (adds /healthz).
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Only copy what the site actually needs — see .dockerignore for the rest.
COPY index.html /usr/share/nginx/html/index.html
COPY css/ /usr/share/nginx/html/css/
COPY js/ /usr/share/nginx/html/js/
COPY images/ /usr/share/nginx/html/images/
COPY videos/ /usr/share/nginx/html/videos/

EXPOSE 80

# Docker-level health check (in addition to the EB/CloudWatch one) so
# `docker ps` and `docker inspect` show container health directly —
# useful when demoing locally before anything touches AWS.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
