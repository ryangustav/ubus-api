import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';
import { statusReservaEnum } from './enums';
import { viagens } from './trip.schema';
import { usuarios } from './user.schema';

export const reservas = pgTable(
  'reservas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    idViagem: varchar('id_viagem', { length: 50 })
      .notNull()
      .references(() => viagens.idViagem, { onDelete: 'cascade' }),
    idUsuario: uuid('id_usuario')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    numeroAssento: integer('numero_assento'), // NULL = ônibus de excesso (múltiplos permitidos)
    isCarona: boolean('is_carona').default(false), // Flag para guilhotina
    status: statusReservaEnum('status').default('CONFIRMADA'),
    criadoEm: timestamp('criado_em', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique('assento_unico_por_viagem').on(table.idViagem, table.numeroAssento),
  ],
);
