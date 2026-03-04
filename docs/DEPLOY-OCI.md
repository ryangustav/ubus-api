# Deploy na Oracle Cloud via GitHub Actions

## Pré-requisitos

1. **Conta Oracle Cloud** com:
   - Compute Instance (VM) com Docker instalado
   - Postgres e Redis (MySQL HeatWave, ou instâncias separadas)
   - API Key configurada para o usuário OCI

2. **OCI Container Registry (OCIR)** acessível

3. **Repositório no GitHub** com o código

## 1. Configurar API Key na OCI

1. No console OCI: **Identity & Security** → **Users** → seu usuário
2. **API Keys** → **Add API Key**
3. Baixe a chave privada (ou copie o conteúdo)
4. Anote o **Fingerprint** gerado

## 2. Criar Auth Token para OCIR

1. **Identity & Security** → **Users** → seu usuário
2. **Auth Tokens** → **Generate Token**
3. Nome: `github-actions`
4. Copie o token (só aparece uma vez)

## 3. Obter OCIDs e Namespace

- **User OCID**: Profile (canto superior direito) → User Settings
- **Tenancy OCID**: Profile → Tenancy
- **Compartment OCID**: Identity → Compartments
- **Region**: ex. `sa-saopaulo-1`, `us-ashburn-1`
- **Tenancy Namespace**: Object Storage → Buckets → ver "Namespace" no canto inferior

## 4. Configurar GitHub Secrets

No repositório: **Settings** → **Secrets and variables** → **Actions**

| Secret | Descrição |
|--------|-----------|
| `OCI_CLI_USER` | OCID do usuário |
| `OCI_CLI_TENANCY` | OCID do tenancy |
| `OCI_CLI_FINGERPRINT` | Fingerprint da API Key |
| `OCI_CLI_KEY_CONTENT` | Conteúdo da chave privada (incluir `-----BEGIN...-----`) |
| `OCI_CLI_REGION` | Região (ex: `sa-saopaulo-1`) |
| `OCI_REGION` | Mesmo que OCI_CLI_REGION |
| `OCI_AUTH_TOKEN` | Auth Token para OCIR |
| `OCI_COMPARTMENT_OCID` | OCID do compartment |
| `OCI_TENANCY_NAMESPACE` | Namespace do tenancy (Object Storage) |
| `DEPLOY_HOST` | IP ou hostname da VM |
| `DEPLOY_USER` | Usuário SSH (ex: `ubuntu`, `opc`) |
| `DEPLOY_SSH_KEY` | Chave privada SSH para a VM |
| `DEPLOY_PATH` | Caminho absoluto no servidor (ex: `/home/opc/ubus`) |
| `DEPLOY_PORT` | Porta SSH (opcional, default 22) |

## 5. Preparar a VM na OCI

```bash
# Conectar na VM
ssh -i sua-chave.pem opc@<IP_PUBLICO>

# Instalar Docker
sudo yum install -y docker-engine
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker opc

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Criar diretório do projeto
mkdir -p ~/ubus
```

## 6. Configurar .env na VM

Crie `~/ubus/.env` na VM:

```env
IMAGE=gru.ocir.io/tenancy/namespace/ubus-api:latest
DATABASE_URL=postgresql://user:pass@host:5432/ubus
REDIS_URL=redis://host:6379
REDIS_HOST=redis-host
REDIS_PORT=6379
JWT_SECRET=seu-jwt-secret-forte
```

## 7. Postgres e Redis

Use um dos cenários:

- **OCI MySQL HeatWave** (compatível Postgres) ou **Autonomous Database**
- **Compute com Docker**: suba postgres e redis em containers
- **Serviços externos**: Neon, Supabase, Redis Cloud, etc.

## 8. Deploy

O deploy roda automaticamente ao fazer **push na branch `main`**.

Ou manualmente: **Actions** → **Deploy to Oracle Cloud** → **Run workflow**

Para apenas fazer build e push da imagem (sem deploy na VM): **Run workflow** → marque **Apenas build e push**.

## Fluxo do pipeline

1. **build-and-push**: Build da imagem Docker → Push para OCIR
2. **deploy**: SCP do docker-compose.prod.yml → SSH na VM → `docker pull` → `docker compose up -d`
