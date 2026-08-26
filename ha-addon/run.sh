#!/usr/bin/env bash
# Smart Finance - Home Assistant Add-on Startup Script
# Reads configuration from HA options and launches the Node.js app

set -e

# HA Add-on options are stored in /data/options.json
CONFIG_PATH="/data/options.json"

echo "=== Smart Finance Add-on ==="
echo "Iniciando Smart Finance para Home Assistant..."

# Read configuration from HA options
if [ -f "$CONFIG_PATH" ]; then
  export TZ=$(jq -r '.TZ // "America/Mexico_City"' "$CONFIG_PATH")
  export JWT_SECRET=$(jq -r '.JWT_SECRET // ""' "$CONFIG_PATH")
  export ADMIN_EMAIL=$(jq -r '.ADMIN_EMAIL // "admin@smartfinance.local"' "$CONFIG_PATH")
  export ADMIN_PASSWORD=$(jq -r '.ADMIN_PASSWORD // ""' "$CONFIG_PATH")
  echo "Configuración cargada desde opciones de HA"
else
  echo "ADVERTENCIA: No se encontró archivo de opciones, usando valores por defecto"
  export TZ="${TZ:-America/Mexico_City}"
fi

# Validate required configuration
if [ -z "$JWT_SECRET" ]; then
  echo "ERROR: JWT_SECRET es requerido. Configúralo en las opciones del add-on."
  exit 1
fi

if [ -z "$ADMIN_PASSWORD" ]; then
  echo "ERROR: ADMIN_PASSWORD es requerido. Configúralo en las opciones del add-on."
  exit 1
fi

# Set data directory for persistent storage
export DATA_DIR="/data"
export PORT=3000

# Ensure data directories exist
mkdir -p /data/attachments
mkdir -p /data/backups
mkdir -p /data/imports

echo "Zona horaria: $TZ"
echo "Puerto: $PORT"
echo "Directorio de datos: $DATA_DIR"

# Start the Node.js application
echo "Iniciando servidor Smart Finance..."
exec node /app/packages/backend/dist/server.js
