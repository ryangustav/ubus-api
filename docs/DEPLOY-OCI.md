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
| `DEPLOY_PATH` | Caminho absoluto no servidor (ex: `/home/ubuntu/ubus-api`) |
| `DEPLOY_PORT` | Porta SSH (opcional, default 22) |
| `POSTGRES_PASSWORD` | Senha do Postgres (usada pelo container e pela API) |
| `JWT_SECRET` | Chave secreta para JWT (mín. 32 caracteres) |

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

## 6. Variáveis de ambiente (GitHub Secrets)

O deploy cria o `.env` automaticamente. Postgres e Redis rodam no mesmo compose que a API (rede interna Docker).

- `POSTGRES_PASSWORD`: senha do usuário `ubus` no Postgres (pode conter caracteres especiais)
- `JWT_SECRET`: chave secreta para JWT (mín. 32 caracteres)

## 7. Portas 80 e 443

O Nginx faz proxy reverso para a API:
- **80** (HTTP): `http://seu-ip/` ou `http://seu-dominio/`
- **443** (HTTPS): configure certificados em `nginx/certs/` e ative `nginx/conf.d/ssl.conf`

Para HTTPS com Let's Encrypt:
```bash
# Na VM, com domínio apontando para o IP
sudo certbot certonly --standalone -d seu-dominio.com
# Copie os certs para nginx/certs/ e renomeie ssl.conf.example → ssl.conf
```

## 8. Postgres e Redis

Postgres e Redis estão incluídos no `docker-compose.prod.yml` e rodam na mesma rede que a API. Os dados persistem em volumes Docker (`postgres_data`, `redis_data`).

Na primeira execução, rode as migrations:
```bash
# Dentro do diretório do projeto na VM:
docker compose -f docker-compose.prod.yml run --rm api npm run db:migrate:prod
```

## 9. Deploy

O deploy roda automaticamente ao fazer **push na branch `main`**.

Ou manualmente: **Actions** → **Deploy to Oracle Cloud** → **Run workflow**

Para apenas fazer build e push da imagem (sem deploy na VM): **Run workflow** → marque **Apenas build e push**.

## Fluxo do pipeline

1. **build-and-push**: Build da imagem Docker → Push para OCIR
2. **deploy**: SCP (docker-compose, .env, nginx) → SSH na VM → `docker pull` → `docker compose up -d` (postgres + redis + api + nginx)
