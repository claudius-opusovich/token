#!/usr/bin/env bash
# =============================================================================
# Token + Synapse — One-click deployment script
# Domain: tokenchat.dev | OS: Ubuntu 22.04 / 24.04
# Usage: sudo ./setup.sh
# =============================================================================
set -euo pipefail

# --- Config ------------------------------------------------------------------
DOMAIN="tokenchat.dev"
MATRIX_DOMAIN="matrix.${DOMAIN}"
EMAIL=""           # Set your email for Let's Encrypt: EMAIL="you@example.com"
DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$DEPLOY_DIR")"
SYNAPSE_DATA="${DEPLOY_DIR}/synapse-data"
# -----------------------------------------------------------------------------

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[✓]${NC} $*"; }
warn()  { echo -e "${YELLOW}[!]${NC} $*"; }
error() { echo -e "${RED}[✗]${NC} $*"; exit 1; }

[[ $EUID -ne 0 ]] && error "Run as root: sudo ./setup.sh"

# Ask for email if not set
if [[ -z "$EMAIL" ]]; then
  read -rp "Enter your email for Let's Encrypt SSL: " EMAIL
  [[ -z "$EMAIL" ]] && error "Email is required for SSL certificates"
fi

# =============================================================================
# 1. Install Docker
# =============================================================================
info "Checking Docker..."
if ! command -v docker &>/dev/null; then
  info "Installing Docker..."
  apt-get update -qq
  apt-get install -y -qq ca-certificates curl gnupg lsb-release
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
    gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
  systemctl enable --now docker
  info "Docker installed."
else
  info "Docker already installed: $(docker --version)"
fi

# =============================================================================
# 2. Install Nginx + Certbot
# =============================================================================
info "Installing Nginx and Certbot..."
apt-get update -qq
apt-get install -y -qq nginx certbot python3-certbot-nginx
systemctl enable --now nginx

# =============================================================================
# 3. Generate random Postgres password
# =============================================================================
if [[ ! -f "${DEPLOY_DIR}/.env" ]]; then
  POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 40)
  echo "POSTGRES_PASSWORD=${POSTGRES_PASSWORD}" > "${DEPLOY_DIR}/.env"
  info "Generated PostgreSQL password → ${DEPLOY_DIR}/.env"
else
  source "${DEPLOY_DIR}/.env"
  info "Using existing PostgreSQL password from .env"
fi
source "${DEPLOY_DIR}/.env"

# =============================================================================
# 4. Generate Synapse config (if not already done)
# =============================================================================
mkdir -p "${SYNAPSE_DATA}"

if [[ ! -f "${SYNAPSE_DATA}/homeserver.yaml" ]]; then
  info "Generating Synapse config..."
  docker run --rm \
    -v "${SYNAPSE_DATA}:/data" \
    -e SYNAPSE_SERVER_NAME="${DOMAIN}" \
    -e SYNAPSE_REPORT_STATS=no \
    matrixdotorg/synapse:latest generate
  info "Synapse config generated."
fi

# Patch homeserver.yaml: replace default SQLite with PostgreSQL + our settings
info "Configuring Synapse homeserver.yaml..."
SYNAPSE_CONFIG="${SYNAPSE_DATA}/homeserver.yaml"

# Backup original
cp "${SYNAPSE_CONFIG}" "${SYNAPSE_CONFIG}.bak"

# Replace database section (SQLite → PostgreSQL)
python3 - <<PYEOF
import re

with open("${SYNAPSE_CONFIG}", "r") as f:
    content = f.read()

# Replace database block
db_block = '''database:
  name: psycopg2
  args:
    user: synapse
    password: ${POSTGRES_PASSWORD}
    database: synapse
    host: postgres
    port: 5432
    cp_min: 5
    cp_max: 10
'''
content = re.sub(r'database:.*?(?=\n\w)', db_block + '\n', content, flags=re.DOTALL)

# Enable registration
content = re.sub(r'#?\s*enable_registration:.*', 'enable_registration: true', content)
content = re.sub(r'#?\s*enable_registration_without_verification:.*',
                 'enable_registration_without_verification: true', content)

# Max upload
if 'max_upload_size' not in content:
    content += '\nmax_upload_size: 50M\n'

# Suppress federation warning
if 'suppress_key_server_warning' not in content:
    content += '\nsuppress_key_server_warning: true\n'

# URL previews
if 'url_preview_enabled' not in content:
    content += '\nurl_preview_enabled: true\n'

with open("${SYNAPSE_CONFIG}", "w") as f:
    f.write(content)

print("homeserver.yaml patched successfully")
PYEOF

# =============================================================================
# 5. Obtain SSL certificates
# =============================================================================
info "Obtaining SSL certificates..."

# Temp nginx config to pass ACME challenge before full config
cat > /etc/nginx/sites-available/acme-temp <<'NGINX'
server {
    listen 80;
    server_name tokenchat.dev matrix.tokenchat.dev;
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    location / { return 200 'ok'; }
}
NGINX
mkdir -p /var/www/certbot
ln -sf /etc/nginx/sites-available/acme-temp /etc/nginx/sites-enabled/acme-temp
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

certbot certonly --webroot \
  -w /var/www/certbot \
  -d "${DOMAIN}" \
  --email "${EMAIL}" \
  --agree-tos --non-interactive --keep-until-expiring

certbot certonly --webroot \
  -w /var/www/certbot \
  -d "${MATRIX_DOMAIN}" \
  --email "${EMAIL}" \
  --agree-tos --non-interactive --keep-until-expiring

# =============================================================================
# 6. Install Nginx site configs
# =============================================================================
info "Installing Nginx configs..."

# Download recommended TLS options if not present
if [[ ! -f /etc/letsencrypt/options-ssl-nginx.conf ]]; then
  curl -fsSL https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf \
    -o /etc/letsencrypt/options-ssl-nginx.conf
fi
if [[ ! -f /etc/letsencrypt/ssl-dhparams.pem ]]; then
  curl -fsSL https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem \
    -o /etc/letsencrypt/ssl-dhparams.pem
fi

cp "${DEPLOY_DIR}/nginx/tokenchat.dev.conf"        /etc/nginx/sites-available/
cp "${DEPLOY_DIR}/nginx/matrix.tokenchat.dev.conf"  /etc/nginx/sites-available/

ln -sf /etc/nginx/sites-available/tokenchat.dev.conf       /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/matrix.tokenchat.dev.conf /etc/nginx/sites-enabled/
rm -f  /etc/nginx/sites-enabled/acme-temp

# Open port 8448 for Matrix federation
if command -v ufw &>/dev/null && ufw status | grep -q "Status: active"; then
  ufw allow 8448/tcp
  info "UFW: opened port 8448 for Matrix federation"
fi

nginx -t && systemctl reload nginx
info "Nginx configured."

# =============================================================================
# 7. Build and start Docker Compose stack
# =============================================================================
info "Building Token web app and starting services..."
cd "${DEPLOY_DIR}"

docker compose build --no-cache token
docker compose up -d

info "Waiting for Synapse to be ready..."
for i in $(seq 1 30); do
  if curl -fsSL "http://127.0.0.1:8008/_matrix/client/versions" &>/dev/null; then
    break
  fi
  echo -n "."
  sleep 3
done
echo ""

# =============================================================================
# 8. Create admin user
# =============================================================================
info "Creating admin user..."
read -rp "Choose admin username (e.g. admin): " ADMIN_USER
ADMIN_USER="${ADMIN_USER:-admin}"

read -rsp "Choose admin password: " ADMIN_PASS
echo ""
[[ -z "$ADMIN_PASS" ]] && error "Password cannot be empty"

docker compose exec -T synapse \
  register_new_matrix_user \
  -u "${ADMIN_USER}" \
  -p "${ADMIN_PASS}" \
  -a \
  -c /data/homeserver.yaml \
  http://localhost:8008

info "Admin user @${ADMIN_USER}:${DOMAIN} created."

# =============================================================================
# 9. Auto-renew SSL (cron)
# =============================================================================
if ! crontab -l 2>/dev/null | grep -q certbot; then
  (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && systemctl reload nginx") | crontab -
  info "SSL auto-renewal cron added (daily at 3am)."
fi

# =============================================================================
# Done!
# =============================================================================
echo ""
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}  Token is live!${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo -e "  Web app:     ${GREEN}https://${DOMAIN}${NC}"
echo -e "  Matrix API:  ${GREEN}https://${MATRIX_DOMAIN}${NC}"
echo -e "  Admin user:  ${GREEN}@${ADMIN_USER}:${DOMAIN}${NC}"
echo ""
echo -e "  Verify federation:"
echo -e "  ${YELLOW}curl https://${DOMAIN}/.well-known/matrix/server${NC}"
echo ""
echo -e "  Manage services:"
echo -e "  ${YELLOW}cd ${DEPLOY_DIR} && docker compose ps${NC}"
echo -e "  ${YELLOW}docker compose logs -f synapse${NC}"
echo ""
