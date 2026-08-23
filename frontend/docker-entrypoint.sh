#!/bin/sh
set -e

CERT_DIR="/etc/fptn/certs"
CERT_FILE="$CERT_DIR/fullchain.pem"
KEY_FILE="$CERT_DIR/privkey.pem"

mkdir -p "$CERT_DIR"

if [ ! -f "$CERT_FILE" ] || [ ! -f "$KEY_FILE" ]; then
    echo "No TLS certificate in $CERT_DIR, generating a self-signed one..."
    openssl req -x509 -nodes -newkey rsa:2048 -days 3650 \
        -keyout "$KEY_FILE" -out "$CERT_FILE" \
        -subj "/CN=fptn-admin" \
        -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
fi

exec "$@"
