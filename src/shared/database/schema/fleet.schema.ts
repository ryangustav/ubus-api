import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  unique,
} from 'drizzle-orm/pg-core';
import { prefeituras } from './prefeitura.schema';
import { usuarios } from './user.schema';

export const linhas = pgTable(
  'linhas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    idPrefeitura: uuid('id_prefeitura')
      .notNull()
      .references(() => prefeituras.id, { onDelete: 'cascade' }),
    nome: varchar('nome', { length: 100 }).notNull(),
    descricao: text('descricao'),
    /** Dias da semana: 0=dom, 1=seg, 2=ter, 3=qua, 4=qui, 5=sex, 6=sab */
    diasDaSemana: integer('dias_da_semana').array().notNull().default([]),
    /** Horário que abre votação para marcar lugares (HH:mm) */
    horarioAberturaVotacao: varchar('horario_abertura_votacao', { length: 5 })
      .notNull()
      .default('06:00'),
    /** Horário que finaliza votação para marcar lugares (HH:mm) */
    horarioFechamentoVotacao: varchar('horario_fechamento_votacao', {
      length: 5,
    })
      .notNull()
      .default('07:30'),
    active: boolean('is_ativo').default(true),
    criadoEm: timestamp('criado_em', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique('uq_linha_nome_prefeitura').on(table.idPrefeitura, table.nome),
  ],
);

export const onibus = pgTable(
  'onibus',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    idPrefeitura: uuid('id_prefeitura')
      .notNull()
      .references(() => prefeituras.id, { onDelete: 'cascade' }),
    /** Motorista que cadastrou o ônibus */
    idMotorista: uuid('id_motorista').references(() => usuarios.id, {
      onDelete: 'set null',
    }),
    numeroIdentificacao: varchar('numero_identificacao', {
      length: 20,
    }).notNull(),
    placa: varchar('placa', { length: 10 }).notNull(),
    capacidadePadrao: integer('capacidade_padrao').notNull(),
    temBanheiro: boolean('tem_banheiro').default(false),
    temArCondicionado: boolean('tem_ar_condicionado').default(false),
    /** Active for capacity calculation */
    active: boolean('is_ativo').default(true),
    criadoEm: timestamp('criado_em', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique('uq_onibus_numero_prefeitura').on(
      table.idPrefeitura,
      table.numeroIdentificacao,
    ),
    unique('uq_onibus_placa_prefeitura').on(table.idPrefeitura, table.placa),
  ],
);
