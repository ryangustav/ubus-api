import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  unique,
} from 'drizzle-orm/pg-core';
import { roleUsuarioEnum, statusCadastroEnum } from './enums';
import { prefeituras } from './prefeitura.schema';
import { linhas } from './fleet.schema';

export const usuarios = pgTable(
  'usuarios',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    idPrefeitura: uuid('id_prefeitura')
      .notNull()
      .references(() => prefeituras.id, { onDelete: 'cascade' }),
    cpf: varchar('cpf', { length: 14 }).notNull(),
    nome: varchar('nome', { length: 150 }).notNull(),
    email: varchar('email', { length: 150 }).notNull(),
    senhaHash: varchar('senha_hash', { length: 255 }).notNull(),
    telefone: varchar('telefone', { length: 20 }),
    role: roleUsuarioEnum('role').default('ALUNO'),
    nivelPrioridade: integer('nivel_prioridade'), // 1: Titular, 2: Univ. Caronista, 3: Caronista Comum
    idLinhaPadrao: uuid('id_linha_padrao').references(() => linhas.id),
    fotoPerfilUrl: text('foto_perfil_url'),
    gradeHorarioUrl: text('grade_horario_url'),
    statusCadastro: statusCadastroEnum('status_cadastro').default('PENDENTE'),
    bloqueioAssentoAte: timestamp('bloqueio_assento_ate', {
      withTimezone: true,
    }),
    criadoEm: timestamp('criado_em', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique('uq_usuario_cpf_prefeitura').on(table.idPrefeitura, table.cpf),
    unique('uq_usuario_email_prefeitura').on(table.idPrefeitura, table.email),
  ],
);
