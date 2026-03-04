# UBUS Backend

API do sistema de reserva de assentos em ônibus universitários.

## Módulos DDD

| Módulo | Responsabilidade | Entidades |
|--------|------------------|-----------|
| **Usuários (IAM)** | Identidade, autenticação, perfis, prioridade (Titular/Caronista), penalidades | usuarios |
| **Frota** | Ônibus, linhas/rotas | linhas, onibus |
| **Viagens** | Operação diária, Smart Key, votação, líderes (poltronas 1-4) | viagens |
| **Reservas** | Assentos, UNIQUE constraint, Guilhotina, excesso | reservas |

## Super-Admins

Dois usuários com perfil `SUPER_ADMIN`: **ubus_infra** e **ubus_admin**.

**Permissões:**
- Cadastrar novas cidades (prefeituras)
- Cadastrar e gerir gestores
- Pausar/ativar cidades (`ativo: false`)

**Criar super-admins (gera senhas de 16 caracteres):**
```bash
# Se db:migrate falhar (ex: "tipo já existe"), use o bootstrap:
npm run db:bootstrap
npm run db:seed-super-admins
```

**Ou, em banco limpo:**
```bash
npm run db:migrate
npm run db:seed-super-admins
```

As credenciais são salvas em `scripts/super-admin-credentials.txt`. **Guarde em local seguro e apague o arquivo após anotar.**

- **ubus_infra**: `ubus_infra@ubus.local`
- **ubus_admin**: `ubus_admin@ubus.local`

## Enums

- `role_usuario`: SUPER_ADMIN, GESTOR, MOTORISTA, LIDER, ALUNO, CARONISTA
- `status_cadastro`: PENDENTE, APROVADO, REJEITADO
- `direcao_viagem`: IDA, VOLTA
- `status_viagem`: AGENDADA, ABERTA_PARA_RESERVA, EM_ANDAMENTO, FINALIZADA, CANCELADA
- `status_reserva`: CONFIRMADA, PRESENTE, FALTOU, CANCELADA_SISTEMA, EXCESSO

## Schema

- **Smart Key** viagens: `YYYYMMDD-ONIBUS-TURNO` (ex: 20260226-20120-M)
- **UNIQUE** (id_viagem, numero_assento) — evita overbooking; NULL = ônibus de excesso
- **Guilhotina**: `is_carona` identifica quem pode ser cortado quando lotar de titulares

## Stack

- NestJS + TypeScript
- PostgreSQL + Drizzle ORM
- Redis + BullMQ
- JWT + Zod
- Docker Compose

## Swagger

Documentação interativa em **http://localhost:3001/api**

## Deploy Oracle Cloud

Deploy automático via GitHub Actions ao fazer push em `main`. Ver [docs/DEPLOY-OCI.md](docs/DEPLOY-OCI.md) para configuração.

## Desenvolvimento

```bash
docker compose -f docker-compose.dev.yml up -d
npm install --legacy-peer-deps
npm run db:push
npm run start:dev
```

## Endpoints

### Auth
- `POST /auth/register` — idPrefeitura, cpf, nome, email, senha, role?, nivelPrioridade?
- `POST /auth/login` — email, senha

### Prefeitura (super-admin)
- `POST /prefeitura` — cadastrar cidade
- `GET /prefeitura` — listar (super-admin: todas; gestor: só a sua)
- `GET /prefeitura/:id`
- `PATCH /prefeitura/:id` — atualizar nome ou pausar (ativo: false)
- `POST /prefeitura/gestores` — cadastrar gestor
- `DELETE /prefeitura/:id/gestor` — remover gestor

### Fleet
- `GET /fleet/linhas` | `POST /fleet/linhas`
- `GET /fleet/onibus` | `POST /fleet/onibus`

### Trips
- `GET /trips/abertas` — viagens com votação aberta
- `GET /trips/:idViagem`
- `POST /trips` — criar viagem

### Reservations
- `GET /reservations/viagem/:idViagem`
- `GET /reservations/viagem/:idViagem/assentos-ocupados`
- `POST /reservations/reservar` — assento específico
- `POST /reservations/excesso` — ônibus de excesso (numero_assento = NULL)
