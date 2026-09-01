# HomeLedger - Home Assistant Add-on Dockerfile
# Extends the main HomeLedger image for HA Supervisor compatibility

ARG BUILD_FROM=docker.io/irving1flores/homeledger:latest
FROM ${BUILD_FROM}

# Add labels for HA Add-on
LABEL \
  io.hass.name="HomeLedger" \
  io.hass.description="Gestión de finanzas personales auto-hospedada" \
  io.hass.version="0.1.0" \
  io.hass.type="addon" \
  io.hass.arch="amd64|aarch64|armv7"

# Copy startup script
COPY run.sh /run.sh
RUN chmod +x /run.sh

# Data directory for HA persistence
ENV DATA_DIR=/data
ENV PORT=3000

# Use /data for HA-managed persistent storage
VOLUME ["/data"]

# Entry point
CMD ["/run.sh"]
