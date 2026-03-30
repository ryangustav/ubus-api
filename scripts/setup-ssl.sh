#!/bin/bash
# Script para configurar SSL via Certbot no Oracle Cloud (api.ubus.me)

# 1. Instalar Certbot se não presente
if ! command -v certbot &> /dev/null
then
    echo "Instalando Certbot..."
    sudo apt update
    sudo apt install certbot python3-certbot-nginx -y
fi

# 2. Obter certificado (Desafio HTTP-01)
# O domínio deve estar apontado para o IP público 163.176.165.51
echo "Solicitando certificado para api.ubus.me..."
sudo certbot --nginx -d api.ubus.me --non-interactive --agree-tos --email ryan@ubus.me

# 3. Testar Renovação Automática
echo "Testando renovação automática..."
sudo certbot renew --dry-run
