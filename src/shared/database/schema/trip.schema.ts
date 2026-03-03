import {
  pgTable,
  varchar,
  date,
  timestamp,
  integer,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { direcaoViagemEnum, statusViagemEnum } from './enums';
import { linhas, onibus } from './fleet.schema';
import { usuarios } from './user.schema';

export const viagens = pgTable('viagens', {
  idViagem: varchar('id_viagem', { length: 50 }).primaryKey(), // Smart Key: YYYYMMDD-ONIBUS-TURNO
  dataViagem: date('data_viagem').notNull(),
  turno: varchar('turno', { length: 10 }).notNull(), // MANHA, TARDE, NOITE
  direcao: direcaoViagemEnum('direcao').notNull(),
  idLinha: uuid('id_linha')
    .notNull()
    .references(() => linhas.id),
  idOnibus: uuid('id_onibus')
    .notNull()
    .references(() => onibus.id),
  idMotorista: uuid('id_motorista').references(() => usuarios.id),
  lideresIds: uuid('lideres_ids').array().default(sql`'{}'`),
  capacidadeReal: integer('capacidade_real').notNull(),
  aberturaVotacao: timestamp('abertura_votacao', { withTimezone: true }).notNull(),
  fechamentoVotacao: timestamp('fechamento_votacao', { withTimezone: true }).notNull(),
  status: statusViagemEnum('status').default('AGENDADA'),
  criadoEm: timestamp('criado_em', { withTimezone: true }).defaultNow(),
});
