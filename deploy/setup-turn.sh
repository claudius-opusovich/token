#!/usr/bin/env bash
# =============================================================================
# coturn setup for Token (tokenchat.dev)
# Run as root on the VPS: sudo bash deploy/setup-turn.sh
# =============================================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[✓]${NC} $*"; }
warn()  { echo -e "${YELLOW}[!]${NC} $*"; }
error() { echo -e "${RED}[✗]${NC} $*"; exit 1; }

[[ $EUID -ne 0 ]] && error "Run as root: sudo bash deploy/setup-turn.sh"

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_IP="80.96.108.89"
DOMAIN="tokenchat.dev"
SYNAPSE_DATA="${DEPLOY_DIR}/synapse-data"
HOMESERVER_YAML="${SYNAPSE_DATA}/homeserver.yaml"

# =============================================================================
# 1. Generate TURN shared secret
# =============================================================================
TURN_SECRET=$(openssl rand -hex 32)
info "Generated TURN shared secret."

# =============================================================================
# 2. Install coturn
# =============================================================================
info "Installing coturn..."
apt-get update -qq
apt-get install -y -qq coturn
info "coturn installed."

# =============================================================================
# 3. Enable coturn daemon
# =============================================================================
sed -i 's/#TURNSERVER_ENABLED=1/TURNSERVER_ENABLED=1/' /etc/default/coturn 2>/dev/null || \
  echo "TURNSERVER_ENABLED=1" >> /etc/default/coturn
info "coturn daemon enabled."

# =============================================================================
# 4. Write turnserver.conf
# =============================================================================
mkdir -p /var/log/coturn

cat > /etc/turnserver.conf <<EOF
listening-port=3478
tls-listening-port=5349
listening-ip=0.0.0.0
external-ip=${SERVER_IP}

realm=${DOMAIN}
server-name=${DOMAIN}

use-auth-secret
static-auth-secret=${TURN_SECRET}

cert=/etc/letsencrypt/live/${DOMAIN}/fullchain.pem
pkey=/etc/letsencrypt/live/${DOMAIN}/privkey.pem

no-multicast-peers
denied-peer-ip=10.0.0.0-10.255.255.255
denied-peer-ip=172.16.0.0-172.31.255.255
denied-peer-ip=192.168.0.0-192.168.255.255
denied-peer-ip=100.64.0.0-100.127.255.255
denied-peer-ip=169.254.0.0-169.254.255.255
denied-peer-ip=127.0.0.0-127.255.255.255

log-file=/var/log/coturn/turnserver.log
simple-log

min-port=49152
max-port=65535
EOF

info "turnserver.conf written."

# =============================================================================
# 5. Open firewall ports
# =============================================================================
info "Opening firewall ports..."
ufw allow 3478/udp comment "TURN UDP" 2>/dev/null || true
ufw allow 3478/tcp comment "TURN TCP" 2>/dev/null || true
ufw allow 5349/tcp comment "TURNS TLS" 2>/dev/null || true
ufw allow 49152:65535/udp comment "TURN relay media" 2>/dev/null || true
info "Firewall ports opened."

# =============================================================================
# 6. Patch Synapse homeserver.yaml with TURN config
# =============================================================================
info "Patching Synapse homeserver.yaml..."

# Remove old turn config if exists
sed -i '/^turn_uris:/,/^turn_allow_guests:/d' "${HOMESERVER_YAML}" 2>/dev/null || true

cat >> "${HOMESERVER_YAML}" <<EOF

# TURN server for WebRTC calls
turn_uris:
  - "turns:${DOMAIN}:5349?transport=tcp"
  - "turns:${DOMAIN}:5349?transport=udp"
  - "turn:${DOMAIN}:3478?transport=tcp"
  - "turn:${DOMAIN}:3478?transport=udp"
turn_shared_secret: "${TURN_SECRET}"
turn_user_lifetime: 86400000
turn_allow_guests: false
EOF

info "Synapse homeserver.yaml updated."

# =============================================================================
# 7. Start coturn
# =============================================================================
systemctl enable coturn
systemctl restart coturn
sleep 2

if systemctl is-active --quiet coturn; then
  info "coturn is running!"
else
  warn "coturn failed to start. Check: journalctl -u coturn -n 50"
fi

# =============================================================================
# 8. Restart Synapse
# =============================================================================
info "Restarting Synapse..."
cd "${DEPLOY_DIR}"
docker compose restart synapse
sleep 5
info "Synapse restarted."

# =============================================================================
# Done
# =============================================================================
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  coturn setup complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "TURN secret (saved in homeserver.yaml): ${TURN_SECRET}"
echo ""
echo "Test with: https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/"
echo "  TURN URI:  turn:${DOMAIN}:3478"
echo "  Username:  (leave blank — time-based)"
echo "  Password:  (leave blank)"
