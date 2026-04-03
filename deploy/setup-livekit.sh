#!/usr/bin/env bash
# =============================================================================
# LiveKit setup for tokenchat.dev
# Run as root: sudo bash deploy/setup-livekit.sh
# =============================================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[✓]${NC} $*"; }
warn()  { echo -e "${YELLOW}[!]${NC} $*"; }
error() { echo -e "${RED}[✗]${NC} $*"; exit 1; }

[[ $EUID -ne 0 ]] && error "Run as root: sudo bash deploy/setup-livekit.sh"

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${DEPLOY_DIR}/.env"

# =============================================================================
# 1. Generate LiveKit API key/secret if not already set
# =============================================================================
if grep -q "LIVEKIT_API_KEY" "${ENV_FILE}" 2>/dev/null; then
  info "LiveKit credentials already in .env, skipping."
else
  LIVEKIT_API_KEY="token_$(openssl rand -hex 8)"
  LIVEKIT_API_SECRET="$(openssl rand -hex 32)"

  echo "" >> "${ENV_FILE}"
  echo "LIVEKIT_API_KEY=${LIVEKIT_API_KEY}" >> "${ENV_FILE}"
  echo "LIVEKIT_API_SECRET=${LIVEKIT_API_SECRET}" >> "${ENV_FILE}"
  info "LiveKit credentials generated and saved to .env"
fi

# Load env
set -a; source "${ENV_FILE}"; set +a

# =============================================================================
# 2. Patch livekit.yaml with API keys
# =============================================================================
mkdir -p "${DEPLOY_DIR}/livekit"
cat > "${DEPLOY_DIR}/livekit/livekit.yaml" <<EOF
port: 7880

keys:
  ${LIVEKIT_API_KEY}: ${LIVEKIT_API_SECRET}

rtc:
  use_external_ip: true
  udp_port: 7882
  tcp_port: 7881

logging:
  level: warn
  json: false
EOF
info "livekit.yaml written with API keys."

# =============================================================================
# 3. Open firewall ports
# =============================================================================
ufw allow 7881/tcp comment "LiveKit RTC TCP" 2>/dev/null || true
ufw allow 7882/udp comment "LiveKit RTC UDP" 2>/dev/null || true
info "Firewall ports 7881/tcp and 7882/udp opened."

# =============================================================================
# 4. SSL cert for livekit.tokenchat.dev
# =============================================================================
if [ ! -d "/etc/letsencrypt/live/livekit.tokenchat.dev" ]; then
  info "Getting SSL cert for livekit.tokenchat.dev..."
  certbot certonly --nginx -d livekit.tokenchat.dev --non-interactive --agree-tos \
    --email "admin@tokenchat.dev" --redirect || \
  certbot certonly --standalone -d livekit.tokenchat.dev --non-interactive --agree-tos \
    --email "admin@tokenchat.dev" --http-01-port 80
  info "SSL cert obtained."
else
  info "SSL cert already exists."
fi

# =============================================================================
# 5. Install nginx config
# =============================================================================
cp "${DEPLOY_DIR}/nginx/livekit.tokenchat.dev.conf" \
   /etc/nginx/sites-available/livekit.tokenchat.dev.conf
ln -sf /etc/nginx/sites-available/livekit.tokenchat.dev.conf \
       /etc/nginx/sites-enabled/livekit.tokenchat.dev.conf

# Update main tokenchat.dev nginx with new .well-known
cp "${DEPLOY_DIR}/nginx/tokenchat.dev.conf" \
   /etc/nginx/sites-available/tokenchat.dev.conf

nginx -t && systemctl reload nginx
info "nginx updated."

# =============================================================================
# 6. Start LiveKit services
# =============================================================================
cd "${DEPLOY_DIR}"
docker compose pull livekit livekit-jwt
docker compose up -d livekit livekit-jwt
sleep 3

info "Checking LiveKit..."
if docker compose ps livekit | grep -q "running\|Up"; then
  info "LiveKit is running!"
else
  warn "LiveKit may have failed. Check: docker compose logs livekit"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  LiveKit setup complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "LiveKit API Key:    ${LIVEKIT_API_KEY}"
echo "LiveKit API Secret: ${LIVEKIT_API_SECRET}"
echo ""
echo "Test call: open tokenchat.dev, DM someone, press 📞"
