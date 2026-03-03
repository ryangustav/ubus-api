import { pgTable, uuid, varchar, timestamp, boolean } from 'drizzle-orm/pg-core';

export const prefeituras = pgTable('prefeituras', {
  id: uuid('id').primaryKey().defaultRandom(),
  nome: varchar('nome', { length: 200 }).notNull(),
  idGestor: uuid('id_gestor'), // 1:1 - um gestor por prefeitura (FK em migration para evitar circular)
  ativo: boolean('ativo').default(true), // super-admin pode pausar cidades
  criadoEm: timestamp('criado_em', { withTimezone: true }).defaultNow(),
});
